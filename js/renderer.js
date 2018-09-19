
var canvas;
var cv_viewport;
var page_data;

var DEBUG_MODE = true;

var needsRedraw = true;

function renderer_init()
{
    page_data = [];
    canvas = $('<canvas style="width: 100%; height: 100%"></canvas>');
    $('#doc').append(canvas);
    canvas = canvas.get(0);
	// We will start at 0. When we get the screen, we will decide on a viewport.
    canvas.width = 0;
    canvas.height = 0;
    // Start with an empty viewport.
    cv_viewport = {x: 0, y: 0, width: 0, height: 0, x2: 0, y2: 0};
    $(window).resize(resize_canvas);
	// Try to redraw the frame every 60 seconds, or about 16 ms.
	setInterval(redraw_canvas, 16);
}

function ConvertToPagePoint(clientPt)
{
    return {x: clientPt.x * cv_viewport.width / canvas.width + cv_viewport.x,
            y: clientPt.y * cv_viewport.height / canvas.height + cv_viewport.y};
}

function resize_canvas()
{
    let r = $('#doc').get(0).getBoundingClientRect();

	needsRedraw = true;

	if(canvas.width == 0 || canvas.height == 0)
	{
		if(r.width == 0 || r.height == 0)
		{
			return;
		}
		canvas.width = r.width;
		canvas.height = r.height;
		cv_viewport = {x: 0, y: 0, width: r.width, height: r.height, x2: r.width, y2: r.height};
		redraw_canvas();
		return;
	}

	// Compute the amount that each direction needs to scale to match the new size.
	let sf_width = r.width / canvas.width;
	let sf_height = r.height / canvas.height;
	// We want to make sure the viewport is still entirely visible in the canvas.
	// So we want to scale the direction that has the higher scaling amount.
	if(sf_width < sf_height)
	{
		// Find out how much the viewport must change to match the scale factor.
		let adj_h = cv_viewport.height * (sf_height - 1);
		// Move the viewport up.
		cv_viewport.y -= adj_h * 0.5;
		// Make the heights match.
		cv_viewport.height += adj_h;
	}
	else
	{
		// Find out how much the viewport must change to match the scale factor.
		let adj_w = cv_viewport.width * (sf_width - 1);
		// Move the viewport left.
		cv_viewport.x -= adj_w * 0.5;
		// Make the widths match.
		cv_viewport.width += adj_w;
	}
	cv_viewport.x2 = cv_viewport.x + cv_viewport.width;
	cv_viewport.y2 = cv_viewport.y + cv_viewport.height;

	// Set the new canvas size.
    canvas.width = r.width;
    canvas.height = r.height;

	redraw_canvas();
}

// TODO: Draw chunks instead of one big chunk. Reuse already generated chunks.
function redraw_canvas()
{
	if(!needsRedraw)
	{
		return;
	}
	needsRedraw = false;
	let ctx = canvas.getContext('2d');
	let image_data = draw_chunk(cv_viewport);
	if(image_data)
	{
		ctx.putImageData(image_data, 0, 0);
	}
}

// The width of the minimum edge of any chunk.
const chunk_pixel_width = 100;

const TYPE_PATH = 0;

function draw_chunk(port)
{
	let min = Math.min(port.width, port.height);
	// We know the width and height will always be >= 0
	// If either is 0, we have an invalid chunk, so don't bother drawing.
	if(min == 0)
	{
		return null;
	}
	// Create the chunk image data. We also scale the "chunk_pixel_width" so that the minimum side length will
	// always be "chunk_pixel_width" pixels long.
	// var data = new ImageData(chunk_pixel_width * port.width / min, chunk_pixel_width * port.height / min);
	let data = new ImageData(canvas.width, canvas.height);
	// Go through all elements in the page.
	for(let i = 0; i < page_data.length; i++)
	{
		// No need to draw anything if the bounds don't intersect.
		if(!doBoundsIntersect(port, page_data[i].bounds))
		{
			continue;
		}
		// Future proofing. Allowing different types (eg. primitive shapes, text, etc)
		switch(page_data[i].type)
		{
			case TYPE_PATH:
				draw_path(page_data[i], port, data);
				break;
		}
	}
	return data;
}

function set_pixel(image_data, colour, pos)
{
	let ind = (pos.x + pos.y * image_data.width) * 4;
	image_data.data[ind] = Math.round(colour.r * 255);
	image_data.data[ind + 1] = Math.round(colour.g * 255);
	image_data.data[ind + 2] = Math.round(colour.b * 255);
	image_data.data[ind + 3] = Math.round(colour.a * 255);
}

function blend_pixel(image_data, colour, pos)
{
	// If the alpha is 1, we can just set since it will be faster.
	if(colour.a == 1)
	{
		set_pixel(image_data, colour, pos);
		return;
	}
	// Compute the index and the alphas.
	let ind = (pos.x + pos.y * image_data.width) * 4;
	let dst_alpha = image_data.data[ind + 3] / 255;
	let new_alpha = colour.a + dst_alpha * (1 - colour.a);
	// If the new alpha is 0, just turn the pixel transparent-black
	if(new_alpha == 0)
	{
		image_data.data[ind] = 0;
		image_data.data[ind + 1] = 0;
		image_data.data[ind + 2] = 0;
		image_data.data[ind + 3] = 0;
		return;
	}
	// Perform blend calculations.
	image_data.data[ind] = Math.round((colour.r * colour.a + image_data.data[ind] / 255 * dst_alpha * (1 - colour.a)) / new_alpha * 255);
	image_data.data[ind + 1] = Math.round((colour.g * colour.a + image_data.data[ind + 1] / 255 * dst_alpha * (1 - colour.a)) / new_alpha * 255);
	image_data.data[ind + 2] = Math.round((colour.b * colour.a + image_data.data[ind + 2] / 255 * dst_alpha * (1 - colour.a)) / new_alpha * 255);
	image_data.data[ind + 3] = Math.round(new_alpha * 255);
}

function vec_add(a, b)
{
	return {x: a.x + b.x, y: a.y + b.y};
}

// Fills in the region between two lines.
// We assume that both lines are in the form {a: {x, y}, b: {x, y}},
// where a and b are end points of the line and a.y <= b.y
// This is based on (modified significantly) the "standard" algorithm for this webpage:
// http://www.sunshine2k.de/coding/java/TriangleRasterization/TriangleRasterization.html
function fill_between_lines(l1, l2, colour, image_data)
{
	// We only want to fill in the region where both lines are on the same horizontal line.
	let min_y = Math.max(Math.ceil(Math.max(l1.a.y, l2.a.y)), 0);
	let max_y = Math.min(Math.ceil(Math.min(l1.b.y, l2.b.y)), image_data.height);
	let inv_slope_l1 = (l1.b.x - l1.a.x) / (l1.b.y - l1.a.y);
	let inv_slope_l2 = (l2.b.x - l2.a.x) / (l2.b.y - l2.a.y);
	// If the lines are strictly horizontal, just ignore it.
	if(l1.b.y - l1.a.y <= Number.EPSILON || l2.b.y - l2.a.y <= Number.EPSILON)
	{
		return;
	}
	let l1_x = l1.a.x + (min_y - l1.a.y) * inv_slope_l1;
	let l2_x = l2.a.x + (min_y - l2.a.y) * inv_slope_l2;
	for(let y = min_y; y < max_y; y++)
	{
		// We don't want to assume the relative position of lines.
		// Instead we just always start at the left-most line point and end at the right-most.
		let start_x = Math.min(Math.round(l1_x), Math.round(l2_x));
		let end_x = Math.max(Math.round(l1_x), Math.round(l2_x));
		for(let x = Math.max(start_x, 0); x < end_x && x < image_data.width; x++)
		{
			// TODO: Perform some "antialiasing"
			blend_pixel(image_data, colour, {x: x, y: y});
		}
		// Move the points based on their slopes.
		l1_x += inv_slope_l1;
		l2_x += inv_slope_l2;
	}
}

//  This assumes that the quad's points are ordered going clockwise.
function fill_quad(pts, colour, image_data)
{
	// We need all 4 lines to draw the quad.
	// Create each line, then ensure the order of the points is correct.
	let l1 = {a: pts[0], b: pts[1]}; if(l1.b.y < l1.a.y) { tmp = l1.a; l1.a = l1.b; l1.b = tmp; }
	let l2 = {a: pts[0], b: pts[3]}; if(l2.b.y < l2.a.y) { tmp = l2.a; l2.a = l2.b; l2.b = tmp; }
	let l3 = {a: pts[1], b: pts[2]}; if(l3.b.y < l3.a.y) { tmp = l3.a; l3.a = l3.b; l3.b = tmp; }
	let l4 = {a: pts[3], b: pts[2]}; if(l4.b.y < l4.a.y) { tmp = l4.a; l4.a = l4.b; l4.b = tmp; }
	// Fill between the "top-left" lines
	fill_between_lines(l1, l2, colour, image_data);
	// Fill between the "bottom-right" lines
	fill_between_lines(l3, l4, colour, image_data);
	// Fill between the "top-right" lines
	fill_between_lines(l1, l3, colour, image_data);
	// Fill between the "bottom-left" lines
	fill_between_lines(l2, l4, colour, image_data);
	// We also need to fill across the lines, since the lines won't "overlap" in the top and bottom.
	// It's hard to explain... In any case, the solution is to fill between "opposite" lines.
	fill_between_lines(l1, l4, colour, image_data);
	fill_between_lines(l2, l3, colour, image_data);
}

// Converts a point on the page to a point on the canvas.
function page_to_image_point(page_point, viewport, image_data)
{
	let rel = {x: page_point.x - viewport.x, y: page_point.y - viewport.y};
	rel.x *= image_data.width / viewport.width;
	rel.y *= image_data.height / viewport.height;
	return rel;
}

function compute_spokes(pt, tang, r)
{
	let tang_l = Math.sqrt(tang.x * tang.x + tang.y * tang.y);
	// Rotate 90 degrees left and normalize to get a normal.
	let norm = {x: -tang.y / tang_l, y: tang.x / tang_l};
	// Compute these points.
	let pt_l = {x: pt.x + norm.x * r, y: pt.y + norm.y * r};
	let pt_r = {x: pt.x - norm.x * r, y: pt.y - norm.y * r};
	return {l: pt_l, r: pt_r};
}

function compute_bezier(p0, p1, p2, p3, t, omt)
{
	return p0 * omt * omt * omt + 3 * p1 * omt * omt * t + 3 * p2 * omt * t * t + p3 * t * t * t;
}

// Given a one-dimensional bezier curve, get the bounds in that dimension.
// For use with multiple dimensions, simply provide one dimension of the points at a time (x, then y)
// The bounds are expanded by width to ensure that the bezier is completely encompassed.
function bezier_bounds(p0, p1, p2, p3, width)
{
	// This computes the coefficients of the derivative of the bezier curve.
	// We will use this to compute the zeroes to get the maxima.
	let a = -p0 + 3 * p1 - 3 * p2 + p3;
	let b = 2 * p0 - 4 * p1 + 2 * p2;
	let c = p1 - p0;

	// Compute the discriminant.
	let d = b*b - 4*a*c;
	// If there are no maxima or minima, just return the end points.
	if(d < 0 || a == 0)
	{
		return {min: Math.min(p0, p3) - width, max: Math.max(p0, p3) + width};
	}
	// Square root the discriminant so we don't need to recompute it.
	d = Math.sqrt(d);
	// Compute the "time" of the critical points by solving the quadrating equation.
	let crit1 = (-b + d) / (2*a);
	let crit2 = (-b - d) / (2*a);
	// Use the "time" of the critical points to compute the critical points themselves..
	if(crit1 >= 0 && crit1 <= 1)
	{
		crit1 = compute_bezier(p0, p1, p2, p3, crit1, 1 - crit1);
	}
	else
	{
		crit1 = undefined;
	}
	if(crit2 >= 0 && crit2 <= 1)
	{
		crit2 = compute_bezier(p0, p1, p2, p3, crit2, 1 - crit2);
	}
	else
	{
		crit2 = undefined;
	}

	// Start by just using the end points as the bounds.
	let m = Math.min(p0, p3);
	let M = Math.max(p0, p3);
	// If the critical point is valid, ensure it is included in the bounds.
	if(crit1)
	{
		m = Math.min(m, crit1);
		M = Math.max(M, crit1);
	}
	// If the critical point is valid, ensure it is included in the bounds.
	if(crit2)
	{
		m = Math.min(m, crit2);
		M = Math.max(M, crit2);
	}
	// Return the bounds.
	return {min: m - width, max: M + width};
}

function bezier_length_upper(p0, p1, p2, p3)
{
	let len;
	let delta = {x: p1.x - p0.x, y: p1.y - p0.y};
	len = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
	delta = {x: p2.x - p1.x, y: p2.y - p1.y};
	len += Math.sqrt(delta.x * delta.x + delta.y * delta.y);
	delta = {x: p3.x - p2.x, y: p3.y - p2.y};
	len += Math.sqrt(delta.x * delta.x + delta.y * delta.y);
	return len;
}

function sigmoid(x, amp, speed)
{
	return amp / (1 + Math.exp(-10 * speed * x + 2));
}

const PATH_DRAW_SAMPLES_PER_UNIT = .0006;
const PATH_DRAW_MAX_SAMPLES = 10;
const PATH_DRAW_MIN_SAMPLES = 1;

function draw_path(path, port, image_data)
{
	if(path.data.length == 0)
	{
		return;
	}
	if(path.data.length == 1)
	{
		return;
	}
	// We now know we have at least two valid points.

	// For each "middle" point (non-end points), we want to compute their slopes.
	// We compute the first point's slope.
	let slopes = [scale(getDelta(path.data[0], path.data[1]), plotSmoothingRatio)];
	// This is based on a blog post by François Romain
	// Src: https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
	// To be clear, this implementation is significantly streamlined. Only the core ideas are still present.
	for(let i = 1; i < path.data.length - 1; i++)
	{
		slopes.push(scale(getDelta(path.data[i - 1], path.data[i + 1]), plotSmoothingRatio));
	}
	// We also must not forget to compute the last point's slope.
	slopes.push(scale(getDelta(path.data[path.data.length - 2], path.data[path.data.length - 1]), plotSmoothingRatio));

	// Compute the left and right spokes of the first point.
	let last_pt_l;
	let last_pt_r;
	// Keep it scoped.
	{
		let start_tang = {x: 3 * slopes[0].x, y: 3 * slopes[0].y};
		let spokes = compute_spokes(path.data[0], start_tang, path.data[0].r * path.width);
		last_pt_l = spokes.l;
		last_pt_r = spokes.r;
	}
	// Start at the first segment
	for(let i = 1; i < path.data.length; i++)
	{
		// Get the absolute tangents.
		let c1 = {x: slopes[i - 1].x + path.data[i - 1].x, y: slopes[i - 1].y + path.data[i - 1].y};
		let c2 = {x: path.data[i].x - slopes[i].x, y: path.data[i].y - slopes[i].y};
		// Compute the bounds of the bezier curve.
		let h_bounds = bezier_bounds(path.data[i-1].x, c1.x, c2.x, path.data[i].x, path.width);
		let v_bounds = bezier_bounds(path.data[i-1].y, c1.y, c2.y, path.data[i].y, path.width);
		let bounds = {x: h_bounds.min, y: v_bounds.min, x2: h_bounds.max, y2: v_bounds.max,
						width: h_bounds.max - h_bounds.min, height: v_bounds.max - v_bounds.min};
		// If we can't see the bounds of the curve, no need to draw it.
		if(!doBoundsIntersect(port, bounds))
		{
			// We still need to move the last_pt to the end of this segment so that the next step doesn't need to compute it.
			let start_tang = {x: 3 * slopes[i].x, y: 3 * slopes[i].y};
			let spokes = compute_spokes(path.data[i], start_tang, path.data[i].r * path.width);
			last_pt_l = spokes.l;
			last_pt_r = spokes.r;
			continue;
		}

		// We want the number of samples to be dependent on the length of the segment and the screen.
		let p1 = page_to_image_point(path.data[i - 1], port, image_data);
		let p2 = page_to_image_point(path.data[i], port, image_data);
		// This is a rough approximation, we simply use linear distance and hope that makes a nice sample count.
		let b_len = bezier_length_upper(p1, page_to_image_point(c1, port, image_data), page_to_image_point(c2, port, image_data), p2);
		let samples = Math.ceil(sigmoid(b_len, PATH_DRAW_MAX_SAMPLES - PATH_DRAW_MIN_SAMPLES, PATH_DRAW_SAMPLES_PER_UNIT)) + PATH_DRAW_MIN_SAMPLES;
		// We start from 1 since the first point should already be computed
		// We also include j == samples since we want to end on t = 1.
		for(let j = 1; j <= samples; j++)
		{
			// Compute the normalized distance between the two points.
			let t = j / samples;
			let omt = 1 - t;
			// Compute the bezier curve.
			let pt = {x: compute_bezier(path.data[i - 1].x, c1.x, c2.x, path.data[i].x, t, omt),
					y: compute_bezier(path.data[i - 1].y, c1.y, c2.y, path.data[i].y, t, omt)};
			// Compute the tangent of the bezier curve (at least the derivative).
			let tang = {x: 3 * omt * omt * slopes[i - 1].x + 6 * omt * t * (c2.x - c1.x) + 3 * t * t * slopes[i].x,
						y: 3 * omt * omt * slopes[i - 1].y + 6 * omt * t * (c2.y - c1.y) + 3 * t * t * slopes[i].y};

			// Linearly interpolate to find the radius of this point in the line.
			let r_pix = (path.data[i - 1].r * omt + path.data[i].r * t) * path.width;
			let spokes = compute_spokes(pt, tang, r_pix);
			// From here we can use last_pt_l/r and pt_l/r to render a quad.
			fill_quad([page_to_image_point(spokes.l, port, image_data), page_to_image_point(spokes.r, port, image_data),
				page_to_image_point(last_pt_r, port, image_data), page_to_image_point(last_pt_l, port, image_data)], path.colour, image_data);
			// If we're in debug mode, we want to draw the points of each subsegment
			if(DEBUG_MODE)
			{
				fill_quad([page_to_image_point(vec_add(pt, {x: -1, y: -1}), port, image_data), page_to_image_point(vec_add(pt, {x: 1, y: -1}), port, image_data),
					page_to_image_point(vec_add(pt, {x: 1, y: 1}), port, image_data), page_to_image_point(vec_add(pt, {x: -1, y: 1}), port, image_data)], {r:1,g:0,b:0,a:1}, image_data);
			}

			// Move the last point to these points so that the next segment draws correctly.
			last_pt_l = spokes.l;
			last_pt_r = spokes.r;
		}
		// If we are in debug mode, we want to draw the points of each segment and their tangents.
		if(DEBUG_MODE)
		{
			let pt = path.data[i];
			fill_quad([page_to_image_point(vec_add(pt, {x: -1, y: -1}), port, image_data), page_to_image_point(vec_add(pt, {x: 1, y: -1}), port, image_data),
				page_to_image_point(vec_add(pt, {x: 1, y: 1}), port, image_data), page_to_image_point(vec_add(pt, {x: -1, y: 1}), port, image_data)], {r:0,g:1,b:0,a:1}, image_data);
			pt = vec_add(path.data[i - 1], scale(slopes[i - 1], 0.1));
			fill_quad([page_to_image_point(vec_add(pt, {x: -1, y: -1}), port, image_data), page_to_image_point(vec_add(pt, {x: 1, y: -1}), port, image_data),
				page_to_image_point(vec_add(pt, {x: 1, y: 1}), port, image_data), page_to_image_point(vec_add(pt, {x: -1, y: 1}), port, image_data)], {r:0,g:0,b:1,a:1}, image_data);
			pt = vec_add(path.data[i], {x: -slopes[i].x * 0.1, y: -slopes[i].y * 0.1});
			fill_quad([page_to_image_point(vec_add(pt, {x: -1, y: -1}), port, image_data), page_to_image_point(vec_add(pt, {x: 1, y: -1}), port, image_data),
				page_to_image_point(vec_add(pt, {x: 1, y: 1}), port, image_data), page_to_image_point(vec_add(pt, {x: -1, y: 1}), port, image_data)], {r:0,g:1,b:1,a:1}, image_data);
		}
	}

	// TODO: Draw nicer caps to the path.
}

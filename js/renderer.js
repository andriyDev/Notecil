
var canvas;
var cv_viewport;
var page_data;

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
    cv_viewport = {x: 0, y: 0, width: 0, height: 0};
    $(window).resize(resize_canvas);

	page_data.push({type: TYPE_PATH, colour: {r: 0, g: 0, b: 0, a: 1}, width: 10, data: []});
	var min = undefined;
	var max = undefined;
	for(var i = 0; i <= 10; i++)
	{
		page_data[0].data.push({x: (i * 2 / 10 - 1) * 100, y: (Math.cos(i / 10 * 2 * Math.PI)) * 100, r: 1});
		if(i == 0)
		{
			min = page_data[0].data[0];
			max = page_data[0].data[0];
		}
		else
		{
			min = {x: Math.min(page_data[0].data[i].x, min.x), y: Math.min(page_data[0].data[i].y, min.y)};
			max = {x: Math.max(page_data[0].data[i].x, min.x), y: Math.max(page_data[0].data[i].y, min.y)};
		}
	}
	page_data[0].bounds = {x: min.x, y: min.y, x2: max.x, y2: max.y, width: max.x - min.x, height: max.y - min.y};

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
    var r = $('#doc').get(0).getBoundingClientRect();

	needsRedraw = true;

	if(canvas.width == 0 || canvas.height == 0)
	{
		if(r.width == 0 || r.height == 0)
		{
			return;
		}
		canvas.width = r.width;
		canvas.height = r.height;
		cv_viewport = {x: 0, y: 0, width: r.width, height: r.height};
		redraw_canvas();
		return;
	}

	// Compute the amount that each direction needs to scale to match the new size.
	var sf_width = r.width / canvas.width;
	var sf_height = r.height / canvas.height;
	// We want to make sure the viewport is still entirely visible in the canvas.
	// So we want to scale the direction that has the higher scaling amount.
	if(sf_width < sf_height)
	{
		// Find out how much the viewport must change to match the scale factor.
		var adj_h = cv_viewport.height * (sf_height - 1);
		// Move the viewport up.
		cv_viewport.y -= adj_h * 0.5;
		// Make the heights match.
		cv_viewport.height += adj_h;
	}
	else
	{
		// Find out how much the viewport must change to match the scale factor.
		var adj_w = cv_viewport.width * (sf_width - 1);
		// Move the viewport left.
		cv_viewport.x -= adj_w * 0.5;
		// Make the widths match.
		cv_viewport.width += adj_w;
	}

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
	var ctx = canvas.getContext('2d');
	var image_data = draw_chunk(cv_viewport);
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
	var min = Math.min(port.width, port.height);
	// We know the width and height will always be >= 0
	// If either is 0, we have an invalid chunk, so don't bother drawing.
	if(min == 0)
	{
		return null;
	}
	// Create the chunk image data. We also scale the "chunk_pixel_width" so that the minimum side length will
	// always be "chunk_pixel_width" pixels long.
	// var data = new ImageData(chunk_pixel_width * port.width / min, chunk_pixel_width * port.height / min);
	var data = new ImageData(canvas.width, canvas.height);
	// Go through all elements in the page.
	for(var i = 0; i < page_data.length; i++)
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
	var ind = (pos.x + pos.y * image_data.width) * 4;
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
	var ind = (pos.x + pos.y * image_data.width) * 4;
	var dst_alpha = image_data.data[ind + 3] / 255;
	var new_alpha = colour.a + dst_alpha * (1 - colour.a);
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

function draw_circle(pt, radius, colour, port, image_data)
{
	var coords = {x: Math.round((pt.x - port.x) * image_data.width / port.width),
				y: Math.round((pt.y - port.y) * image_data.height / port.height)};
	var r = Math.round(radius * image_data.width / port.width);
	// Loop through a square around coords with radius r to draw a circle.
	for(var y = Math.max(coords.y - r, 0); y < Math.min(coords.y + r, image_data.height); y++)
	{
		for(var x = Math.max(coords.x - r, 0); x < Math.min(coords.x + r, image_data.width); x++)
		{
			var d = Math.sqrt(x * x + y * y);
			if(d - r <= 0)
			{
				// If we are within the circle, blend the colour.
				blend_pixel(image_data, colour, {x: x, y: y});
			}
			else if(d - r < 1)
			{
				// If we are just on the edge of the circle, we want to set the pixel to be smoothed based
				// on the subpixel distance.
				var adjusted_colour = {r: colour.r, g: colour.g, b: colour.b, a: colour.a * (d-r)};
				blend_pixel(image_data, adjusted_colour, {x: x, y: y});
			}
		}
	}
}

// Fills in the region between two lines.
// We assume that both lines are in the form {a: {x, y}, b: {x, y}},
// where a and b are end points of the line and a.y <= b.y
// This is based on (modified significantly) the "standard" algorithm for this webpage:
// http://www.sunshine2k.de/coding/java/TriangleRasterization/TriangleRasterization.html
function fill_between_lines(l1, l2, colour, image_data)
{
	// We only want to fill in the region where both lines are on the same horizontal line.
	var min_y = Math.max(Math.round(Math.max(l1.a.y, l2.a.y)), 0);
	var max_y = Math.min(Math.round(Math.min(l1.b.y, l2.b.y)), image_data.height);
	var inv_slope_l1 = (l1.b.x - l1.a.x) / (l1.b.y - l1.a.y);
	var inv_slope_l2 = (l2.b.x - l2.a.x) / (l2.b.y - l2.a.y);
	var l1_x = l1.a.x + (l1.b.y - l1.a.y == 0 ? 0 : (min_y - l1.a.y) * inv_slope_l1);
	var l2_x = l2.a.x + (l2.b.y - l2.a.y == 0 ? 0 : (min_y - l2.a.y) * inv_slope_l2);
	for(var y = min_y; y < max_y; y++)
	{
		// We don't want to assume the relative position of lines.
		// Instead we just always start at the left-most line point and end at the right-most.
		var start_x = Math.min(Math.round(l1_x), Math.round(l2_x));
		var end_x = Math.max(Math.round(l1_x), Math.round(l2_x));
		for(var x = Math.max(start_x, 0); x < end_x && x < image_data.width; x++)
		{
			// TODO: Perform some "antialiasing"
			blend_pixel(image_data, colour, {x: x, y: y});
		}
		// Move the points based on their slopes.
		l1_x += (l1.b.y - l1.a.y == 0 ? 0 : inv_slope_l1);
		l2_x += (l2.b.y - l2.a.y == 0 ? 0 : inv_slope_l2);
	}
}

//  This assumes that the quad's points are not ordered, so "self-intersecting" quads are ignored.
function fill_quad(pts, colour, image_data)
{
	// Sort points in increasing order.
	pts.sort(function (a, b){ return a.y - b.y });

	// We need all 4 lines to draw the quad.
	// Both lines are "rooted" around the top and bottom points.
	var l1 = {a: pts[0], b: pts[1]};
	var l2 = {a: pts[0], b: pts[2]};
	var l3 = {a: pts[1], b: pts[3]};
	var l4 = {a: pts[2], b: pts[3]};
	// Fill between the top 3 points.
	fill_between_lines(l1, l2, colour, image_data);
	// Fill between the bottom 3 points.
	fill_between_lines(l3, l4, colour, image_data);
	// We also need to fill between the "middle", since the lines won't "overlap" in the top and bottom.
	// It's hard to explain... In any case, the solution is to fill between "opposite" lines.
	fill_between_lines(l1, l4, colour, image_data);
	fill_between_lines(l2, l3, colour, image_data);
}

// Converts a point on the page to a point on the canvas.
function page_to_image_point(page_point, viewport, image_data)
{
	var rel = {x: page_point.x - viewport.x, y: page_point.y - viewport.y};
	rel.x *= image_data.width / viewport.width;
	rel.y *= image_data.height / viewport.height;
	return rel;
}

function compute_spokes(pt, tang, r)
{
	var tang_l = Math.sqrt(tang.x * tang.x + tang.y * tang.y);
	// Rotate 90 degrees left and normalize to get a normal.
	var norm = {x: -tang.y / tang_l, y: tang.x / tang_l};
	// Compute these points.
	var pt_l = {x: pt.x + norm.x * r, y: pt.y + norm.y * r};
	var pt_r = {x: pt.x - norm.x * r, y: pt.y - norm.y * r};
	return {l: pt_l, r: pt_r};
}

const PATH_DRAW_SAMPLES_PER_UNIT = 0.06;

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
	var slopes = [scale(getDelta(path.data[0], path.data[1]), plotSmoothingRatio)];
	// This is based on a blog post by François Romain
	// Src: https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
	// To be clear, this implementation is significantly streamlined. Only the core ideas are still present.
	for(var i = 1; i < path.data.length - 1; i++)
	{
		slopes.push(scale(getDelta(path.data[i - 1], path.data[i + 1]), plotSmoothingRatio));
	}
	// We also must not forget to compute the last point's slope.
	slopes.push(scale(getDelta(path.data[path.data.length - 2], path.data[path.data.length - 1]), plotSmoothingRatio));

	// Compute the left and right spokes of the first point.
	var last_pt_l;
	var last_pt_r;
	// Keep it scoped.
	{
		let start_tang = {x: 3 * slopes[0].x, y: 3 * slopes[0].y};
		let spokes = compute_spokes(path.data[0], start_tang, path.data[0].r * path.width);
		last_pt_l = spokes.l;
		last_pt_r = spokes.r;
	}
	// Start at the first segment
	for(var i = 1; i < path.data.length; i++)
	{
		// Get the absolute tangents.
		var c1 = {x: slopes[i - 1].x + path.data[i - 1].x, y: slopes[i - 1].y + path.data[i - 1].y};
		var c2 = {x: path.data[i].x - slopes[i].x, y: path.data[i].y - slopes[i].y};

		// We want the number of samples to be dependent on the length of the segment and the screen.
		var p1 = page_to_image_point(path.data[i - 1], port, image_data);
		var p2 = page_to_image_point(path.data[i], port, image_data);
		// This is a rough approximation, we simply use linear distance and hope that makes a nice sample count.
		var delta = {x: p2.x - p1.x, y: p2.y - p1.y};
		var samples = Math.ceil(Math.sqrt(delta.x * delta.x + delta.y * delta.y) * PATH_DRAW_SAMPLES_PER_UNIT);
		// We start from 1 since the first point should already be computed
		// We also include j == samples since we want to end on t = 1.
		for(var j = 1; j <= samples; j++)
		{
			// Compute the normalized distance between the two points.
			var t = j / samples;
			var omt = 1 - t;
			// Compute the bezier curve.
			var pt = {x: path.data[i - 1].x * omt * omt * omt + 3 * c1.x * omt * omt * t + 3 * c2.x * omt * t * t + path.data[i].x * t * t * t,
					y: path.data[i - 1].y * omt * omt * omt + 3 * c1.y * omt * omt * t + 3 * c2.y * omt * t * t + path.data[i].y * t * t * t};
			// Compute the tangent of the bezier curve (at least the derivative).
			var tang = {x: 3 * omt * omt * slopes[i - 1].x + 6 * omt * t * (c2.x - c1.x) + 3 * t * t * slopes[i].x,
						y: 3 * omt * omt * slopes[i - 1].y + 6 * omt * t * (c2.y - c1.y) + 3 * t * t * slopes[i].y};

			// Linearly interpolate to find the radius of this point in the line.
			var r_pix = (path.data[i - 1].r * omt + path.data[i].r * t) * path.width;
			var spokes = compute_spokes(pt, tang, r_pix);
			// From here we can use last_pt_l/r and pt_l/r to render a quad.
			fill_quad([page_to_image_point(last_pt_l, port, image_data), page_to_image_point(last_pt_r, port, image_data),
				page_to_image_point(spokes.l, port, image_data), page_to_image_point(spokes.r, port, image_data)], path.colour, image_data);

			// Move the last point to these points so that the next segment draws correctly.
			last_pt_l = spokes.l;
			last_pt_r = spokes.r;
		}
	}

	// TODO: Draw nicer caps to the path.
}

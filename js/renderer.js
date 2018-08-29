
var canvas;
var cv_viewport;
var page_data;

function renderer_init()
{
    page_data = [];
    canvas = $('<canvas style="width: 100%; height: 100%"></canvas>');
    $('#doc').append(canvas);
    canvas = canvas.get(0);
    // We need to start with a width and a height so that when we resize we have something to scale from.
    canvas.width = 100;
    canvas.height = 100;
    // Start us off somewhere.
    cv_viewport = {x: 0, y: 0, width: canvas.width, canvas.height};
    $(window).resize(resize_canvas);
}

function ConvertToPagePoint(clientPt)
{
    return {x: clientPt.x * cv_viewport.width / canvas.width + cv_viewport.x,
            y: clientPt.y * cv_viewport.height / canvas.height + cv_viewport.y};
}

function resize_canvas()
{
    var r = $('#doc').get(0).getBoundingClientRect();

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

function redraw_canvas()
{
	var ctx = canvas.getContext('2d');
	var image_data = draw_chunk(cv_viewport);
	ctx.drawImage(image_data, 0, 0);
}

// The width of the minimum edge of any chunk.
const chunk_pixel_width = 100;

const TYPE_PATH = 0;

function draw_chunk(port)
{
	var ctx = canvas.getContext('2d');
	var min = Math.min(port.width, port.height);
	// Create the chunk image data. We also scale the "chunk_pixel_width" so that the minimum side length will
	// always be "chunk_pixel_width" pixels long.
	var data = ctx.createImageData(chunk_pixel_width * port.width / min, chunk_pixel_width * port.height / min);
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
	image_data.data[ind] = ((colour.r * colour.a + image_data.data[ind] / 255 * dst_alpha * (1 - colour.a)) / new_alpha * 255);
	image_data.data[ind + 1] = Math.round((colour.g * colour.a + image_data.data[ind + 1] / 255 * dst_alpha * (1 - colour.a)) / new_alpha * 255);
	image_data.data[ind + 2] = Math.round(((colour.b * colour.a + image_data.data[ind + 2] / 255 * dst_alpha * (1 - colour.a)) / new_alpha * 255);
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

function draw_path(path, port, image_data)
{
	if(path.data.length == 0)
	{
		return;
	}
	// TODO: Make the cap not overlap the actual path since for transparent paths that can look ugly.
	// Draw the start point so that the cap is visible.
	draw_circle(path.data[0], path.width * path.data[0].p, path.colour, port, image_data);
	if(path.data.length == 1)
	{
		return;
	}
	// We now know we have at least two valid points.

	for(var i = 0; i < path.data.length; i++)
	{
		
	}
}


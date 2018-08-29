
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
				draw_path(port, data);
				break;
		}
	}
	return data;
}

function draw_path(port, image_data)
{
	
}


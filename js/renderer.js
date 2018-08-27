
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
    canvas.width = r.width;
    canvas.height = r.height;
}

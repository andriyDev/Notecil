
// Constants
const distanceForLine = 100;

// State

var doc_display;

var printedPointerNotSupportedMsg = false;

var currDrawPath;
var currPlot;

var lastDrawPoint;
var panStart;
var zooming = false;

function init()
{
	doc_display = SVG('doc');
	doc_display.on("pointerdown", handlePointerDown, window);
	doc_display.on("pointerup", handlePointerUp, window);
	doc_display.on("pointermove", handlePointerMove, window);
	doc_display.viewbox(0,0,1000,1000);
}

document.addEventListener("DOMContentLoaded", init);

// Event handler for when a pointer is down.
function handlePointerDown(ev)
{
	// Based on the pointer type, call the appropriate function.
	switch(ev.pointerType)
	{
		case "mouse":
			onMouseDown(ev);
			break;
		case "pen":
			onPenDown(ev);
			break;
		case "touch":
			onTouchDown(ev);
			break;
		default:
			if(!printedPointerNotSupportedMsg)
			{
				printedPointerNotSupportedMsg = true;
				console.err("Pointer Type \"" + ev.pointerType + "\" is not supported!");
			}
			break;
	}
}

function onMouseDown(ev)
{
	if(ev.button == 0) // LMB: Draw
	{
		var pt = doc_display.point(ev.clientX, ev.clientY);
		lastDrawPoint = {x: ev.clientX, y: ev.clientY};
		currPlot = "M" + pt.x + " " + pt.y;
		currDrawPath = doc_display.path(currPlot).attr({fill: "none", stroke: '#000000', "stroke-width": 5});
	}
	else if(ev.button == 2) // RMB: Pan
	{
		panStart = doc_display.point(ev.clientX, ev.clientY);
	}
}

function onPenDown(ev)
{

}

function onTouchDown(ev)
{

}

// Event handler for when a pointer is up.
function handlePointerUp(ev)
{
	switch(ev.pointerType)
	{
		case "mouse":
			onMouseUp(ev);
			break;
		case "pen":
			onPenUp(ev);
			break;
		case "touch":
			onTouchUp(ev);
			break;
		default:
			if(!printedPointerNotSupportedMsg)
			{
				printedPointerNotSupportedMsg = true;
				console.err("Pointer Type \"" + ev.pointerType + "\" is not supported!");
			}
			break;
	}
}

function onMouseUp(ev)
{
	if(ev.button == 0) // LMB: Draw
	{
		var pt = doc_display.point(ev.clientX, ev.clientY);
		currPlot += "L" + pt.x + " " + pt.y;
		currDrawPath.plot(currPlot);
		lastDrawPoint = undefined;
		currDrawPath = undefined;
		currPlot = undefined;
	}
	else if(ev.button == 2) // RMB: Pan
	{
		var panEnd = doc_display.point(ev.clientX, ev.clientY);
		var deltaPan = {x: panEnd.x - panStart.x, y: panEnd.y - panStart.y};

		var v = doc_display.viewbox();
		v.x -= deltaPan.x;
		v.y -= deltaPan.y;
		doc_display.viewbox(v);

		panStart = undefined;
	}
}
function onPenUp(ev){}
function onTouchUp(ev){}

// Event handler for when a pointer has moved.
function handlePointerMove(ev)
{
	switch(ev.pointerType)
	{
		case "mouse":
			onMouseMove(ev);
			break;
		case "pen":
			onPenMove(ev);
			break;
		case "touch":
			onTouchMove(ev);
			break;
		default:
			if(!printedPointerNotSupportedMsg)
			{
				printedPointerNotSupportedMsg = true;
				console.err("Pointer Type \"" + ev.pointerType + "\" is not supported!");
			}
			break;
	}
}

function onMouseMove(ev)
{
	if(lastDrawPoint) // LMB: Draw
	{
		var pt = doc_display.point(ev.clientX, ev.clientY);
		var delta = {x: pt.x - lastDrawPoint.x, y: pt.y - lastDrawPoint.y};

		// TODO: May want to replace this with DOM coordinates instead.
		// Is the distance from the last point more than the distance to draw a line?
		if(delta.x * delta.x + delta.y * delta.y >= distanceForLine * distanceForLine)
		{
			// If so, add the new line and set the last draw point to this point.
			currPlot += "L" + pt.x + " " + pt.y;
			currDrawPath.plot(currPlot);
			lastDrawPoint = {x: ev.clientX, y: ev.clientY};
		}
	}
	else if(panStart) // RMB: Pan
	{
		var panEnd = doc_display.point(ev.clientX, ev.clientY);
		var deltaPan = {x: panEnd.x - panStart.x, y: panEnd.y - panStart.y};

		var v = doc_display.viewbox();
		v.x -= deltaPan.x;
		v.y -= deltaPan.y;
		doc_display.viewbox(v);
	}
}
function onPenMove(ev){}
function onTouchMove(ev){}


// Constants
const distanceForLine = 0;

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
		lastDrawPoint = doc_display.point(ev.screenX, ev.screenY);
		currPlot = "M"+lastDrawPoint.x + " " + lastDrawPoint.y + "L";
		currDrawPath = doc_display.path(currPlot).attr({fill: null, stroke: 'black', "stroke-width": 5});
	}
	else if(ev.button == 2) // RMB: Pan
	{
		panStart = doc_display.point(ev.screenX, ev.screenY);
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
		lastDrawPoint = doc_display.point(ev.screenX, ev.screenY);
		currPlot += lastDrawPoint.x + " " + lastDrawPoint.y + " ";
		currDrawPath.plot(currPlot);
		lastDrawPoint = undefined;
		currDrawPath = undefined;
		currPlot = undefined;
	}
	else if(ev.button == 2) // RMB: Pan
	{
		var panEnd = doc_display.point(ev.screenX, ev.screenY);
		var deltaPan = {x: panEnd.x - panStart.x, y: panEnd.y - panStart.y};

		// TODO: Apply the pan
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
		console.log("Here");
		var pt = doc_display.point(ev.screenX, ev.screenY);
		var delta = {x: pt.x - lastDrawPoint.x, y: pt.y - lastDrawPoint.y};

		console.log(delta.x * delta.x + delta.y * delta.y);

		// TODO: May want to replace this with DOM coordinates instead.
		// Is the distance from the last point more than the distance to draw a line?
		if(delta.x * delta.x + delta.y * delta.y >= distanceForLine * distanceForLine)
		{
			// If so, add the new line and set the last draw point to this point.
			currPlot += pt.x + " " + pt.y + " ";
			currDrawPath.plot(currPlot);
			lastDrawPoint = pt;
		}
	}
	else if(panStart) // RMB: Pan
	{
		var panEnd = doc_display.point(ev.screenX, ev.screenY);
		var deltaPan = {x: panEnd.x - panStart.x, y: panEnd.y - panStart.y};

		// TODO: Apply the pan
	}
}
function onPenMove(ev){}
function onTouchMove(ev){}


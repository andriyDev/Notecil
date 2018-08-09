
// Constants
const distanceForLine = 3;

// State

var doc_display;

var printedPointerNotSupportedMsg = false;

var currDrawPath;
var currPlot;
var currDrawDist;

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

function startDraw(ev)
{
	// Get the clicked point in SVG coordinates.
	var pt = doc_display.point(ev.clientX, ev.clientY);
	// Keep track of the point clicked. This is to detect how far the user has moved.
	currDrawDist = 0;
	// Start the plot list.
	currPlot = "M" + pt.x + " " + pt.y;
	// Create the path.
	// TODO: Make attr depend on the current "brush" (as in stroke-width and colour)
	currDrawPath = doc_display.path(currPlot).attr({fill: "none", stroke: '#000000', "stroke-width": 5});
}

// Note: Assumes that we started the draw at some point. So make sure at least currDrawDist is valid.
function moveDraw(ev)
{
	// Get the amount the mouse has moved.
	var delta = {x: ev.movementX, y: ev.movementY};

	// TODO: Use Bezier curves instead of lines to draw smooth lines.

	// Add the amount we moved to the current distance we have moved.
	currDrawDist += delta.x * delta.x + delta.y * delta.y;

	// Is the distance from the last point more than the distance to draw a line?
	// This is to decrease file size. No need to add points too often.
	if(currDrawDist >= distanceForLine * distanceForLine)
	{
		// If so, add the new line and set the last draw point to this point.
		// Compute the clicked point in SVG coordinates.
		var pt = doc_display.point(ev.clientX, ev.clientY);
		// Add the point to the plot.
		currPlot += "L" + pt.x + " " + pt.y;
		// Update the path.
		currDrawPath.plot(currPlot);
		currDrawDist = 0;
	}
}

function stopDraw(ev)
{
	// Calculate the clicked point in SVG coordinates.
	var pt = doc_display.point(ev.clientX, ev.clientY);
	// Add the last point to the plot.
	currPlot += "L" + pt.x + " " + pt.y;
	// Update the path.
	currDrawPath.plot(currPlot);
	// Clear everything.
	currDrawDist = undefined;
	currDrawPath = undefined;
	currPlot = undefined;
}

function startPan(ev)
{
	// Just store the start point of the pan so we can later calculate the delta of the pan.
	panStart = doc_display.point(ev.clientX, ev.clientY);
}

function movePan(ev)
{
	// Get the clicked point in SVG coordinates.
	var panEnd = doc_display.point(ev.clientX, ev.clientY);
	// Get how much the pan moved.
	var deltaPan = {x: panEnd.x - panStart.x, y: panEnd.y - panStart.y};

	// Use the delta to adjust the viewbox.
	var v = doc_display.viewbox();
	v.x -= deltaPan.x;
	v.y -= deltaPan.y;
	doc_display.viewbox(v);
}

function stopPan(ev)
{
	movePan(ev);
	// Clear the panning variable.
	panStart = undefined;
}

function onMouseDown(ev)
{
	if(ev.button == 0) // LMB: Draw
	{
		startDraw(ev);
	}
	else if(ev.button == 2) // RMB: Pan
	{
		startPan(ev);
	}
}

function onPenDown(ev)
{
	if(ev.button == 0) // Main: Draw
	{
		startDraw(ev);
	}
	else if(ev.button == 5) // Btn1: Erase
	{
		// TODO: Erase
	}
	else if(ev.button == 2) // Btn2: Select
	{
		// TODO: Select
	}
}

function onTouchDown(ev)
{
	startPan(ev);
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
		stopDraw(ev);
	}
	else if(ev.button == 2) // RMB: Pan
	{
		stopPan(ev);
	}
}

function onPenUp(ev)
{
	if(ev.button == 0) // Main: Draw
	{
		stopDraw(ev);
	}
	else if(ev.button == 5) // Btn1: Erase
	{
		// TODO: Erase
	}
	else if(ev.button == 2) // Btn2: Select
	{
		// TODO: Select
	}
}

function onTouchUp(ev)
{
	stopPan(ev);
}

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
	if(currDrawDist != undefined) // LMB: Draw
	{
		moveDraw(ev);
	}
	else if(panStart) // RMB: Pan
	{
		movePan(ev);
	}
}

function onPenMove(ev)
{
	if(currDrawDist != undefined)
	{
		moveDraw(ev);
	}
	// TODO: Erase and select
}

function onTouchMove(ev)
{
	if(panStart)
	{
		movePan(ev);
	}
}

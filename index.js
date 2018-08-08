
// Constants
const distanceForLine = 0;

// State

var doc_display;

var printedPointerNotSupportedMsg = false;

var currDrawPath;

var lastDrawPoint;
var panStart;
var zooming = false;

function init()
{
	doc_display = $('#doc_display');
	doc_display.bind("pointerdown", {}, handlePointerDown);
	doc_display.bind("pointerup", {}, handlePointerUp);
	doc_display.bind("pointermove", {}, handlePointerMove);
}

// Calculates a DOM point to the corresponding svg point.
function ClickToSVGPoint(point, svg)
{
	var pt = svg.createSVGPoint();

	pt.x = point.x;
	pt.y = point.y;
	return pt.matrixTransform(svg.getScreenCTM().inverse());
}

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
		lastDrawPoint = ClickToSVGPoint({x: ev.clientX, y: ev.clientY}, doc_display[0]);
		currDrawPath = document.createElement("path");
		currDrawPath.setAttribute("d", "M " + lastDrawPoint.x + " " + lastDrawPoint.y);
		currDrawPath.setAttribute("stroke", "black");
		currDrawPath.setAttribute("stroke-width", "1");
		doc_display.append(currDrawPath);

		console.log(lastDrawPoint.x, lastDrawPoint.y);
	}
	else if(ev.button == 2) // RMB: Pan
	{
		panStart = ClickToSVGPoint({x: clientX, y: clientY}, doc_display[0]);
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
		lastDrawPoint = ClickToSVGPoint({x: ev.clientX, y: ev.clientY}, doc_display[0]);
		currDrawPath.setAttribute("d", currDrawPath.getAttribute("d") + " L " + lastDrawPoint.x + " " + lastDrawPoint.y);
		lastDrawPoint = undefined;
		currDrawPath = undefined;
	}
	else if(ev.button == 2) // RMB: Pan
	{
		var panEnd = ClickToSVGPoint({x: ev.clientX, y: ev.clientY}, doc_display[0]);
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
		var pt = ClickToSVGPoint({x: ev.clientX, y: ev.clientY}, doc_display[0]);
		var delta = {x: pt.x - lastDrawPoint.x, y: pt.y - lastDrawPoint.y};

		console.log(delta.x * delta.x + delta.y * delta.y);

		// TODO: May want to replace this with DOM coordinates instead.
		// Is the distance from the last point more than the distance to draw a line?
		if(delta.x * delta.x + delta.y * delta.y >= distanceForLine * distanceForLine)
		{
			// If so, add the new line and set the last draw point to this point.
			currDrawPath.setAttribute("d", currDrawPath.getAttribute("d") + " L " + pt.x + " " + pt.y);
			lastDrawPoint = pt;
		}
	}
	else if(panStart) // RMB: Pan
	{
		var panEnd = ClickToSVGPoint({x: ev.clientX, y: ev.clientY}, doc_display[0]);
		var deltaPan = {x: panEnd.x - panStart.x, y: panEnd.y - panStart.y};

		// TODO: Apply the pan
	}
}
function onPenMove(ev){}
function onTouchMove(ev){}


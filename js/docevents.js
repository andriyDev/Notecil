
var touchState = 0;

var targetTool = undefined;
var currentTool = undefined;

function clearTool()
{
	if(currentTool)
	{
		currentTool.stopUse();
		currentTool = undefined;
	}
}

// Event handler for when a pointer is down.
function handlePointerDown(ev)
{
	// Strange, for some reason the touch events act differently than the associated pointer events.
	// I'm moving the touch events into their own event handlers.
	if(ev.pointerType == "touch")
	{
		return;
	}
	hide_context_menus();
	clearTool();
	currentTool = new ScaleSelectionTool();
	if(currentTool.startUse({x: ev.clientX, y: ev.clientY}))
	{
		return;
	}
	else if((currentTool = new MoveSelectionTool()).startUse({x: ev.clientX, y: ev.clientY}))
	{
		return;
	}
	else
	{
		currentTool = undefined;
	}
	// Based on the pointer type, call the appropriate function.
	switch(ev.pointerType)
	{
		case "mouse":
			onMouseDown(ev);
			break;
		case "pen":
			onPenDown(ev);
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
		// currentTool = new BrushTool(ev.pointer);
		if(!targetTool)
		{
			select_brush(0);
		}
		currentTool = new targetTool(ev.pointer);
	}
	else if(ev.button == 2) // RMB: Pan
	{
		currentTool = new PanTool();
	}

	if(currentTool)
	{
		currentTool.startUse({x: ev.clientX, y: ev.clientY});
	}
}

function onPenDown(ev)
{
	if(ev.button == 0) // Main: Draw
	{
		currentTool = new BrushTool(ev.pointer);
	}
	else if(ev.button == 5) // Btn1: Erase
	{
		// TODO: Erase
	}
	else if(ev.button == 2) // Btn2: Select
	{
		currentTool = new SelectTool();
	}

	if(currentTool)
	{
		currentTool.startUse({x: ev.clientX, y: ev.clientY});
	}
}

// Event handler for when a pointer is up.
function handlePointerUp(ev)
{
	// Strange, for some reason the touch events act differently than the associated pointer events.
	// I'm moving the touch events into their own event handlers.
	if(ev.pointerType == "touch")
	{
		return;
	}
	switch(ev.pointerType)
	{
		case "mouse":
			onMouseUp(ev);
			break;
		case "pen":
			onPenUp(ev);
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
	clearTool();
}

function onPenUp(ev)
{
	clearTool();
}

function chooseMouseCursor(pt)
{
	if(!boundsRect)
	{
		doc_display.attr("cursor", "default");
		return;
	}
	// Get the dom position of the bounds
	var bbox = boundsRect.rbox();
	// Compute the difference between each edge.
	var diff_left = pt.x - bbox.x;
	var diff_top = pt.y - bbox.y;
	var diff_right = pt.x - bbox.x2;
	var diff_bot = pt.y - bbox.y2;
	// If we are within the corner distance for the top-left
	if(Math.abs(diff_left) < ScaleSelectionTool.maxCornerOffset
		&& Math.abs(diff_top) < ScaleSelectionTool.maxCornerOffset)
	{
		doc_display.attr("cursor", "nw-resize");
	}
	// If we are within the corner distance for the top-right
	else if(Math.abs(diff_right) < ScaleSelectionTool.maxCornerOffset
		&& Math.abs(diff_top) < ScaleSelectionTool.maxCornerOffset)
	{
		doc_display.attr("cursor", "ne-resize");
	}
	// If we are within the corner distance for the bot-right
	else if(Math.abs(diff_right) < ScaleSelectionTool.maxCornerOffset
		&& Math.abs(diff_bot) < ScaleSelectionTool.maxCornerOffset)
	{
		doc_display.attr("cursor", "se-resize");
	}
	// If we are within the corner distance for the bot-left
	else if(Math.abs(diff_left) < ScaleSelectionTool.maxCornerOffset
		&& Math.abs(diff_bot) < ScaleSelectionTool.maxCornerOffset)
	{
		doc_display.attr("cursor", "sw-resize");
	}
	// If we are within the edge distance for the top edge
	else if(Math.abs(diff_top) < ScaleSelectionTool.maxNormalOffset
		&& diff_left > 0 && diff_right < 0)
	{
		doc_display.attr("cursor", "n-resize");
	}
	// If we are within the edge distance for the right edge
	else if(Math.abs(diff_right) < ScaleSelectionTool.maxNormalOffset
		&& diff_top > 0 && diff_bot < 0)
	{
		doc_display.attr("cursor", "e-resize");
	}
	// If we are within the edge distance for the bottom edge
	else if(Math.abs(diff_bot) < ScaleSelectionTool.maxNormalOffset
		&& diff_left > 0 && diff_right < 0)
	{
		doc_display.attr("cursor", "s-resize");
	}
	// If we are within the edge distance for the left edge
	else if(Math.abs(diff_left) < ScaleSelectionTool.maxNormalOffset
		&& diff_top > 0 && diff_bot < 0)
	{
		doc_display.attr("cursor", "e-resize");
	}
	// If we are within the selection box.
	else if(diff_left >= 0 && diff_left >= 0 && diff_bot < 0 && diff_right < 0)
	{
		doc_display.attr("cursor", "move");
	}
	// If we didn't hit the selection box.
	else
	{
		doc_display.attr("cursor", "default");
	}
}

// Event handler for when a pointer has moved.
function handlePointerMove(ev)
{
	// Strange, for some reason the touch events act differently than the associated pointer events.
	// I'm moving the touch events into their own event handlers.
	if(ev.pointerType == "touch")
	{
		return;
	}
	if(!currentTool)
	{
		chooseMouseCursor({x: ev.clientX, y: ev.clientY});
	}
	switch(ev.pointerType)
	{
		case "mouse":
			onMouseMove(ev);
			break;
		case "pen":
			onPenMove(ev);
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
	if(currentTool)
	{
		currentTool.moveUse({x: ev.clientX, y: ev.clientY});
	}
}

function onPenMove(ev)
{
	if(currentTool)
	{
		currentTool.moveUse({x: ev.clientX, y: ev.clientY});
	}
}

// Event handler for when a pointer has exited
function handlePointerExit(ev)
{
	switch(ev.pointerType)
	{
		case "mouse":
			onMouseExit(ev);
			break;
		case "pen":
			onPenExit(ev);
			break;
		case "touch":
			// There is no exit event for touch, so we can ignore it.
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

function onMouseExit(ev)
{
	clearTool();
}

function onPenExit(ev)
{
	clearTool();
}

function onTouchDown(ev)
{
	hide_context_menus();
	// Make sure we weren't using a tool (like panning).
	clearTool();
    // We need to figure out what kind of gesture is being done.
    if(ev.targetTouches.length == 1)
    {
        touchState = 1;
        // If there is only one touch on the screen, that means we need to start panning/manipulating the selection.
		currentTool = new ScaleSelectionTool();
		if(currentTool.startUse({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY}))
		{
			return;
		}
		else if((currentTool = new MoveSelectionTool()).startUse({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY}))
		{
			return;
		}
		else
		{
			currentTool = undefined;
		}

		currentTool = new PanTool();
		currentTool.startUse({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY});
    }
    else if(ev.targetTouches.length == 2)
    {
        touchState = 2;
		// If there are 2 touches, we need to start pinching.
        startPinch({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY}
                , {x: ev.targetTouches.item(1).clientX, y: ev.targetTouches.item(1).clientY});
    }
    else
    {
		// Make sure we weren't pinching
        if(touchState == 2)
        {
            stopPinch();
        }
        touchState = 3;
    }
}

function onTouchMove(ev)
{
    if(touchState == 1)
    {
		if(currentTool)
		{
        	currentTool.moveUse({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY});
		}
    }
    else if (touchState == 2)
    {
        movePinch({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY}
                , {x: ev.targetTouches.item(1).clientX, y: ev.targetTouches.item(1).clientY});
    }
}

function onTouchUp(ev)
{
	// If we were panning, stop.
	clearTool();
    // We need to figure out what kind of gesture is being done.
    if(ev.targetTouches.length == 0)
    {
        if(touchState == 2)
        {
            stopPinch();
        }
        touchState = 0;
    }
    else if(ev.targetTouches.length == 1)
    {
        if(touchState == 2)
        {
            stopPinch();
        }
        touchState = 1;
		currentTool = new PanTool();
		currentTool.startUse({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY});
    }
    else if(ev.targetTouches.length == 2)
    {
        touchState = 2;
        startPinch({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY}
                , {x: ev.targetTouches.item(1).clientX, y: ev.targetTouches.item(1).clientY});
    }
}

// Factor to multiply zoom amount by.
const zoomSpeed = 0.0035;

function zoom(ev)
{
	// Get viewbox properties.
	var v = doc_display.viewbox();
    var vc = {x: v.x + v.width * 0.5, y: v.y + v.height * 0.5};
    var ve = {x: v.width * 0.5, y: v.height * 0.5};

	// Zoom! We use pow so that negative numbers undo the positive versions.
    ve.x *= Math.pow(2, zoomSpeed * ev.deltaY);
    ve.y *= Math.pow(2, zoomSpeed * ev.deltaY);

	// Recompute viewbox
    v.x = vc.x - ve.x;
    v.y = vc.y - ve.y;
    v.width = ve.x * 2;
    v.height = ve.y * 2;

	// Apply viewbox.
    doc_display.viewbox(v);
}

function docevents_init()
{
	// Create the svg view.
	doc_display = SVG('doc');
	// Add the pointer event listeners.
	doc_display.on("pointerdown", handlePointerDown, window);
	doc_display.on("pointerup", handlePointerUp, window);
	doc_display.on("pointermove", handlePointerMove, window);
	doc_display.on("pointerleave", handlePointerExit, window);

	// For some reason, the touch events don't work properly as pointer events.
	// So instead, we will assign direct event handlers.
	doc_display.on("touchstart", onTouchDown, window);
	doc_display.on("touchend", onTouchUp, window);
	doc_display.on("touchmove", onTouchMove, window);

	doc_display.on("wheel", zoom, window);

	// Assign an arbitrary viewbox.
	doc_display.viewbox(0,0,1000,1000);
}

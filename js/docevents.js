
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
	if(currentTool.startUse({x: ev.offsetX, y: ev.offsetY}))
	{
		return;
	}
	else if((currentTool = new MoveSelectionTool()).startUse({x: ev.offsetX, y: ev.offsetY}))
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
		currentTool.startUse({x: ev.offsetX, y: ev.offsetY}, ev);
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
		currentTool = new EraseTool(ev.pointer);
	}
	else if(ev.button == 2) // Btn2: Select
	{
		currentTool = new SelectTool(ev.pointer);
	}

	if(currentTool)
	{
		currentTool.startUse({x: ev.offsetX, y: ev.offsetY}, ev);
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
		$(canvas).attr("cursor", "default");
		return;
	}
	// Get the dom position of the bounds
	let bbox = boundsRect.rbox();
	// Compute the difference between each edge.
	let diff_left = pt.x - bbox.x;
	let diff_top = pt.y - bbox.y;
	let diff_right = pt.x - bbox.x2;
	let diff_bot = pt.y - bbox.y2;
	// If we are within the corner distance for the top-left
	if(Math.abs(diff_left) < ScaleSelectionTool.maxCornerOffset
		&& Math.abs(diff_top) < ScaleSelectionTool.maxCornerOffset)
	{
		$(canvas).attr("cursor", "nw-resize");
	}
	// If we are within the corner distance for the top-right
	else if(Math.abs(diff_right) < ScaleSelectionTool.maxCornerOffset
		&& Math.abs(diff_top) < ScaleSelectionTool.maxCornerOffset)
	{
		$(canvas).attr("cursor", "ne-resize");
	}
	// If we are within the corner distance for the bot-right
	else if(Math.abs(diff_right) < ScaleSelectionTool.maxCornerOffset
		&& Math.abs(diff_bot) < ScaleSelectionTool.maxCornerOffset)
	{
		$(canvas).attr("cursor", "se-resize");
	}
	// If we are within the corner distance for the bot-left
	else if(Math.abs(diff_left) < ScaleSelectionTool.maxCornerOffset
		&& Math.abs(diff_bot) < ScaleSelectionTool.maxCornerOffset)
	{
		$(canvas).attr("cursor", "sw-resize");
	}
	// If we are within the edge distance for the top edge
	else if(Math.abs(diff_top) < ScaleSelectionTool.maxNormalOffset
		&& diff_left > 0 && diff_right < 0)
	{
		$(canvas).attr("cursor", "n-resize");
	}
	// If we are within the edge distance for the right edge
	else if(Math.abs(diff_right) < ScaleSelectionTool.maxNormalOffset
		&& diff_top > 0 && diff_bot < 0)
	{
		$(canvas).attr("cursor", "e-resize");
	}
	// If we are within the edge distance for the bottom edge
	else if(Math.abs(diff_bot) < ScaleSelectionTool.maxNormalOffset
		&& diff_left > 0 && diff_right < 0)
	{
		$(canvas).attr("cursor", "s-resize");
	}
	// If we are within the edge distance for the left edge
	else if(Math.abs(diff_left) < ScaleSelectionTool.maxNormalOffset
		&& diff_top > 0 && diff_bot < 0)
	{
		$(canvas).attr("cursor", "e-resize");
	}
	// If we are within the selection box.
	else if(diff_left >= 0 && diff_left >= 0 && diff_bot < 0 && diff_right < 0)
	{
		$(canvas).attr("cursor", "move");
	}
	// If we didn't hit the selection box.
	else
	{
		$(canvas).attr("cursor", "default");
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
		chooseMouseCursor({x: ev.offsetX, y: ev.offsetY});
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
		currentTool.moveUse({x: ev.offsetX, y: ev.offsetY}, ev);
	}
}

function onPenMove(ev)
{
	if(currentTool)
	{
		currentTool.moveUse({x: ev.offsetX, y: ev.offsetY}, ev);
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

function getTouchPt(ev)
{
	return {x: ev.clientX - ev.target.offsetLeft, y: ev.clientY - ev.target.offsetTop};
}

function onTouchDown(ev)
{
	hide_context_menus();
	// Make sure we weren't using a tool (like panning).
	clearTool();
    // We need to figure out what kind of gesture is being done.
    if(ev.targetTouches.length == 1)
    {
		let p1 = getTouchPt(ev.targetTouches.item(0));
        touchState = 1;
        // If there is only one touch on the screen, that means we need to start panning/manipulating the selection.
		currentTool = new ScaleSelectionTool();
		if(currentTool.startUse(p1))
		{
			return;
		}
		else if((currentTool = new MoveSelectionTool()).startUse(p1))
		{
			return;
		}
		else
		{
			currentTool = undefined;
		}

		currentTool = new PanTool();
		currentTool.startUse(p1, ev.targetTouches.item(0));
    }
    else if(ev.targetTouches.length == 2)
    {
		let p1 = getTouchPt(ev.targetTouches.item(0));
		let p2 = getTouchPt(ev.targetTouches.item(1));
        touchState = 2;
		// If there are 2 touches, we need to start pinching.
        startPinch(p1, p2);
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
		let p1 = getTouchPt(ev.targetTouches.item(0));
		if(currentTool)
		{
        	currentTool.moveUse(p1, ev.targetTouches.item(0));
		}
    }
    else if (touchState == 2)
    {
		let p1 = getTouchPt(ev.targetTouches.item(0));
		let p2 = getTouchPt(ev.targetTouches.item(1));
        movePinch(p1, p2);
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
		let p1 = getTouchPt(ev.targetTouches.item(0));
        if(touchState == 2)
        {
            stopPinch();
        }
        touchState = 1;
		currentTool = new PanTool();
		currentTool.startUse(p1, ev.targetTouches.item(0));
    }
    else if(ev.targetTouches.length == 2)
    {
		let p1 = getTouchPt(ev.targetTouches.item(0));
		let p2 = getTouchPt(ev.targetTouches.item(1));
        touchState = 2;
        startPinch(p1, p2);
    }
}

// Factor to multiply zoom amount by.
const zoomSpeed = 0.0035;

function zoom(ev)
{
	// Get viewbox properties.
	let v = cv_viewport;
	let vc = ConvertToPagePoint({x: ev.offsetX, y: ev.offsetY});
    let ve = {l: v.x - vc.x, u: v.y - vc.y, r: v.x2 - vc.x, d: v.y2 - vc.y};

	// Zoom! We use pow so that negative numbers undo the positive versions.
	let zoomFactor = Math.pow(2, zoomSpeed * ev.deltaY);
    ve.l *= zoomFactor;
	ve.u *= zoomFactor;
	ve.r *= zoomFactor;
	ve.d *= zoomFactor;

	// Recompute viewbox
    v.x = vc.x + ve.l;
    v.y = vc.y + ve.u;
	v.x2 = vc.x + ve.r;
	v.y2 = vc.y + ve.d;
	v.width = v.x2 - v.x;
	v.height = v.y2 - v.y;

	needsRedraw = true;
}

function docevents_init()
{
	// Add the pointer event listeners.
	canvas.addEventListener("pointerdown", handlePointerDown, window);
	canvas.addEventListener("pointerup", handlePointerUp, window);
	canvas.addEventListener("pointermove", handlePointerMove, window);
	canvas.addEventListener("pointerleave", handlePointerExit, window);

	// For some reason, the touch events don't work properly as pointer events.
	// So instead, we will assign direct event handlers.
	canvas.addEventListener("touchstart", onTouchDown, window);
	canvas.addEventListener("touchend", onTouchUp, window);
	canvas.addEventListener("touchmove", onTouchMove, window);

	canvas.addEventListener("wheel", zoom, window);
}

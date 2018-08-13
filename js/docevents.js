
var touchState = 0;

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
			// Strange, for some reason the touch events act differently than the associated pointer events.
			// I'm moving the touch events into their own event handlers.
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
		startDraw({x: ev.clientX, y: ev.clientY});
	}
	else if(ev.button == 2) // RMB: Pan
	{
		startPan({x: ev.clientX, y: ev.clientY});
	}
}

function onPenDown(ev)
{
	if(ev.button == 0) // Main: Draw
	{
		startDraw({x: ev.clientX, y: ev.clientY});
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
			// Strange, for some reason the touch events act differently than the associated pointer events.
			// I'm moving the touch events into their own event handlers.
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
		stopDraw({x: ev.clientX, y: ev.clientY});
	}
	else if(ev.button == 2) // RMB: Pan
	{
		stopPan({x: ev.clientX, y: ev.clientY});
	}
}

function onPenUp(ev)
{
	if(ev.button == 0) // Main: Draw
	{
		stopDraw({x: ev.clientX, y: ev.clientY});
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
			// Strange, for some reason the touch events act differently than the associated pointer events.
			// I'm moving the touch events into their own event handlers.
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
		moveDraw({x: ev.clientX, y: ev.clientY}, ev.pointerType);
	}
	else if(panStart) // RMB: Pan
	{
		movePan({x: ev.clientX, y: ev.clientY});
	}
}

function onPenMove(ev)
{
	if(currDrawDist != undefined)
	{
		moveDraw({x: ev.clientX, y: ev.clientY});
	}
	// TODO: Erase and select
}

function onTouchDown(ev)
{
    // We need to figure out what kind of gesture is being done.
    if(ev.targetTouches.length == 1)
    {
        touchState = 1;
        // If there is only one touch on the screen, that means we need to start panning.
        startPan({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY});
    }
    else if(ev.targetTouches.length == 2)
    {
        if(touchState == 1)
        {
            stopPan();
        }
        touchState = 2;
        startPinch({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY}
                , {x: ev.targetTouches.item(1).clientX, y: ev.targetTouches.item(1).clientY});
    }
    else
    {
        if(touchState == 1)
        {
            stopPan();
        }
        else if(touchState == 2)
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
        movePan({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY});
    }
    else if (touchState == 2)
    {
        movePinch({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY}
                , {x: ev.targetTouches.item(1).clientX, y: ev.targetTouches.item(1).clientY});
    }
}

function onTouchUp(ev)
{
    // We need to figure out what kind of gesture is being done.
    if(ev.targetTouches.length == 0)
    {
        if(touchState == 2)
        {
            stopPinch();
        }
        else if(touchState == 1)
        {
            stopPan();
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
        startPan({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY});
    }
    else if(ev.targetTouches.length == 2)
    {
        touchState = 2;
        startPinch({x: ev.targetTouches.item(0).clientX, y: ev.targetTouches.item(0).clientY}
                , {x: ev.targetTouches.item(1).clientX, y: ev.targetTouches.item(1).clientY});
    }
}

function docevents_init()
{
	// Create the svg view.
	doc_display = SVG('doc');
	// Add the pointer event listeners.
	doc_display.on("pointerdown", handlePointerDown, window);
	doc_display.on("pointerup", handlePointerUp, window);
	doc_display.on("pointermove", handlePointerMove, window);

	// For some reason, the touch events don't work properly as pointer events.
	// So instead, we will assign direct event handlers.
	doc_display.on("touchstart", onTouchDown, window);
	doc_display.on("touchend", onTouchUp, window);
	doc_display.on("touchmove", onTouchMove, window);

	// TODO: Stop using tools if mouse leaves doc window. Otherwise it has strange effects.

	// Assign an arbitrary viewbox.
	doc_display.viewbox(0,0,1000,1000);
}

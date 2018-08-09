
// === State ===

var doc_display;

var printedPointerNotSupportedMsg = false;

var zooming = false;

function init()
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

	// Assign an arbitrary viewbox.
	doc_display.viewbox(0,0,1000,1000);
}

document.addEventListener("DOMContentLoaded", init);

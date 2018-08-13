
// === Constants ===

// How much does the cursor have to move before generating another line.
const distanceForLine = 3;
// The maximum distance that the mouse can move before the input is ignored. This is for when the pen decides to fly off the rails.
const maxMoveDistance = 20;
// How much should the path be smoothed. This means how much is the path allowed to deviate from the drawn points.
const plotSmoothingRatio = 0.1;

// === State ===

var currDrawPath;
var currPlot;
var currDrawDist;

var panStart;

var lastMousePos;

var initialPinchPoints;
var initialPinchBox;

// Given a path that was generated from this code, we can extract the points used to create it.
// Use this function to do so.
function extractPlotFromPath(path)
{
	// Get the array.
	var arr = path.array().value;
	var re = [];
	for(var i = 0; i < arr.length; i++)
	{
		// We have to make sure that this was a path generated from our code.
		// So it must begin with an M, and then all remaining commands must be C.
		if(i == 0)
		{
			if(arr[0][0] != "M")
			{
				throw "Invalid path!";
			}
		}
		else
		{
			if(arr[i][0] != "C")
			{
				throw "Invalid path!";
			}
		}
		// In both cases, the last two arguments are the x and y of the point.
		re.push({x: arr[i][arr[i].length - 2], y: arr[i][arr[i].length - 1]});
	}
	// Return the list of all points extracted.
	return re;
}

// Compute the delta between the two points.
function getDelta(start, end)
{
	return {x: end.x - start.x, y: end.y - start.y};
}

function scale(v, s)
{
	return {x: v.x * s, y: v.y * s};
}

function getVecLen(v)
{
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

function GetPlotStr(plot)
{
	// If we don't have any points to operate on, just return a blank string.
	if(!plot || plot.length == 0)
	{
		return "";
	}
	// We know we have at least 1 point to operate on, so we can start the string.
	var str = "M" + plot[0].x + " " + plot[0].y;
	// If there's no more points, then just return.
	if(plot.length == 1)
	{
		return str;
	}
	// We know we have at least 2 points to operate on.

	// For each "middle" point (non-end points), we want to compute their slopes.
	// We compute the first point's slope.
	var slopes = [scale(getDelta(plot[0], plot[1]), plotSmoothingRatio)];
	// This is based on a blog post by François Romain
	// Src: https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
	// To be clear, this implementation is significantly streamlined. Only the core ideas are still present.
	for(var i = 1; i < plot.length - 1; i++)
	{
		slopes.push(scale(getDelta(plot[i - 1], plot[i + 1]), plotSmoothingRatio));
	}
	// We also must not forget to compute the last point's slope.
	slopes.push(scale(getDelta(plot[plot.length - 2], plot[plot.length - 1]), plotSmoothingRatio));
	// Now that we have the slopes, we can use those to generate our bezier command.
	for(var i = 1; i < plot.length; i++)
	{
		// Get the absolute tangents.
		var c1 = {x: slopes[i - 1].x + plot[i - 1].x, y: slopes[i - 1].y + plot[i - 1].y};
		var c2 = {x: plot[i].x - slopes[i].x, y: plot[i].y - slopes[i].y};
		// Make the command.
		str += "C" + c1.x + " " + c1.y + " " + c2.x + " " + c2.y + " " + plot[i].x + " " + plot[i].y;
	}
	// Once all commands are appended, return the entire string.
	return str;
}

function startDraw(pt)
{
    lastMousePos = pt;
	// Get the clicked point in SVG coordinates.
	pt = doc_display.point(pt.x, pt.y);
	// Keep track of the point clicked. This is to detect how far the user has moved.
	currDrawDist = 0;
	// Start the plot list.
	currPlot = [{x: pt.x, y: pt.y}];
	// Create the path.
	// TODO: Make attr depend on the current "brush" (as in stroke-width and colour)
	currDrawPath = doc_display.path(GetPlotStr(currPlot)).attr({fill: "none", stroke: '#000000', "stroke-width": 5});
}

// Note: Assumes that we started the draw at some point. So make sure at least currDrawDist is valid.
function moveDraw(pt, pointer)
{
	// Get the amount the mouse has moved.
    var delta = {x: pt.x - lastMousePos.x, y: pt.y - lastMousePos.y};
    lastMousePos = pt;

	// Sometimes my pen flys across the screen for no reason, so to counter this,
	// I limit the amount the pen can move.
	if(pointer == "pen" && getVecLen(delta) > maxMoveDistance)
	{
		return;
	}

	// Add the amount we moved to the current distance we have moved.
	currDrawDist += delta.x * delta.x + delta.y * delta.y;

	// Is the distance from the last point more than the distance to draw a line?
	// This is to decrease file size. No need to add points too often.
	if(currDrawDist >= distanceForLine * distanceForLine)
	{
		// If so, add the new line and set the last draw point to this point.
		// Compute the clicked point in SVG coordinates.
		pt = doc_display.point(pt.x, pt.y);
		// Add the point to the plot.
		currPlot.push({x: pt.x, y: pt.y});
		// Update the path.
		currDrawPath.plot(GetPlotStr(currPlot));
		currDrawDist = 0;
	}
}

function stopDraw(pt)
{
	// Calculate the clicked point in SVG coordinates.
	pt = doc_display.point(pt.x, pt.y);
	// Add the last point to the plot.
	currPlot.push({x: pt.x, y: pt.y});
	// Update the path.
	currDrawPath.plot(GetPlotStr(currPlot));
	// Clear everything.
	currDrawDist = undefined;
	currDrawPath = undefined;
    currPlot = undefined;
    lastMousePos = undefined;
}

function startPan(pt)
{
	// Just store the start point of the pan so we can later calculate the delta of the pan.
	panStart = doc_display.point(pt.x, pt.y);
}

function movePan(pt)
{
	// Get the clicked point in SVG coordinates.
	var panEnd = doc_display.point(pt.x, pt.y);
	// Get how much the pan moved.
	var deltaPan = {x: panEnd.x - panStart.x, y: panEnd.y - panStart.y};

	// Use the delta to adjust the viewbox.
	var v = doc_display.viewbox();
	v.x -= deltaPan.x;
	v.y -= deltaPan.y;
	doc_display.viewbox(v);
}

function stopPan()
{
	// Clear the panning variable.
	panStart = undefined;
}

function startPinch(pt1, pt2)
{
    initialPinchPoints = {a: pt1, b: pt2};
    initialPinchBox = doc_display.viewbox();
}

function movePinch(pt1, pt2)
{
	// TODO: Make this better. Currently, no matter where you pinch on, the screen just zooms in to the center.
	// The screen SHOULD zoom in to the point that is being pinched on.

    var previousCenter = {x: (initialPinchPoints.a.x + initialPinchPoints.b.x) * 0.5, y: (initialPinchPoints.a.y + initialPinchPoints.b.y) * 0.5};
    var previousDelta = {x: initialPinchPoints.b.x - initialPinchPoints.a.x, y: initialPinchPoints.b.y - initialPinchPoints.a.y};
    var previousDist = Math.sqrt(previousDelta.x * previousDelta.x + previousDelta.y * previousDelta.y);
    var center = {x: (pt1.x + pt2.x) * 0.5, y: (pt1.y + pt2.y) * 0.5};
    var delta = {x: pt2.x - pt1.x, y: pt2.y - pt1.y};
    var dist = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

    previousCenter = doc_display.point(previousCenter.x, previousCenter.y);
    center = doc_display.point(center.x, center.y);

    var centerDelta = {x: center.x - previousCenter.x, y: center.y - previousCenter.y};

    var v = {x: initialPinchBox.x, y: initialPinchBox.y, width: initialPinchBox.width, height: initialPinchBox.height};
    var vc = {x: v.x + v.width * 0.5, y: v.y + v.height * 0.5};
    var ve = {x: v.width * 0.5, y: v.height * 0.5};

    vc.x -= centerDelta.x;
    vc.y -= centerDelta.y;

    ve.x *= previousDist / dist;
    ve.y *= previousDist / dist;

    v.x = vc.x - ve.x;
    v.y = vc.y - ve.y;
    v.width = ve.x * 2;
    v.height = ve.y * 2;

    doc_display.viewbox(v);
}

function stopPinch()
{
    lastPinchPoints = undefined;
}

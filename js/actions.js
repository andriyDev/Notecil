
// === Constants ===

// How much should the path be smoothed. This means how much is the path allowed to deviate from the drawn points.
const plotSmoothingRatio = 0.15;

// === State ===

var initialPinchPoints;
var initialPinchBox;

var selectedPaths;
var selectedPlots;
var selectionPaths;
var boundsRect;

var selectedBrush = -1;
var brushes = [];

const ERASE_STROKE = 0;
const ERASE_LINE = 1;
var eraseMode = ERASE_STROKE;

function includePointInBounds(bounds, pt)
{
	bounds.x = Math.min(bounds.x, pt.x);
	bounds.y = Math.min(bounds.y, pt.y);
	bounds.x2 = Math.max(bounds.x2, pt.x);
	bounds.y2 = Math.max(bounds.y2, pt.y);
	bounds.width = bounds.x2 - bounds.x;
	bounds.height = bounds.y2 - bounds.y;
}

// A class to generalize what a tool must have.
class Tool
{
	constructor()
	{

	}

	// Start using the tool.
	// pt is the point on the screen
	startUse(pt, ev) {}

	// Moves the tool to a new location.
	// pt is the point on the screen.
	moveUse(pt, ev) {}

	// Stops using the tool. This is a cleanup function.
	stopUse() {}
}

class PanTool extends Tool
{
	constructor()
	{
		super();
	}

	startUse(pt)
	{
		super.startUse(pt);
		// Just store the start point of the pan so we can later calculate the delta of the pan.
		this.startPt = ConvertToPagePoint(pt);
	}

	moveUse(pt)
	{
		super.moveUse(pt);
		// Get the clicked point in page coordinates.
		let panEnd = ConvertToPagePoint(pt);
		// Get how much the pan moved.
		let deltaPan = {x: panEnd.x - this.startPt.x, y: panEnd.y - this.startPt.y};

		// Use the delta to adjust the viewport.
		cv_viewport.x -= deltaPan.x;
		cv_viewport.y -= deltaPan.y;
		cv_viewport.x2 -= deltaPan.x;
		cv_viewport.y2 -= deltaPan.y;
		needsRedraw = true;
	}

	stopUse()
	{
		super.stopUse();
		this.startPt = undefined;
	}
}

class PointerTool extends Tool
{
	constructor(pointer)
	{
		super();
		this.drawDist = 0;
		this.lastMousePos = undefined;

		this.pointer = pointer;
	}

	startPlot(pt)
	{
		// Nothing to do for the generic pointer tool.
	}

	adjustPoint(pt, ev)
	{
		// Nothing to do for the generic pointer tool.
	}

	addPoint(pt, ev)
	{
		// Nothing to do for the generic pointer tool.
	}

	endPlot(pt)
	{
		// Nothing to do for the generic pointer tool.
	}

	startUse(pt, ev)
	{
		super.startUse(pt, ev);
		this.lastMousePos = pt;
		// Get the clicked point in page coordinates.
		pt = ConvertToPagePoint(pt);
		// Keep track of the point clicked. This is to detect how far the user has moved.
		this.drawDist = 0;
		// Begin the plot.
		this.startPlot(pt, ev);
	}

	moveUse(pt, ev)
	{
		super.moveUse(pt);
		// Get the amount the mouse has moved.
		let delta = {x: pt.x - this.lastMousePos.x, y: pt.y - this.lastMousePos.y};

		// Sometimes my pen flys across the screen for no reason, so to counter this,
		// I limit the amount the pointer can move.
		if(this.pointer == "pen" && getVecLen(delta) > PointerTool.maxMoveDistance)
		{
			return;
		}
		this.lastMousePos = pt;

		// Add the amount we moved to the current distance we have moved.
		this.drawDist += delta.x * delta.x + delta.y * delta.y;

		// Compute the clicked point in page coordinates.
		pt = ConvertToPagePoint(pt);
		// Is the distance from the last point more than the distance to draw a line?
		// This is for performance, no need to add too many points.
		if(this.drawDist >= PointerTool.distanceForLine * PointerTool.distanceForLine)
		{
			// If so, add the new point.
			// Add the point.
			this.addPoint(pt, ev);
			// Reset the drawDist.
			this.drawDist = 0;
		}
		else
		{
			this.adjustPoint(pt, ev);
		}
	}

	stopUse(pt)
	{
		super.stopUse();

		// Calculate the clicked point in page coordinates.
		pt = ConvertToPagePoint(this.lastMousePos);
		// End the plot.
		this.endPlot(pt);
		// Clear everything.
		this.drawDist = undefined;
		this.lastMousePos = undefined;
	}
}

// === Pointer Tool Static Values === //

// How much does the cursor have to move before generating another point.
PointerTool.distanceForLine = 10;
// The maximum distance that the mouse can move before the input is ignored. This is for when the pen decides to fly off the rails.
PointerTool.maxMoveDistance = 20;

class BrushTool extends PointerTool
{
	constructor(pointer)
	{
		super(pointer);
	}

	startPlot(pt, ev)
	{
		super.startPlot(pt, ev);
		let i = selectedBrush == -1 ? 0: selectedBrush;
		let b = brushes && brushes.length > i ? brushes[i] : {colour: {r: 0, g: 0, b: 0, a: 1}, width: 5};
		// Start the path.
		this.path = {type: TYPE_PATH, colour: b.colour, width: b.width, bounds: {x: pt.x, y: pt.y, x2: pt.x, y2: pt.y, width: 0, height: 0}, data: [{x: pt.x, y: pt.y, r: ev.pressure}, {x: pt.x, y: pt.y, r: ev.pressure}]};
		// Add the path to the render list.
		page_data.push(this.path);
		// We don't need to redraw the screen yet until we have at least 2 points.
	}

	adjustPoint(pt, ev)
	{
		super.adjustPoint(pt, ev);
		// Adjust the last point.
		this.path.data[this.path.data.length - 1].x = pt.x;
		this.path.data[this.path.data.length - 1].y = pt.y;
		this.path.data[this.path.data.length - 1].r = ev.pressure;
		// Mark the screen to be redrawn.
		needsRedraw = true;
	}

	addPoint(pt, ev)
	{
		super.addPoint(pt, ev);
		// Add the point to the path.
		this.path.data.push({x: pt.x, y: pt.y, r: ev ? ev.pressure : 0});
		// Adjust the bounds.
		includePointInBounds(this.path.bounds, pt);
		// Mark the screen to be redrawn.
		needsRedraw = true;
	}

	endPlot(pt)
	{
		this.addPoint(pt);
	}
}

// This function is an implementation of the algorithm described on this page:
// http://geomalgorithms.com/a03-_inclusion.html
function GetWindingNumber(polygon, point)
{
	let winding = 0;

	// Since the last point is equal to the first, we can ignore it.
	for(let i = 0; i < polygon.length - 1; i++)
	{
		// If both points of the edge are to the left of the point, then there is no way to intersect a
		// ray moving to the right.
		if(polygon[i].x < point.x && polygon[i + 1].x < point.x)
		{
			continue;
		}
		// Get position relative to the point for each edge point.
		let diff = (polygon[i].y - point.y);
		let diff_next = (polygon[i + 1].y - point.y);

		// If one point is above and one is below (one positive, one negative),
		// or a point is intersected (equals 0), then this will effect the winding number.
		if(diff * diff_next <= 0)
		{
			// Compute the direction the edge is going (up or down).
			let edge_dir = (polygon[i + 1].y - polygon[i].y);
			// Here we assume that the edge is not going perfectly horizontal.
			// If it is, we treat it as an edge going up.
			if(edge_dir <= 0)
			{
				winding++;
			}
			else
			{
				winding--;
			}
		}
	}

	return winding;
}

class SelectTool extends PointerTool
{
	constructor(pointer)
	{
		super(pointer);
	}

	startPlot(pt)
	{
		// Start the plot list.
		this.plot = [{x: pt.x, y: pt.y}];
		// Initialize the max and min points for a bounding box.
		this.min_pt = {x: pt.x, y: pt.y};
		this.max_pt = {x: pt.x, y: pt.y};
		// Create the selection ghost.
		this.drawPath = doc_display.path(GetPlotStr(this.lot)).attr({fill: "#909090", stroke: '#909090', "stroke-width": 5, "fill-opacity": 0.35});
		// If we did have a selection, make sure to clear the ui.
		if(selectionPaths)
		{
			for(let i = 0; i < selectionPaths.length; i++)
			{
				selectionPaths[i].remove();
			}
		}
		// If we did have a selection, make sure ti clear it.
		if(selectedPaths)
		{
			selectedPaths = undefined;
		}
		if(boundsRect)
		{
			boundsRect.remove();
			boundsRect = undefined;
		}

		selectionPaths = [];
		selectedPaths = [];
		selectedPlots = [];
	}

	addPoint(pt)
	{
		// Add the point.
		this.plot.push({x: pt.x, y: pt.y});
		// Ensure that the new point is contained in the bounding box.
		this.min_pt = {x: Math.min(pt.x, this.min_pt.x), y: Math.min(pt.y, this.min_pt.y)};
		this.max_pt = {x: Math.max(pt.x, this.max_pt.x), y: Math.max(pt.y, this.max_pt.y)};
		// Update the path.
		this.drawPath.plot(GetPlotStr(this.plot) + " Z");
	}

	endPlot(pt)
	{
		// Add the point.
		this.plot.push({x: pt.x, y: pt.y});
		// Ensure that the new point is contained in the bounding box.
		this.min_pt = {x: Math.min(pt.x, this.min_pt.x), y: Math.min(pt.y, this.min_pt.y)};
		this.max_pt = {x: Math.max(pt.x, this.max_pt.x), y: Math.max(pt.y, this.max_pt.y)};
		// Add the final point.
		this.plot.push(this.plot[0]);
		// Get rid of the selection ghost.
		this.drawPath.remove();

		let bounds = undefined;
		let paths = doc_display.children();
		for(let i = 0; i < paths.length; i++)
		{
			let bbox = paths[i].bbox();
			// If the bounding boxes do not intersect, then don't bother calculating it.
			if(this.min_pt.x > bbox.x2 || this.min_pt.y > bbox.y2 &&
				this.max_pt.x < bbox.x || this.max_pt.y < bbox.y)
			{
				continue;
			}

			// Get the points in the plot.
			let pathPlot = extractPlotFromPath(paths[i]);
			let pointsInSelect = 0;
			for(let j = 0; j < pathPlot.length; j++)
			{
				// Get the winding number of each point and make sure it is positive.
				if(GetWindingNumber(this.plot, pathPlot[j]) > 0)
				{
					// Increment the number if points in the selection region.
					pointsInSelect++;
					// If the percentage of points in the selection region surpasses the percentToSelect
					// Then select it!
					if(pointsInSelect / pathPlot.length >= SelectTool.percentToSelect)
					{
						// Add a path to underline the selected path.
						let select_path = doc_display.path(GetPlotStr(pathPlot)).attr({fill: "none", stroke: "#909090", "stroke-opacity": 0.5, "stroke-width": paths[i].attr("stroke-width") * (1 + SelectTool.selectWidth)});
						select_path.after(paths[i]);
						selectionPaths.push(select_path);
						// Add the path to the selection.
						selectedPaths.push(paths[i]);
						selectedPlots.push(pathPlot);
						// Adjust the bounding box to include the stroke width
						// We divide by two since stroke-width means the "diameter" of the line.
						let stroke_width = paths[i].attr("stroke-width") / 2;
						bbox.x -= stroke_width;
						bbox.y -= stroke_width;
						bbox.width += 2 * stroke_width;
						bbox.height += 2 * stroke_width;
						bbox.w += 2 * stroke_width;
						bbox.h += 2 * stroke_width;
						bbox.x2 += stroke_width;
						bbox.y2 += stroke_width;

						if(bounds != undefined)
						{
							bounds = bounds.merge(bbox);
						}
						else
						{
							bounds = bbox;
						}
						// We don't need to check any more points.
						break;
					}
				}
			}
		}
		if(bounds != undefined)
		{
			boundsRect = doc_display.rect(bounds.width, bounds.height);
			boundsRect.attr({x: bounds.x, y: bounds.y, fill: "none", stroke: "#000000", "stroke-width": "0.5%"});
		}
	}
}

// === Select Tool Constants ===

SelectTool.percentToSelect = 0.5;
SelectTool.selectWidth = 2;

function extractBounds(a, b)
{
	return {x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
			x2: Math.max(a.x, b.x), y2: Math.max(a.y, b.y)};
}

function doBoundsIntersect(a, b)
{
	if(a.x2 == undefined || b.x2 == undefined)
	{
		return a.x < b.x + b.width && a.y < b.y + b.height
			&& a.x + a.width >= b.x && a.y + a.height >= b.y;
	}
	else
	{
		return a.x < b.x2 && a.y < b.y2 && a.x2 >= b.x && a.y2 >= b.y;
	}
}

function getLineVals(a, b)
{
	let delta = {x: b.x - a.x, y: b.y - a.y};
	let slope = delta.x == 0 ? Infinity : delta.y / delta.x;
	let b = slope == Infinity ? a.x : a.y - slope * a.x;
	return {m: slope, b: b};
}

function computeIntersectionOfLines(l1, l2)
{
	if(l1.m == l2.m)
	{
		return;
	}
	let x = (l2.b - l1.b) / (l1.m - l2.m);
	let y = l1.m * x + l1.b;
	return {x: x, y: y};
}

// This assumes pt was generated as an intersection point.
function intersectsWithinBounds(bbox, pt)
{
	return pt.x >= bbox.x && pt.x < bbox.x2;
}

class EraseTool extends PointerTool
{
	constructor(pointer)
	{
		super(pointer);
	}

	startPlot(pt)
	{
		this.lastPt = pt;
	}

	addPoint(pt)
	{
		let erase_bounds = extractBounds(pt, this.lastPt);
		let eraseLine = getLineVals(this.lastPt, pt);
		let paths = doc_display.children();
		for(let i = 0; i < paths.length; i++)
		{
			let bbox = paths[i].bbox();
			// If the bounding boxes do not intersect, then don't bother calculating it.
			if(!doBoundsIntersect(erase_bounds, bbox))
			{
				continue;
			}
			// TODO: Somehow make this not run incredibly slowly.
			let plot = extractPlotFromPath(paths[i]);
			for(let j = 0; j < plot.length - 1; j++)
			{
				// Test bounds since that can exclude many points.
				let line_bounds = extractBounds(plot[j], plot[j + 1]);
				if(!doBoundsIntersect(erase_bounds, line_bounds))
				{
					// Skip line if bounds do not intersect erase bounds.
					continue;
				}
				// We will assume that linear is fine for large enough scales and fine enough points.
				var line = getLineVals(plot[j], plot[j + 1]);
				var intersect = computeIntersectionOfLines(eraseLine, line);
				if(intersect && intersectsWithinBounds(erase_bounds, intersect)
							&& intersectsWithinBounds(line_bounds, intersect))
					if(eraseMode == ERASE_STROKE)
					{
						paths[i].remove();
						break;
					}
					else
					{
						// TODO: Make the line erase tool work.
					}
			}
		}
		this.lastPt = pt;
	}

	endPlot(pt)
	{
		this.addPoint(pt);
	}
}

class ScaleSelectionTool extends Tool
{
	constructor()
	{
		super();
	}

	startUse(pt)
	{
		super.startUse(pt);
		if(boundsRect)
		{
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
				this.dir = 0;
			}
			// If we are within the corner distance for the top-right
			else if(Math.abs(diff_right) < ScaleSelectionTool.maxCornerOffset
				&& Math.abs(diff_top) < ScaleSelectionTool.maxCornerOffset)
			{
				this.dir = 2;
			}
			// If we are within the corner distance for the bot-right
			else if(Math.abs(diff_right) < ScaleSelectionTool.maxCornerOffset
				&& Math.abs(diff_bot) < ScaleSelectionTool.maxCornerOffset)
			{
				this.dir = 4;
			}
			// If we are within the corner distance for the bot-left
			else if(Math.abs(diff_left) < ScaleSelectionTool.maxCornerOffset
				&& Math.abs(diff_bot) < ScaleSelectionTool.maxCornerOffset)
			{
				this.dir = 6;
			}
			// If we are within the edge distance for the top edge
			else if(Math.abs(diff_top) < ScaleSelectionTool.maxNormalOffset
				&& diff_left > 0 && diff_right < 0)
			{
				this.dir = 1;
			}
			// If we are within the edge distance for the right edge
			else if(Math.abs(diff_right) < ScaleSelectionTool.maxNormalOffset
				&& diff_top > 0 && diff_bot < 0)
			{
				this.dir = 3;
			}
			// If we are within the edge distance for the bottom edge
			else if(Math.abs(diff_bot) < ScaleSelectionTool.maxNormalOffset
				&& diff_left > 0 && diff_right < 0)
			{
				this.dir = 5;
			}
			// If we are within the edge distance for the left edge
			else if(Math.abs(diff_left) < ScaleSelectionTool.maxNormalOffset
				&& diff_top > 0 && diff_bot < 0)
			{
				this.dir = 7;
			}
			// If we didn't hit any edge or corner.
			else
			{
				return false;
			}
			// If we reached here that must mean that one of the ifs passed,
			// so we will be scaling.
			// Assign the start position.
			this.startPos = ConvertToPagePoint(pt);
			return true;
		}
		else
		{
			return false;
		}
	}

	moveUse(pt)
	{
		super.moveUse(pt);
		pt = ConvertToPagePoint(pt);
		var delta = {x: pt.x - this.startPos.x, y: pt.y - this.startPos.y};
		let tl_diff = {x: 0, y: 0};

		// Find out how the width/height should change, and how the top left should change
		// based on the direction of dragging.
		switch(this.dir)
		{
			case 0:
				tl_diff.x = delta.x;
				tl_diff.y = delta.y;
				delta.x *= -1;
				delta.y *= -1;
				break;
			case 2:
				tl_diff.y = delta.y;
				delta.y *= -1;
				break;
			case 4:
				break;
			case 6:
				tl_diff.x = delta.x;
				delta.x *= -1;
				break;
			case 1:
				tl_diff.y = delta.y;
				delta.x = 0;
				delta.y *= -1;
				break;
			case 3:
				delta.y = 0;
				break;
			case 5:
				delta.x = 0;
				break;
			case 7:
				tl_diff.x = delta.x;
				delta.x *= -1;
				delta.y = 0;
				break;
		}
		let bbox = boundsRect.bbox();
		for(let i = 0; i < selectedPaths.length; i++)
		{
			for(let p = 0; p < selectedPlots[i].length; p++)
			{
				let plotpt = selectedPlots[i][p];
				// Make it relative to the bounding box.
				plotpt.x -= bbox.cx;
				plotpt.y -= bbox.cy;
				// Scale by the amount we will stretch the box.
				plotpt.x *= (bbox.w + delta.x) / bbox.w;
				plotpt.y *= (bbox.h + delta.y) / bbox.h;
				// Make it back relative to the new scaled box.
				plotpt.x += (bbox.x + tl_diff.x) + (bbox.w + delta.x) * 0.5;
				plotpt.y += (bbox.y + tl_diff.y) + (bbox.h + delta.y) * 0.5;
			}
			let plotStr = GetPlotStr(selectedPlots[i])
			selectedPaths[i].plot(plotStr);
			selectionPaths[i].plot(plotStr);
		}

		boundsRect.attr({width: (bbox.w + delta.x), height: (bbox.h + delta.y),
			x: bbox.x + tl_diff.x, y: bbox.y + tl_diff.y});

		this.startPos = pt;
	}

	stopUse()
	{
		super.stopUse();
	}
}

// === Scale Selection Tool Constants ===

ScaleSelectionTool.maxCornerOffset = 5;
ScaleSelectionTool.maxNormalOffset = 5;

class MoveSelectionTool extends Tool
{
	constructor()
	{
		super();
	}

	startUse(pt)
	{
		super.startUse(pt);
		if(boundsRect)
		{
			// Get the dom position of the bounds
			let bbox = boundsRect.rbox();
			// Compute the difference between each edge.
			let diff_left = pt.x - bbox.x;
			let diff_top = pt.y - bbox.y;
			let diff_right = pt.x - bbox.x2;
			let diff_bot = pt.y - bbox.y2;
			// Are we inside the bounds?
			if(diff_left >= 0 && diff_left >= 0 && diff_bot < 0 && diff_right < 0)
			{
				this.startPos = ConvertToPagePoint(pt);
				return true;
			}
			else
			{
				return false;
			}
		}
		else
		{
			return false;
		}
	}

	moveUse(pt)
	{
		super.moveUse(pt);
		pt = ConvertToPagePoint(pt);
		let delta = {x: pt.x - this.startPos.x, y: pt.y - this.startPos.y};

		let bbox = boundsRect.bbox();
		for(let i = 0; i < selectedPaths.length; i++)
		{
			for(let p = 0; p < selectedPlots[i].length; p++)
			{
				let plotpt = selectedPlots[i][p];
				// Add the delta.
				plotpt.x += delta.x;
				plotpt.y += delta.y;
			}
			let plotStr = GetPlotStr(selectedPlots[i])
			selectedPaths[i].plot(plotStr);
			selectionPaths[i].plot(plotStr);
		}

		boundsRect.attr({x: bbox.x + delta.x, y: bbox.y + delta.y});

		this.startPos = pt;
	}

	stopUse()
	{
		super.stopUse();
	}
}

// Given a path that was generated from this code, we can extract the points used to create it.
// Use this function to do so.
function extractPlotFromPath(path)
{
	// Get the array.
	let arr = path.array().value;
	let re = [];
	for(let i = 0; i < arr.length; i++)
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
	let str = "M" + plot[0].x + " " + plot[0].y;
	// If there's no more points, then just return.
	if(plot.length == 1)
	{
		return str;
	}
	// We know we have at least 2 points to operate on.

	// For each "middle" point (non-end points), we want to compute their slopes.
	// We compute the first point's slope.
	let slopes = [scale(getDelta(plot[0], plot[1]), plotSmoothingRatio)];
	// This is based on a blog post by François Romain
	// Src: https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
	// To be clear, this implementation is significantly streamlined. Only the core ideas are still present.
	for(let i = 1; i < plot.length - 1; i++)
	{
		slopes.push(scale(getDelta(plot[i - 1], plot[i + 1]), plotSmoothingRatio));
	}
	// We also must not forget to compute the last point's slope.
	slopes.push(scale(getDelta(plot[plot.length - 2], plot[plot.length - 1]), plotSmoothingRatio));
	// Now that we have the slopes, we can use those to generate our bezier command.
	for(let i = 1; i < plot.length; i++)
	{
		// Get the absolute tangents.
		let c1 = {x: slopes[i - 1].x + plot[i - 1].x, y: slopes[i - 1].y + plot[i - 1].y};
		let c2 = {x: plot[i].x - slopes[i].x, y: plot[i].y - slopes[i].y};
		// Make the command.
		str += "C" + c1.x + " " + c1.y + " " + c2.x + " " + c2.y + " " + plot[i].x + " " + plot[i].y;
	}
	// Once all commands are appended, return the entire string.
	return str;
}

function startSelectionMove(pt)
{
	pt = ConvertToPagePoint(pt);
}

function moveSelectionMove(pt)
{
	pt = ConvertToPagePoint(pt);
}

function endSelectionMove()
{

}

function startPinch(pt1, pt2)
{
    initialPinchPoints = {a: pt1, b: pt2};
    initialPinchBox = {x: cv_viewport.x, y: cv_viewport.y, x2: cv_viewport.x2, y2: cv_viewport.y2, width: cv_viewport.width, height: cv_viewport.height};
}

function movePinch(pt1, pt2)
{
	// TODO: Make this better. Currently, no matter where you pinch on, the screen just zooms in to the center.
	// The screen SHOULD zoom in to the point that is being pinched on.

    let previousCenter = {x: (initialPinchPoints.a.x + initialPinchPoints.b.x) * 0.5, y: (initialPinchPoints.a.y + initialPinchPoints.b.y) * 0.5};
    let previousDelta = {x: initialPinchPoints.b.x - initialPinchPoints.a.x, y: initialPinchPoints.b.y - initialPinchPoints.a.y};
    let previousDist = Math.sqrt(previousDelta.x * previousDelta.x + previousDelta.y * previousDelta.y);
    let center = {x: (pt1.x + pt2.x) * 0.5, y: (pt1.y + pt2.y) * 0.5};
    let delta = {x: pt2.x - pt1.x, y: pt2.y - pt1.y};
    let dist = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

    previousCenter = ConvertToPagePoint(previousCenter);
    center = ConvertToPagePoint(center);

    let centerDelta = {x: center.x - previousCenter.x, y: center.y - previousCenter.y};

    let v = {x: initialPinchBox.x, y: initialPinchBox.y, width: initialPinchBox.width, height: initialPinchBox.height};
    let vc = {x: v.x + v.width * 0.5, y: v.y + v.height * 0.5};
    let ve = {x: v.width * 0.5, y: v.height * 0.5};

    vc.x -= centerDelta.x;
    vc.y -= centerDelta.y;

    ve.x *= previousDist / dist;
    ve.y *= previousDist / dist;

    v.x = vc.x - ve.x;
    v.y = vc.y - ve.y;
    v.width = ve.x * 2;
    v.height = ve.y * 2;
	v.x2 = v.x + v.width;
	v.y2 = v.y + v.height;

	needsRedraw = true;
	cv_viewport = v;
}

function stopPinch()
{
    lastPinchPoints = undefined;
}

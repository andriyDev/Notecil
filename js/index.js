
// === State ===

var doc_display;

var printedPointerNotSupportedMsg = false;

var zooming = false;

const electron = require('electron');
const fs = require('fs');
const path = require('path');

var rootList;

var selectedSection = -1;
var selectedPage = -1;

var openedPage;

function clickedSection()
{
	// When we click on a section, we must first get the index of the section.
	var i = parseInt(this.id.substring(7));
	// Select the new section.
	selectSection(i);
}

function selectSection(i)
{
	// Only do something if the selected section has changed.
	if(i != selectedSection)
	{
		// As long as a section was previously selected, we need to clear the old selection.
		if(selectedSection != -1)
		{
			$('#section' + selectedSection).removeClass('selected_section');
		}
		// Set the selection and add the correct class.
		selectedSection = i;
		selectedPage = -1;
		$('#section' + selectedSection).addClass('selected_section');
		regenPages();
	}
}

function clickedPage()
{
	var i = parseInt(this.id.substring(4));
	$('.file_elem').removeClass('selected_file');
	$(this).addClass('selected_file');
	openPage(path.join(rootList[selectedSection].path, $(this).attr('value') + ".ncb"), i);
}

function openPage(page, ind)
{
	if(openedPage)
	{
		savePage();
	}

	if(selectedPage != ind)
	{
		selectedPage = ind;
		openedPage = page;

		reloadPage();
	}
}

function savePage()
{
	var paths = $('#doc').children().children().filter("path").toArray();

	// We start with a single buffer that will hold the number of paths.
	var buffers = [Buffer.alloc(4)];
	// Write the number of paths.
	buffers[0].writeUInt32BE(paths.length, 0);
	// Keep track of how many bytes are allocated in total.
	var tl = 4;
	for(var i = 0; i < paths.length; i++)
	{
		// Get the plot.
		var path_data = extractPlotFromPath(SVG.adopt(paths[i]));
		// Allocate the number of bytes required for the length and then bytes enough for the plot.
		var buf = Buffer.alloc(4 + path_data.length * 8);
		// Write the path length.
		buf.writeUInt32BE(path_data.length, 0);
		// TODO: Make this write the correct "brush"
		var b = 4;
		for(var j = 0; j < path_data.length; j++)
		{
			// For each point in the plot, write both the x and y coordinates.
			buf.writeFloatBE(path_data[j].x, b);
			buf.writeFloatBE(path_data[j].y, b + 4);
			b += 8;
		}
		// Add the buffer to the buffers that need to be written.
		buffers.push(buf);
		// Add to the "total length"
		tl += b;
	}

	buffers = Buffer.concat(buffers, tl);
	// Write the buffers once they are concatenated.
	fs.writeFileSync(openedPage, buffers);
}

function reloadPage()
{
	$('#doc').children().empty();
	fs.readFile(openedPage, {encoding: null}, (err, data) => {
		if (err) throw err;
		var paths = data.readUInt32BE(0);
		// This will be our byte index.
		var b = 4;
		for(var i = 0; i < paths; i++)
		{
			// Read the path len.
			var path_len = data.readUInt32BE(b);
			b += 4;
			// Allocate an array with <path_len> elements.
			var plot = new Array(path_len);
			for(var j = 0; j < path_len; j++)
			{
				plot[j] = {x: data.readFloatBE(b), y: data.readFloatBE(b + 4)};
				b += 8;
			}
			// TODO: Make this load the correct "brush"
			doc_display.path(GetPlotStr(plot)).attr({fill: "none", stroke: '#000000', "stroke-width": 5});
		}
	});
}

function regenSections()
{
	// Start by clearing out the list first.
	var list = $('#sections_list');
	list.empty();

	for(var i = 0; i < rootList.length; i++)
	{
		// Create a section button for each element in the rootList.
		var section = $('<div id="section' + i + '" class="divBtn section_elem" value="' + rootList[i].fileName + '">' + rootList[i].name + '</div>');
		list.append(section);
		// Add the event listener for the click.
		section.on("click", clickedSection);
		// If this is the currently selected section, we must add the associated class.
		if(i == selectedSection)
		{
			section.addClass('selected_section');
		}
	}
	regenPages();
}

function regenPages()
{
	// Get the page list and clear it so we can regenerate it.
	var pages = $('#files_list');
	pages.empty();

	if(selectedSection == -1)
	{
		// TODO: do something when there's no selected section.
		return;
	}

	fs.readFile(path.join(rootList[selectedSection].path, ".section"), (err, data) => {
		if(err)
		{
			// If we hit an error, try to create a .section file. If there's still an error, just let it throw.
			fs.writeFileSync(path.join(rootList[selectedSection].path, ".section"), "[]");
			// Assign the default empty data.
			data = "[]";
		}
		data = JSON.parse(data);
		for(var i = 0; i < data.length; i++)
		{
			var new_page = $('<div id="page' + i + '" class="divBtn file_elem" value="' + data[i].file + '">' + data[i].name + '</div>');
			pages.append(new_page);
			new_page.on("click", clickedPage);
			if(i == selectedPage)
			{
				new_page.addClass("selected_file");
			}
		}
	});
}

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

	// Assign an empty root list in case the .sections file was unreadable.
	rootList = [];
	// Try to read the .sections file.
	fs.readFile(".sections", function(err, data){
		// If the file has an error, it's possible it just doesn't exist, so we will try to make it exist.
		if(err)
		{
			// Try to write the sections file.
			fs.writeFile(".sections", JSON.stringify([]), function(err){
				// If we couldn't create the default sections file, there's nothing we can do.
				if (err) throw err;
			});
			// Return so that we don't try to execute the rest.
			return;
		}
		// If the data is valid, assign the rootList.
		rootList = JSON.parse(data);
		// Create the UI for the sections.
		regenSections();
	});

	dialog_addSection_init();
	dialog_addPage_init();
}

document.addEventListener("DOMContentLoaded", init);

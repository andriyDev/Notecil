
// === State ===

var doc_display;

var printedPointerNotSupportedMsg = false;

var zooming = false;

const electron = require('electron');
const fs = require('fs');

var rootList;

var selectedSection = -1;

function selectSection()
{
	var i = parseInt(this.id.substring(7));
	if(i != selectedSection)
	{
		if(selectedSection != -1)
		{
			$('#section' + selectedSection).removeClass('selected_section');
		}
		selectedSection = i;
		$('#section' + selectedSection).addClass('selected_section');
	}
}

function regenSections()
{
	// Start by clearing out the list first.
	var list = $('#sections_list');
	list.empty();
	
	for(var i = 0; i < rootList.length; i++)
	{
		// Create a section button for each element in the rootList.
		var section = $('<div id="section' + i + '"class="divBtn section_elem">' + rootList[i].name + '</div>');
		list.append(section);
		// Add the event listener for the click.
		section.on("click", selectSection);
		if(rootList[i].name == selectedSection)
		{
			section.addClass('selected_section');
		}
	}
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
}

document.addEventListener("DOMContentLoaded", init);


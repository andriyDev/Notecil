
// === State ===

var doc_display;

var printedPointerNotSupportedMsg = false;

var zooming = false;

const electron = require('electron');
const fs = require('fs');
const path = require('path');

var rootList;

var selectedSection = -1;

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
		$('#section' + selectedSection).addClass('selected_section');
		regenPages();
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
	if(selectedSection == -1)
	{
		// TODO: do something when there's no selected section.
		return;
	}
	// Get the page list and clear it so we can regenerate it.
	var pages = $('#files_list');
	pages.empty();
	
	fs.readFile(path.join(rootList[selectedSection].path, ".section"), (err, data) => {
		if(err) throw err;
		data = JSON.parse(data);
		// TODO: Use the .section file to populate the pages list.
	});
}

function addSection()
{
	$('#addSectionOverlay').addClass('showOverlay');
	$('#addSection_name').attr('value', "New Section");
	$('#addSection_path').attr('value', "").text("Select a path...");
	$('#addSection_ok').prop('disabled', true).addClass('dialog_btn_disabled');
}

function selectPath()
{
	var paths = electron.remote.dialog.showOpenDialog(electron.remote.getCurrentWindow(), {properties: ['openDirectory']});
	if(paths && paths.length > 0)
	{
		return paths[0];
	}
	else
	{
		return undefined;
	}
}

function reverseTruncate(str, maxlen)
{
	if(str.length <= maxlen)
	{
		return str;
	}
	else
	{
		return "..." + str.substring(str.length - maxlen, str.length);
	}
}

function addSection_selectPath()
{
	var path = selectPath();
	if(path)
	{
		$('#addSection_path').attr("value", path).text(reverseTruncate(path, 30));
		$('#addSection_ok').prop('disabled', false).removeClass('dialog_btn_disabled');
	}
}

function addSection_ok(ev)
{
	var btn = $('#addSection_ok');
	if(btn.prop('disabled'))
	{
		return;
	}

	// TODO: Create the section.
	fs.access($('#addSection_path').attr('value'), (err) => {
		if (err)
		{
			throw err;
			// TODO: Make the dialog box have an error message.
		}
		rootList.push({name: $('#addSection_name').attr('value'), path: $('#addSection_path').attr('value')});
		fs.writeFile(".sections", JSON.stringify(rootList), function(err){
			if(err) throw err;
		});
		selectedSection = rootList.length - 1;
		regenSections();

		$('#addSectionOverlay').removeClass('showOverlay');
	});
}

function addSection_cancel()
{
	$('#addSectionOverlay').removeClass('showOverlay');
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

	$('.sections_add').on("click", addSection);
	$('#addSectionOverlay').on("click", addSection_cancel);
	$('.addSectionDialog').on("click", function(){ return false; });
	$('#addSection_selectPath').on("click", addSection_selectPath);
	$('#addSection_ok').on("click", addSection_ok);
	$('#addSection_cancel').on("click", addSection_cancel);
}

document.addEventListener("DOMContentLoaded", init);


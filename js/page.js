
var rootList;
var pageList;

var selectedSection = -1;

var openedPage;
var openedPageInd;

var context_target;

const section_context_template =
[
	{ label: 'Rename', click () { OpenRenameDialog(SectionButtonToData(context_target),
		() => { SaveRootList(); regenSections(); }); } },
	{ label: 'Move Up', click() { MoveSection(context_target, -1); } },
	{ label: 'Move Down', click() { MoveSection(context_target, 1); } },
	{ type: 'separator' },
	{ label: 'Delete', click() { context_deleteSection(); } }
];

const page_context_template =
[
	{ label: 'Rename', click () { OpenRenameDialog(PageButtonToData(context_target),
		() => { SavePageList(); regenPages(); }); } },
	{ label: 'Move Up', click() { MovePage(context_target, -1); } },
	{ label: 'Move Down', click() { MovePage(context_target, 1); } },
	{ label: 'Duplicate', click() { context_duplicatePage(); } },
	{ label: 'Export', click() { ExportPage(); } },
	{ type: 'separator' },
	{ label: 'Delete', click() { context_deletePage(); } }
];

// === Utility ===

function SaveRootList()
{
	// Write the new section list to the .sections file
	fs.writeFile(".sections", JSON.stringify(rootList), (err) => {
		if (err) throw err;
	});
}

function SavePageList()
{
	// Write the updated page list to the .section when possible.
	fs.writeFile(GetSectionPath(selectedSection), JSON.stringify(pageList), (err) => {
		if(err) throw err;
	});
}

function SectionButtonToData(tgt)
{
	return rootList[parseInt(tgt.id.substring(7))];
}

function PageButtonToData(tgt)
{
	return pageList[parseInt(tgt.id.substring(4))];
}

function GetPagePath(ind)
{
	if((typeof ind) == "number")
	{
		return path.join(rootList[selectedSection].path, pageList[ind].file + ".ncb");
	}
	else
	{
		return path.join(rootList[selectedSection].path, ind.file + ".ncb");
	}
}

function GetSectionPath(ind)
{
	return path.join(rootList[ind].path, ".section");
}

function GetValidPageName()
{
	var files = fs.readdirSync(rootList[selectedSection].path);
	var currentPages = {};
	for(var i = 0; i < files.length; i++)
	{
		var f = path.parse(files[i]);
		if(f.ext == ".ncb")
		{
			currentPages[f.name] = true;
		}
	}
	var fn;
	do {
		fn = "Page" + (Math.floor(Math.random() * 10000) + 1);
	} while (currentPages[fn]);

	return fn;
}

// === Context Events ===

function context_duplicatePage()
{
	OpenDuplicateDialog(PageButtonToData(context_target),
		(name, file) => {
			// Create the listing.
			pageList.push({name: name, file: file});
			// Save the data.
			SavePageList();
			// Copy file.
			fs.copyFileSync(GetPagePath(PageButtonToData(context_target)), GetPagePath(pageList.length - 1));
			// Select the new page.
			openPage(pageList.length - 1);
			// Regenerate page list.
			regenPages();
		});
}

function ExportPage()
{
	// Let the user pick a file.
	var file = electron.remote.dialog.showSaveDialog(electron.remote.getCurrentWindow(), {title: "Export As...", filters: [{name: "HTML/SVG", extensions: ["html"]}]});
	// We check to make sure that a valid file was selected.
	if(!file)
	{
		return;
	}
	var min = undefined;
	var max = undefined;
	var file_data = "";
	fs.readFile(GetPagePath(PageButtonToData(context_target)), {encoding: null}, (err, data) => {
		if (err) throw err;
		var paths = data.readUInt32BE(0);
		// This will be our byte index.
		var totalBox;
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
				if(i == 0 && j == 0)
				{
					min = plot[j];
					max = plot[j];
				}
				else
				{
					min = {x: Math.min(min.x, plot[j].x), y: Math.min(min.y, plot[j].y)};
					max = {x: Math.max(max.x, plot[j].x), y: Math.max(max.y, plot[j].y)};
				}
				b += 8;
			}
			// TODO: Make this load the correct "brush"
			file_data += '<path d="' + GetPlotStr(plot) + '" fill="none" stroke="#000000" stroke-width="5"></path>';
		}
		min.x -= 100;
		min.y -= 100;
		max.x += 100;
		max.y += 100;
		file_data += "</svg></body></html>";
		fs.writeFile(file, "<html style='margin: 0; padding: 0;'><body style='margin: 0; padding: 0;'><svg width='" + (max.x - min.x) + "' height='" + (max.y - min.y) + "'>" + file_data, (err) => {
			if (err) throw err;
		});
	});
}

function context_deletePage()
{
	var id = parseInt(context_target.id.substring(4));
	if(openedPageInd.page == id)
	{
		// TODO: do something when there's no open page.
		openedPageInd = undefined;
	}
	// Remove the page from the listings.
	pageList.splice(id, 1);
	// Save the listings.
	SavePageList();
	// Regenerate the page list.
	regenPages();
}

function MoveSection(tgt, amt)
{
	// When we click on a section, we must first get the index of the section.
	var i = parseInt(tgt.id.substring(7));
	// We want to make sure we never leave the bounds, so if amt would take us out, limit amt.
	if(i + amt < 0)
	{
		amt = -i;
		return;
	}
	else if(i + amt >= rootList.length)
	{
		amt = rootList.length - i - 1;
	}
	// Perform the swap.
	var swapInd = i + amt;
	var tmp = rootList[swapInd];
	rootList[swapInd] = rootList[i];
	rootList[i] = tmp;

	SaveRootList();

	// Now we need to update our local state.
	// Start by making sure the selectedSection is swapped if necessary.
	if(selectedSection == i)
	{
		selectedSection = swapInd;
	}
	else if(selectedSection == swapInd)
	{
		selectedSection = i;
	}

	// If we have a page open, we also need to update that index.
	if(openedPageInd)
	{
		if(openedPageInd.section == i)
		{
			openedPageInd.section = swapInd;
		}
		else if(openedPageInd.section == swapInd)
		{
			openedPageInd.section = i;
		}
	}

	// Regenerate the section list to reflect the updated ordering.
	regenSections();
}

function MovePage(tgt, amt)
{
	// When we click on a section, we must first get the index of the section.
	var i = parseInt(tgt.id.substring(4));
	// We want to make sure we never leave the bounds, so if amt would take us out, limit amt.
	if(i + amt < 0)
	{
		amt = -i;
		return;
	}
	else if(i + amt >= pageList.length)
	{
		amt = pageList.length - i - 1;
	}
	var swapInd = i + amt;
	var tmp = pageList[swapInd];
	pageList[swapInd] = pageList[i];
	pageList[i] = tmp;

	SavePageList();

	// If we have a page open, we also need to update that index.
	if(openedPageInd && openedPageInd.section == selectedSection)
	{
		if(openedPageInd.page == i)
		{
			openedPageInd.page = swapInd;
		}
		else if(openedPageInd.page == swapInd)
		{
			openedPageInd.page = i;
		}
	}

	// Regenerate the pages to reflect the updated ordering.
	regenPages();
}

// === Main UI Events ===

function clickedSection(ev)
{
	// When we click on a section, we must first get the index of the section.
	var i = parseInt(this.id.substring(7));
	// Select the new section.
	selectSection(i);
}

function openSectionContext(ev)
{
	context_target = this;
	ev.preventDefault();
	var context = Menu.buildFromTemplate(section_context_template);
	context.popup(electron.remote.getCurrentWindow());
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

		var sec = GetSectionPath(selectedSection);
		// Load the page list for this section.
		fs.readFile(sec, function(err, data){
			if(err)
			{
				// If we hit an error, try to create a .section file. If there's still an error, just let it throw.
				fs.writeFileSync(sec, "[]");
				// Assign the default empty data.
				data = "[]";
			}
			// Assign the page list.
			pageList = JSON.parse(data);
			// Regen the page list.
			regenPages();
		});
	}
}

function clickedPage(ev)
{
	var i = parseInt(this.id.substring(4));
	$('.file_elem').removeClass('selected_file');
	$(this).addClass('selected_file');
	openPage(i);
}

function openPageContext(ev)
{
	context_target = this;
	ev.preventDefault();
	var context = Menu.buildFromTemplate(page_context_template);
	context.popup(electron.remote.getCurrentWindow());
}

function openPage(ind)
{
	if(openedPage)
	{
		savePage();
	}

	if(!openedPageInd || openedPageInd.page != ind || openedPageInd.section != selectedSection)
	{
		openedPageInd = {section: selectedSection, page: ind};
		openedPage = GetPagePath(ind);

		reloadPage();

		// TODO: Move the viewport to something more reasonable.
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
		section.on("contextmenu", openSectionContext);
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

	for(var i = 0; i < pageList.length; i++)
	{
		var new_page = $('<div id="page' + i + '" class="divBtn file_elem">' + pageList[i].name + '</div>');
		pages.append(new_page);
		new_page.on("click", clickedPage);
		new_page.on("contextmenu", openPageContext);
		if(openedPageInd && i == openedPageInd.page && selectedSection == openedPageInd.section)
		{
			new_page.addClass("selected_file");
		}
	}
}

function page_init()
{
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

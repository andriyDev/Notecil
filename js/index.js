
// === State ===

var doc_display;

var printedPointerNotSupportedMsg = false;

var zooming = false;

const electron = require('electron');
const {Menu} = electron.remote;
const fs = require('fs');
const path = require('path');

function init()
{
	docevents_init();
	page_init();

	dialog_addSection_init();
	dialog_addPage_init();
	dialog_rename_init();
	dialog_duplicate_init();
	dialog_deleteSection_init();
}

function onClose()
{
	// On window close, save the page.
	savePage();
}

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("beforeunload", onClose);

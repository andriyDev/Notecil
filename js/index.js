
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


function init()
{
	docevents_init();
	page_init();

	dialog_addSection_init();
	dialog_addPage_init();
}

document.addEventListener("DOMContentLoaded", init);


var deleteSectionTarget;
var deleteSectionCallback;

function OpenDeleteSectionDialog(target, callback)
{
	deleteSectionTarget = target;
	deleteSectionCallback = callback;

	$('#deleteSectionOverlay').removeClass('hidden');
	$('#deleteSection_pages').prop('checked', true);
}

function deleteSection_ok()
{
	deleteSectionCallback($('#deleteSection_pages').prop('checked'));

	$('#deleteSectionOverlay').addClass('hidden');
}

function deleteSection_cancel()
{
	$('#deleteSectionOverlay').addClass('hidden');
}

function dialog_deleteSection_init()
{
	$('#deleteSectionOverlay').on("click", deleteSection_cancel);
	$('.deleteSectionDialog').on("click", function(){ return false; });
	$('#deleteSection_ok').on("click", deleteSection_ok);
	$('#deleteSection_cancel').on("click", deleteSection_cancel);
}


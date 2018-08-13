
var renameTarget;
var renameCallback;

function OpenRenameDialog(target, onRename)
{
	renameTarget = target;
	renameCallback = onRename;

	$('#rename_name').val(renameTarget.name);

	$('#renameOverlay').removeClass('hidden');
}

function rename_ok()
{
	renameTarget.name = $('#rename_name').val();
	renameCallback();
	$('#renameOverlay').addClass('hidden');
}

function rename_cancel()
{
	$('#renameOverlay').addClass('hidden');
}

function dialog_rename_init()
{
	$('#renameOverlay').on("click", rename_cancel);
	$('.renameDialog').on("click", function(){ return false; });
	$('#rename_ok').on("click", rename_ok);
	$('#rename_cancel').on("click", rename_cancel);
}


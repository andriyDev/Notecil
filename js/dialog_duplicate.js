
var duplicateTarget;
var duplicateCallback;

function OpenDuplicateDialog(target, callback)
{
	// Assign the vals.
	duplicateTarget = target;
	duplicateCallback = callback;
	// If we have many copies, we want to increment the copy number.
	var name = target.name;
	var name_copyRegex = new RegExp(" Copy[0-9]*$");
	var name_match = name_copyRegex.exec(target.name);
	// Is this ending in a copy number?
	if(name_match)
	{
		// Get just the number.
		var num = name_match.substring(5);
		// If the number is empty, then that counts as 1.
		if(num == "")
		{
			num = " Copy2";
		}
		else
		{
			// Otherwise, increment whatever number we got.
			num = " Copy" + (parseInt(num) + 1);
		}
		// Pull off the old copy number, and add our new one.
		name = name.substring(0, name.length - name_match.length) + num;
	}
	else
	{
		// If there was no copy number, just add the default for copy #1
		name += " Copy";
	}
	// Assign the incremented name.
	$('#duplicate_name').val(name);
	// Just get a default file name. Maybe this will be an option later? But files should be abstracted away anyway.
	$('#duplicate_file').attr('value', GetValidPageName());

	$('#duplicate_advanced').removeClass('hidden');
	$('#duplicate_fileRow').addClass('hidden');

	$('#duplicateOverlay').removeClass('hidden');
}

function duplicate_ok()
{
	// Call the callback with the new name and new file.
	duplicateCallback($('#duplicate_name').val(), $('#duplicate_file').attr('value'));
	$('#duplicateOverlay').addClass('hidden');
}

function duplicate_cancel()
{
	$('#duplicateOverlay').addClass('hidden');
}

function duplicate_advanced()
{
	$('#duplicate_fileRow').removeClass('hidden');
	$('#duplicate_advanced').addClass('hidden');
}

function dialog_duplicate_init()
{
	$('#duplicateOverlay').on("click", duplicate_cancel);
	$('.duplicateDialog').on("click", function(){ return false; });
	$('#duplicate_ok').on("click", duplicate_ok);
	$('#duplicate_cancel').on("click", duplicate_cancel);
	$('#duplicate_advanced').on("click", duplicate_advanced);
}


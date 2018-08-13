
function addSection()
{
	$('#addSectionOverlay').removeClass('hidden');
	$('#addSection_name').val("New Section");
	$('#addSection_path').attr('value', "").text("Select a path...");
	$('#addSection_ok').prop('disabled', true).addClass('dialog_btn_disabled');

	$('#addSection_advanced').removeClass('hidden');
	$('#addSection_pathRow').addClass('hidden');
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

	fs.access($('#addSection_path').attr('value'), (err) => {
		if (err)
		{
			throw err;
			// TODO: Make the dialog box have an error message.
		}
		// Add the new section to the rootList.
		rootList.push({name: $('#addSection_name').val(), path: $('#addSection_path').attr('value')});
		// Save the rootList whenever you can.
		fs.writeFile(".sections", JSON.stringify(rootList), function(err){
			if(err) throw err;
		});
		// Set the selection to the new section.
		selectedSection = rootList.length - 1;
		// Regenerate the sections to generate the new section button.
		regenSections();

		// Close the dialog box.
		$('#addSectionOverlay').addClass('hidden');
	});
}

function addSection_cancel()
{
	$('#addSectionOverlay').addClass('hidden');
}

function dialog_addSection_init()
{
    $('.sections_add').on("click", addSection);
    $('#addSectionOverlay').on("click", addSection_cancel);
    $('.addSectionDialog').on("click", function(){ return false; });
    $('#addSection_selectPath').on("click", addSection_selectPath);
    $('#addSection_ok').on("click", addSection_ok);
    $('#addSection_cancel').on("click", addSection_cancel);
}

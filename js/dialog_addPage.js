
function addPage()
{
	$('#addPageOverlay').removeClass('hidden');
	$('#addPage_name').val("New Page");

	$('#addPage_file').val(GetValidPageName());

	$('#addPage_advanced').removeClass('hidden');
	$('#addPage_fileRow').addClass('hidden');
}

function addPage_ok()
{
	var filename = $('#addPage_file').val();
	pageList.push({name: $('#addPage_name').val(), file: filename});
	var file = GetPagePath(pageList.length - 1);
	fs.access(file, fs.constants.F_OK, (err) => {
		if (err)
		{
			var buf = Buffer.alloc(4);
			buf.writeUInt32BE(0, 0);
			fs.writeFileSync(file, buf);
		}
		fs.writeFileSync(GetSectionPath(selectedSection), JSON.stringify(pageList));

		openPage(pageList.length - 1);
		regenPages();

		$('#addPageOverlay').addClass('hidden');
	});
}


function addPage_cancel()
{
	$('#addPageOverlay').addClass('hidden');
}

function addPage_advanced()
{
	$('#addPage_fileRow').removeClass('hidden');
	$('#addPage_advanced').addClass('hidden');
}

function dialog_addPage_init()
{
    $('.files_add').on("click", addPage);
	$('#addPageOverlay').on("click", addPage_cancel);
	$('.addPageDialog').on("click", function(){ return false; });
	$('#addPage_ok').on("click", addPage_ok);
	$('#addPage_cancel').on("click", addPage_cancel);
	$('#addPage_advanced').on("click", addPage_advanced);
}

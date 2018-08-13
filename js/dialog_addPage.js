
function addPage()
{
	$('#addPageOverlay').removeClass('hidden');
	$('#addPage_name').val("New Page");

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
		fn = "Page" + (Math.floor(Math.random() * 10000) + 1)
	} while (currentPages[fn]);
	$('#addPage_file').val(fn);

	$('#addPage_advanced').removeClass('hidden');
	$('#addPage_fileRow').addClass('hidden');
}

function addPage_ok()
{
	var filename = $('#addPage_file').val();
	var file = path.join(rootList[selectedSection].path, $('#addPage_file').val() + ".ncb");
	fs.access(file, fs.constants.F_OK, (err) => {
		if (err)
		{
			var buf = Buffer.alloc(4);
			buf.writeUInt32BE(0, 0);
			fs.writeFileSync(file, buf);
		}
		var sec_file = path.join(rootList[selectedSection].path, ".section");
		pageList.push({name: $('#addPage_name').val(), file: filename});
		fs.writeFileSync(sec_file, JSON.stringify(pageList));

		openPage($('#files_list').children().length);
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
	console.log("Advanced!");
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

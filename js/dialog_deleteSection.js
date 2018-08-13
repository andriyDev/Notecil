
var deleteSectionTarget;
var deleteSectionCallback;

function OpenDeleteSectionDialog(target, callback)
{
	deleteSectionTarget = target;
	deleteSectionCallback = callback;

	$('#deleteSectionOverlay').removeClass('hidden');
	$('#deleteSection_pages').prop('checked', true);
}

function context_deleteSection()
{
	OpenDeleteSectionDialog(context_target,
		(deletePages) => {
			var id = parseInt(context_target.id.substring(7));
			if(selectedSection == id)
			{
				selectedSection = -1;
			}
			var sec = GetSectionPath(id);
			if(deletePages)
			{
				// Load the page list for this section.
				fs.readFile(sec, function(err, data){
					if(err) throw err;
					// Get the page list.
					var pages = JSON.parse(data);
					for(var i = 0; i < pages.length; i++)
					{
						// Delete each file.
						fs.unlink(path.join(rootList[id].path, pages[i].file + ".ncb"),
							(err) => { if(err) throw err; });
					}
					// Unlink the section file.
					fs.unlink(sec, (err) => { if(err) throw err; });
				});
			}
			else
			{
				// Unlink the section file.
				fs.unlink(sec, (err) => { if(err) throw err; });
			}
			// Erase the listing.
			rootList.splice(id, 1);
			// Save the data.
			SaveRootList();
			// Regenerate section list.
			regenSections();
		});
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

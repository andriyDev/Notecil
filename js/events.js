
function brush_click(ev)
{
	if(ev.button != 0)
	{
		return;
	}
}

function brush_context()
{
	var t = $(this);
	$('#brush_popup').toggleClass('hidden').css({top: t.offset().top + t.height(), left: "" + t.offset().left});
}

function brush_col_changed()
{
	var t = $(this);
	var val = t.val();
	for(var i = 0; i < selectedPaths.length; i++)
	{
		selectedPaths[i].attr('stroke', val);
	}
}

function events_init()
{
	$('#toolbar_brush').on('click', brush_click);
	$('#toolbar_brush').on('contextmenu', brush_context);
	$('#brush_colour').on('input', brush_col_changed);
}


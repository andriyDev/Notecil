
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

function events_init()
{
	$('#toolbar_brush').on('click', brush_click);
	$('#toolbar_brush').on('contextmenu', brush_context);
}


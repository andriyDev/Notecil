
function select_brush(brush_id)
{
	selectedBrush = brush_id;
	$('.toolbar_brush').removeClass("selected_brush");
	if(selectedBrush != -1)
	{
		$('#brush' + brush_id).addClass("selected_brush");
	}
}

function brush_click(ev)
{
	if(ev.button != 0)
	{
		return;
	}
	select_brush(parseInt(this.id.substring(5)));
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

function regenBrushList()
{
	$('#toolbar_brush_list').empty();
	if(brushes == undefined)
	{
		return;
	}
	for(var i = 0; i < brushes.length; i++)
	{
		var b = $('<div id="brush' + i + '"class="divBtn toolbar_brush"></div>');
		$('#toolbar_brush_list').append(b);

		b.on("click", brush_click);
		b.on("contextmenu", brush_context);
	}
}

function events_init()
{
	$('#brush_colour').on('input', brush_col_changed);
}


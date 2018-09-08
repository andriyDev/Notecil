
function getConfigData()
{
	return {brushes: brushes};
}

function saveConfig()
{
	fs.writeFile("config.cfg", JSON.stringify(getConfigData()), (err) => {
		if (err) throw err;
	});
}

function setConfigData(data)
{
	brushes = data.brushes;
	regenBrushList();
}

function cfg_init(callback)
{
	fs.readFile("config.cfg", (err, data) => {
		if (err)
		{
			data = {brushes: [{colour: {r: 0, g: 0, b: 0, a: 1}, width: 5}]};
			fs.writeFile("config.cfg", JSON.stringify(data), (err) => {
				if (err) throw err;
			});
		}
		else
		{
			data = JSON.parse(data);
		}
		setConfigData(data);
	});
}

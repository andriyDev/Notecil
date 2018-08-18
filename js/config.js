
const saveConfigTO_Time = 1000;

var saveConfigTO;

function getConfigData()
{
	
}

function saveConfigNow()
{
	fs.writeFile("config.cfg", JSON.serialize(getConfigData()), (err) => {
		if (err) throw err;
	});
}

function saveConfig()
{
	if(saveConfigTO)
	{
		clearTimeout(saveConfigTO);
	}
	saveConfigTO = setTimeout(saveConfigNow, saveConfigTO_Time);
}

function setConfigData(data)
{
	brushes = data.brushes;
}

function cfg_init(callback)
{
	fs.readFile("config.cfg", function(err, data))
	{
		if (err)
		{
			data = {brushes: [{colour: "#000000", width: 5}]};
			fs.writeFile("config.cfg", JSON.serialize(data), (err) => {
				if (err) throw err;
			});
		}
		else
		{
			data = JSON.parse(data);
		}
		setConfigData(data);
	}
}


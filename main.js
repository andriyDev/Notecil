
const electron = require('electron');

const {app, BrowserWindow, Menu} = require('electron')

const fs = require('fs');

var win;
var cfg;
var cfgSaveInterval;

// Does the config file exist?
if(!fs.existsSync("config.cfg"))
{
	// If not we need to create one.
	console.log("Missing config file!");
	cfg = {window: {x: 0, y: 0, width: 800, height: 600, max: false}, configSave: 18000};
	fs.writeFileSync("config.cfg", JSON.stringify(cfg));
}
else
{
	// If the file does exist, we need to load it in.
	cfg = JSON.parse(fs.readFileSync("config.cfg"));
}

app.commandLine.appendSwitch('disable-pinch');

function saveConfig()
{
	// Update window properties
	var pos = win.getPosition();
	var size = win.getSize();
	var m = win.isMaximized();
	cfg.window.x = pos[0];
	cfg.window.y = pos[1];
	cfg.window.width = size[0];
	cfg.window.height = size[1];
	cfg.window.max = m;

	// Save the config file.
	fs.writeFile("config.cfg", JSON.stringify(cfg), (err) => {
		if (err) throw err;
	});
}

function createWindow () {

	// Create the browser window.
	win = new BrowserWindow({x: cfg.window.x, y: cfg.window.y, width: cfg.window.width, height: cfg.window.height});
	if(cfg.window.max)
	{
		win.maximize();
	}
	cfgSaveInterval = setInterval(saveConfig, cfg.configSave);

	// and load the index.html of the app.
	win.loadFile('index.html')

	win.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		win = null
	})
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (win === null) {
		createWindow()
	}
})

function open()
{
	console.log("Opened!");
}

function save()
{
}

function saveas()
{
}

const menuTemplate =
	[
		{
			label: "File",
			submenu: [
				{label: "Open", click: open},
				{label: "Save", click: save},
				{label: "Save As", click: saveas}
			]
		}
	];

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);


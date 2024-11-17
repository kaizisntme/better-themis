const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let win, settings;
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  settings = new BrowserWindow({
    width: 500,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
    },
    resizable: false,
    parent: win,
    modal: true,
    show: false,
  });

  // win.setMenu(null);
  win.loadFile("views/index.html");
  win.once("ready-to-show", () => {
    win.maximize();
  });
  settings.setMenu(null);
  settings.loadFile("views/settings.html");
  settings.on("close", (event) => {
    event.preventDefault();
    settings.hide(); // Hide the window instead of closing
  });
}

async function selectDirectory(from) {
  return dialog.showOpenDialog(win, {
    properties: ["openDirectory", "createDirectory"],
    defaultPath: from,
  });
}

ipcMain.handle("selectDir", async (data) => {
  const res = await selectDirectory(data.from);
  return res.filePaths;
});

ipcMain.handle("openConfig", async (data) => {
  settings.show();
});

ipcMain.handle("export", async (data) => {
  const result = await JSON.parse(
    fs.readFileSync(path.join(__dirname, "Judge", "results.json"))
  );
  // process the results then write to xlsx file
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

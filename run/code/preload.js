const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

contextBridge.exposeInMainWorld("config", {
  getConfig: () => {
    return JSON.parse(
      fs.readFileSync(path.join(__dirname, "../..", "accounts.json"))
    );
  },
  saveConfig: (config) => {
    fs.writeFileSync(
      path.join(__dirname, "../..", "accounts.json"),
      JSON.stringify(config, null, 2)
    );
  },
});

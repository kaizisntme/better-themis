const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx-populate");

const defaultPath = path.join(__dirname, "Judge");
const configPath = path.join(defaultPath, "config.json");
const resultPath = path.join(defaultPath, "results.json");

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
    icon: path.join(__dirname, "logo.png"),
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
  win.loadFile("html/index.html");
  settings.setMenu(null);
  settings.loadFile("html/settings.html");
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

ipcMain.handle("export", async () => {
  const data = await JSON.parse(
    fs.readFileSync(path.join(__dirname, "Judge", "results.json"))
  );
  const config = JSON.parse(fs.readFileSync(configPath));
  const testsDir = config.testdir || path.join(defaultPath, "testcases");
  const usersDir = config.usersdir || path.join(defaultPath, "users");

  const tests =
    fs
      .readdirSync(testsDir)
      .filter((file) => fs.statSync(path.join(testsDir, file)).isDirectory()) ||
    [];
  const users =
    fs
      .readdirSync(usersDir)
      .filter((file) => fs.statSync(path.join(usersDir, file)).isDirectory()) ||
    [];

  let rows = [["Thí sinh", ...tests, "Tổng điểm"]];
  for (let user of users) {
    let row = [user];
    if (!data[user]) data[user] = {};
    let total = 0;
    for (let test of tests) {
      if (data[user][test]) {
        total += data[user][test]?.point || 0;
        row.push(data[user][test]?.point || "Chưa chấm");
      } else row.push("Chưa chấm");
    }
    data[user]["total_points"] = total;
    row.push(total);
    rows.push(row);
  }

  const savePath = dialog.showSaveDialogSync(win, {
    title: "Lưu tệp kết quả",
    defaultPath: "Kết quả chấm Better Themis.xlsx",
    filters: [
      { name: "Excel Files", extensions: ["xlsx"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  console.log(savePath);

  XLSX.fromBlankAsync().then((workbook) => {
    const sheet = workbook.sheet(0);
    // General score
    sheet.name("Tổng hợp điểm");
    const r = sheet.range(
      `A1:${getNthString(tests.length + 2)}${users.length + 1}`
    );
    r.value(rows);
    r.style("fontSize", 13);
    r.style("border", "thin");
    r.style("verticalAlignment", "center");
    sheet
      .range(`A1:${getNthString(tests.length + 2)}1`)
      .style("horizontalAlignment", "center")
      .style("bold", true);
    const rr = sheet.range(
      `B2:${getNthString(tests.length + 2)}${users.length + 1}`
    );
    rr.style("numberFormat", "0.00");
    rr.style("horizontalAlignment", "right");
    const columnCount = r.endCell().columnNumber();

    for (let col = 1; col <= columnCount; col++) {
      const columnValues = r.value().map((row) => row[col - 1]);
      const newWidth = calculateColumnWidth(columnValues);
      sheet.column(col).width(newWidth);
    }

    // Score details
    workbook.addSheet("Chi tiết chấm");
    const sh = workbook.sheet(1);
    sh.cell("A1").value("Tính năng đang cập nhật!").style("fontSize", 30);
    sh.column("A").width(200);
    return workbook.toFileAsync(savePath);
  });
});

function getNthString(i) {
  let result = "";
  i--;
  while (i >= 0) {
    const charCode = (i % 26) + 65;
    result = String.fromCharCode(charCode) + result;
    i = Math.floor(i / 26) - 1;
  }
  return result;
}

function calculateColumnWidth(columnValues) {
  const scalingFactor = 1.4;
  const buffer = 2;
  let maxLength = 0;

  columnValues.forEach((value) => {
    const length = (value || "").toString().length;
    if (length > maxLength) maxLength = length;
  });

  return maxLength * scalingFactor + buffer;
}

app.whenReady().then(() => {
  createWindow();
  win.maximize();
  win.show();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  require("./server")(defaultPath, configPath, resultPath, win);
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});


const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const http = require("http");
const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const querystring = require("querystring");
const socket = require("socket.io");
const md5 = require("md5");

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
  win.loadFile("views/index.html");
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
  win.maximize();
  win.show();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

const getAccounts = () => {
  const data = fs.readFileSync(path.join(__dirname, "accounts.json"), "utf8");
  return JSON.parse(data);
};

const generateSessionId = () => Math.random().toString(36).substring(2);

const render = (filePath, data, res) => {
  fs.readFile(filePath, "utf8", (err, content) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error loading template");
      return;
    }

    const html = ejs.render(content, data);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  });
};

const sessions = {};

let admin = false;
let username = false;
const server = http.createServer(async (req, res) => {
  const accounts = getAccounts();
  const cookies = querystring.parse(req.headers.cookie || "", "; ");
  if (cookies.sessionId && sessions[cookies.sessionId]) {
    username = sessions[cookies.sessionId];
  }
  if (req.url === "/" || req.url === "/home") {
    if (!cookies.sessionId || !sessions[cookies.sessionId]) {
      res.writeHead(302, { Location: "/login" });
      res.end();
      return;
    }
    const filePath = path.join(__dirname, "web", "index.ejs");
    render(filePath, { username, admin }, res);
  } else if (req.url === "/change-password") {
    if (!cookies.sessionId || !sessions[cookies.sessionId]) {
      res.writeHead(302, { Location: "/login" });
      res.end();
      return;
    }
    const filePath = path.join(__dirname, "web", "change.ejs");
    render(filePath, { username }, res);
  } else if (req.url == "/styles.css") {
    const filePath = path.join(__dirname, "web", "styles.css");
    res.writeHead(200, { "Content-Type": "text/css" });
    res.end(fs.readFileSync(filePath));
  } else if (req.url == "/imgs/about.png") {
    const filePath = path.join(__dirname, "web", "imgs", "about.png");
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(fs.readFileSync(filePath));
  } else if (req.url == "/imgs/submit.png") {
    const filePath = path.join(__dirname, "web", "imgs", "submit.png");
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(fs.readFileSync(filePath));
  } else if (req.url == "/imgs/logout.png") {
    const filePath = path.join(__dirname, "web", "imgs", "logout.png");
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(fs.readFileSync(filePath));
  } else if (req.url == "/imgs/logo.png") {
    const filePath = path.join(__dirname, "web", "imgs", "logo.png");
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(fs.readFileSync(filePath));
  } else if (req.url === "/login" && req.method == "GET") {
    if (cookies.sessionId && sessions[cookies.sessionId]) {
      res.writeHead(302, { Location: "/" });
      res.end();
      return;
    }
    const filePath = path.join(__dirname, "web", "login.ejs");
    render(filePath, { username }, res);
  } else if (req.url === "/login" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const { username, password } = JSON.parse(
      Object.keys(querystring.parse(body))[0]
    );
    let user = accounts[username];
    if (
      !user ||
      (user.changed_pw && user.pw != md5(password)) ||
      (!user.changed_pw && user.pw != password)
    )
      user = null;
    if (user) {
      admin = user.admin || false;
      const sessionId = generateSessionId();
      sessions[sessionId] = username;
      res.writeHead(200, {
        "Set-Cookie": `sessionId=${sessionId}; HttpOnly`,
        "Content-Type": "application/json",
        Location: "/",
      });
      res.end(JSON.stringify({ sessionId: sessionId }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ sessionId: null }));
    }
  } else if (req.url === "/repass" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const { username, current_password, new_password } = JSON.parse(
      Object.keys(querystring.parse(body))[0]
    );
    let user = accounts[username];
    if (
      !user ||
      (user.changed_pw && user.pw != md5(current_password)) ||
      (!user.changed_pw && user.pw != current_password)
    )
      user = null;
    if (user) {
      user.pw = md5(new_password);
      user.changed_pw = true;
      fs.writeFileSync(
        path.join(__dirname, "accounts.json"),
        JSON.stringify(accounts)
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false }));
    }
  } else if (req.url === "/logout") {
    if (cookies.sessionId) {
      delete sessions[cookies.sessionId];
    }

    res.writeHead(302, {
      "Content-Type": "application/json",
      "Set-Cookie": "sessionId=; Max-Age=0",
      Location: "/",
    });
    res.end();
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Page not found (404)");
  }
});

const io = socket(server);
const ini = require("ini");

function readConfig(path) {
  if (fs.existsSync(path)) return ini.parse(fs.readFileSync(path, "utf-8"));
  return {};
}

io.on("connection", (socket) => {
  socket.on("submit", (data) => {
    const { username, filename, content } = data;
    if (!username || !filename || !content)
      return socket.emit("submit", { message: "Dữ liệu không hợp lệ!" });
    const config = JSON.parse(fs.readFileSync(configPath));
    const testsDir = config.testdir || path.join(defaultPath, "testcases");
    const tests =
      fs
        .readdirSync(testsDir)
        .filter((file) => fs.statSync(path.join(testsDir, file)).isDirectory())
        .map((f) => f.toLowerCase()) || [];
    const name = filename.split(".")[0];
    if (!tests.includes(name.toLowerCase()))
      return socket.emit("submit", { message: "Không tìm thấy bài" });
    const usersDir = config.usersdir || path.join(defaultPath, "users");
    const workspace = path.join(usersDir, username);
    if (!fs.existsSync(workspace)) fs.mkdirSync(workspace);
    const codePath = path.join(workspace, `${name}.cpp`);
    fs.writeFileSync(codePath, content, "utf8");
    socket.emit("submit", { message: "Nạp bài thành công!" });
    win.webContents.send("judge", { user: username, test: name });
  });
});

function getTestInfo(test) {
  const config = JSON.parse(fs.readFileSync(configPath));
  const testsDir = config.testdir || path.join(defaultPath, "testcases");
  let testList = [];
  const tests = fs.readdirSync(path.join(testsDir, test));
  for (const t of tests)
    if (t.toLowerCase().startsWith("test")) testList.push(t);
  let testConfigPath = path.join(testsDir, test, "config.cfg");
  if (!fs.existsSync(testConfigPath)) {
    let defaultConfig = {
      checker: null,
      point_per_test: 1,
      icpc: false,
      time_limit: 1000,
      memory_limit: 256,
      input_file: false,
      output_file: false,
      selected: true,
    };
    fs.writeFileSync(testConfigPath, ini.stringify(defaultConfig));
  }
  const testConfig = readConfig(testConfigPath);
  return { list: testList, config: testConfig };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Started listening on port " + PORT);
  setInterval(() => {
    const config = JSON.parse(fs.readFileSync(configPath));
    let result = JSON.parse(fs.readFileSync(resultPath));
    const testsDir = config.testdir || path.join(defaultPath, "testcases");
    const tests =
      fs
        .readdirSync(testsDir)
        .filter((file) =>
          fs.statSync(path.join(testsDir, file)).isDirectory()
        ) || [];

    const usersDir = config.usersdir || path.join(defaultPath, "users");
    const users =
      fs
        .readdirSync(usersDir)
        .filter((file) =>
          fs.statSync(path.join(usersDir, file)).isDirectory()
        ) || [];

    let configs = [];
    for (const test of tests) {
      const { list, config } = getTestInfo(test);
      configs.push({ test, list, config });
    }

    if (!admin) {
      for (const user in result) {
        for (const test in result[user]) {
          if (user != username)
            (result[user][test]["details"] = []),
              delete result[user][test]["warnings"];
        }
      }
    }

    io.emit("result", result);
    io.emit("tests", tests);
    io.emit("users", users);
    io.emit("configs", configs);
  }, 1000);
});

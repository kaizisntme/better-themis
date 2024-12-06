module.exports = (defaultPath, configPath, resultPath, win) => {
  const fs = require("fs");
  const path = require("path");
  const querystring = require("querystring");
  const md5 = require("md5");
  const multer = require("multer");
  const ini = require("ini");

  const http = require("http");
  const express = require("express");
  const app = express();
  const server = http.createServer(app);

  const socket = require("socket.io");
  const io = socket(server);

  app.set("view engine", "ejs");
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, "views")));

  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  const sessions = {};

  let admin = false;
  let username = false;

  const getAccounts = () => {
    const data = fs.readFileSync(path.join(__dirname, "accounts.json"), "utf8");
    return JSON.parse(data);
  };
  const accounts = getAccounts();

  const generateSessionId = () => Math.random().toString(36).substring(2);

  app.use((req, res, next) => {
    if (!["/", "/change-password", "/logout"].includes(req.url)) return next();
    const cookies = querystring.parse(req.headers.cookie || "", "; ");
    if (cookies.sessionId && sessions[cookies.sessionId]) {
      username = sessions[cookies.sessionId];
    }
    if (!cookies.sessionId || !sessions[cookies.sessionId]) {
      res.writeHead(302, { Location: "/login" });
      res.end();
      return;
    }
    next();
  });

  app.get("/", (req, res) => {
    res.render("index", { username, admin });
  });

  app.get("/change-password", (req, res) => {
    res.render("change", { username });
  });

  app.get("/login", (req, res) => {
    res.render("login", { username });
  });

  app.post("/login", (req, res) => {
    const { username, password } = req.body;
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
  });

  app.post("/repass", (req, res) => {
    const { username, current_password, new_password } = req.body;
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
  });

  app.post("/logout", (req, res) => {
    const { username, current_password, new_password } = req.body;
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
  });

  app.get("/logout", (req, res) => {
    const cookies = querystring.parse(req.headers.cookie || "", "; ");
    if (cookies.sessionId) {
      delete sessions[cookies.sessionId];
    }

    res.writeHead(302, {
      "Content-Type": "application/json",
      "Set-Cookie": "sessionId=; Max-Age=0",
      Location: "/",
    });
    res.end();
  });

  app.post("/submit", upload.single("file"), (req, res) => {
    const file = req.file;
    const username = req.body.username;
    const filename = file.originalname;
    const content = file.buffer.toString("utf8");
    console.log(filename, username, content);
    if (!username || !filename || !content)
      return io.emit("submit", { message: "Dữ liệu không hợp lệ!" });
    const config = JSON.parse(fs.readFileSync(configPath));
    const testsDir = config.testdir || path.join(defaultPath, "testcases");
    const tests =
      fs
        .readdirSync(testsDir)
        .filter((file) => fs.statSync(path.join(testsDir, file)).isDirectory())
        .map((f) => f.toLowerCase()) || [];
    const name = filename.split(".")[0];
    if (!tests.includes(name.toLowerCase()))
      return io.emit("submit", { message: "Không tìm thấy bài" });
    const usersDir = config.usersdir || path.join(defaultPath, "users");
    const workspace = path.join(usersDir, username);
    if (!fs.existsSync(workspace)) fs.mkdirSync(workspace);
    const codePath = path.join(workspace, `${name}.cpp`);
    fs.writeFileSync(codePath, content, "utf8");
    io.emit("submit", { message: "Nạp bài thành công!" });
    win.webContents.send("judge", { user: username, test: name });
  });

  app.get("/*", (req, res) => {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Page not found (404)");
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
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

  function readConfig(path) {
    if (fs.existsSync(path)) return ini.parse(fs.readFileSync(path, "utf-8"));
    return {};
  }

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
};

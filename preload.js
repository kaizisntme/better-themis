const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const { judge, readConfig } = require("./Judge/Judge");

contextBridge.exposeInMainWorld("versions", {
  chrome: process.versions["chrome"],
  node: process.versions["node"],
  electron: process.versions["electron"],
});

const defaultPath = path.join(__dirname, "Judge");
const configPath = path.join(defaultPath, "config.json");
const resultPath = path.join(defaultPath, "results.json");
const AppConfigPath = path.join(__dirname, "config.json");

contextBridge.exposeInMainWorld("api", {
  getResult: () => {
    const result = JSON.parse(fs.readFileSync(resultPath));
    return JSON.stringify(result);
  },
  getTests: async () => {
    const config = JSON.parse(fs.readFileSync(configPath));
    const testsDir = config.testdir || path.join(defaultPath, "testcases");
    return (
      fs
        .readdirSync(testsDir)
        .filter((file) =>
          fs.statSync(path.join(testsDir, file)).isDirectory()
        ) || []
    );
  },
  getUsers: async () => {
    const config = JSON.parse(fs.readFileSync(configPath));
    const usersDir = config.usersdir || path.join(defaultPath, "users");
    return (
      fs
        .readdirSync(usersDir)
        .filter((file) =>
          fs.statSync(path.join(usersDir, file)).isDirectory()
        ) || []
    );
  },
  getTestInfo: async (test) => {
    const ini = require("ini");
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
  },
});

contextBridge.exposeInMainWorld("events", {
  onJudge: (callback) => ipcRenderer.on("judge", callback),
});

function getTestInfo(test) {
  const config = JSON.parse(fs.readFileSync(configPath));
  const testsDir = config.testdir || path.join(defaultPath, "testcases");
  let testList = [];
  const tests = fs.readdirSync(path.join(testsDir, test));
  for (const t of tests)
    if (t.toLowerCase().startsWith("test")) testList.push(t);
  const testConfig = readConfig(path.join(testsDir, test, "config.cfg"));
  return { list: testList, config: testConfig };
}

contextBridge.exposeInMainWorld("utils", {
  selectTestDir: async () => {
    const oldConfig = fs.readFileSync(configPath);
    const path = await ipcRenderer.invoke("selectDir", {
      from: oldConfig.testdir,
    });
    if (path.length == 0 || !path[0]) return;
    const newConfig = JSON.parse(oldConfig);
    newConfig.testdir = path[0];
    fs.writeFileSync(configPath, JSON.stringify(newConfig));
  },
  selectUsersDir: async () => {
    const oldConfig = fs.readFileSync(configPath);
    const path = await ipcRenderer.invoke("selectDir", {
      from: oldConfig.usersdir,
    });
    if (path.length == 0 || !path[0]) return;
    const newConfig = JSON.parse(oldConfig);
    newConfig.usersdir = path[0];
    fs.writeFileSync(configPath, JSON.stringify(newConfig));
  },
  export: async () => {
    await ipcRenderer.invoke("export");
  },
  removePoint: async (user, test) => {
    const result = JSON.parse(fs.readFileSync(resultPath));
    if (result[user] && result[user][test]) delete result[user][test];
    fs.writeFileSync(resultPath, JSON.stringify(result));
  },
  openConfig: async () => {
    ipcRenderer.invoke("openConfig");
  },
  saveTestConfig: async (test, config) => {
    const ini = require("ini");
    const AppConfig = JSON.parse(fs.readFileSync(configPath));
    const testsDir = AppConfig.testdir || path.join(defaultPath, "testcases");
    const oldConfig = ini.parse(
      fs.readFileSync(path.join(testsDir, test, "config.cfg"), "utf-8")
    );
    if (!config.checker) config.checker = oldConfig.checker || null;
    if (!config.point_per_test)
      config.point_per_test =
        config[getTestInfo(test).list[0]].point ||
        oldConfig.point_per_test ||
        1;
    if (!config.icpc) config.icpc = oldConfig.icpc || false;
    if (!config.time_limit)
      config.time_limit =
        config[getTestInfo(test).list[0]].time_limit ||
        oldConfig.time_limit ||
        1000;
    if (!config.memory_limit)
      config.memory_limit =
        config[getTestInfo(test).list[0]].memory_limit ||
        oldConfig.memory_limit ||
        256;
    if (!config.input_file) config.input_file = oldConfig.input_file || false;
    if (!config.output_file)
      config.output_file = oldConfig.output_file || false;
    if (!config.selected && config.selected != false)
      config.selected = oldConfig.selected || true;
    const data = ini.stringify(config);
    fs.writeFileSync(path.join(testsDir, test, "config.cfg"), data);
  },
});

contextBridge.exposeInMainWorld("judge", {
  judge: async (user, test, update) => {
    const config = getTestInfo(test).config;
    if (!config.selected) return;
    await judge(user, [test.toLowerCase()], update);
  },
});

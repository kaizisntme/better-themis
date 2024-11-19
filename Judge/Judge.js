const fs = require("fs");
const path = require("path");
const pathJoin = path.join;
const ini = require("ini");

const os = process.platform;

/* GLOBAL CONFIGURATION */
let TEST_DIR = pathJoin(__dirname, "testcases");
let CHECKER_DIR = pathJoin(__dirname, "libs", "check");
let WORKSPACE_DIR = pathJoin(__dirname, "users");
let LIB_TIME = pathJoin(__dirname, "libs/time");

const config = require("./config.json");
if (config.testdir && fs.existsSync(config.testdir)) TEST_DIR = config.testdir;
if (config.checkerdir && fs.existsSync(config.checkerdir))
  CHECKER_DIR = config.checkerdir;
if (config.usersdir && fs.existsSync(config.usersdir))
  WORKSPACE_DIR = config.usersdir;
if (config.timedir && fs.existsSync(config.timedir)) LIB_TIME = config.timedir;

const { exec } = require("child_process");

function formatPath(filePath) {
  const segments = path.resolve(filePath).split(path.sep);
  segments.shift();
  let currentPath = path.sep;

  for (const segment of segments) {
    const files = fs.readdirSync(currentPath);
    const match = files.find((f) => f.toLowerCase() === segment.toLowerCase());
    if (!match) return filePath;
    currentPath = pathJoin(currentPath, match);
  }

  return currentPath;
}

if (os == "linux") {
  path.join = (...args) => {
    const joinedPath = pathJoin(...args);
    return formatPath(joinedPath);
  };
}

const RESULT_PATH = path.join(__dirname, "results.json");

function saveResults(
  warnings,
  USERNAME,
  TEST_NAME,
  CE,
  TEST_NUM,
  total_points,
  ppt,
  icpc,
  point,
  details
) {
  TEST_NAME = TEST_NAME;
  const results = JSON.parse(fs.readFileSync(RESULT_PATH));
  if (!results[USERNAME]) results[USERNAME] = {};
  if (!results[USERNAME][TEST_NAME]) results[USERNAME][TEST_NAME] = {};
  if (CE) results[USERNAME][TEST_NAME] = { error: CE };
  else
    results[USERNAME][TEST_NAME] = {
      warnings,
      total_tests: TEST_NUM,
      total_points,
      ppt,
      icpc,
      point: icpc ? (point == total_points ? point : 0) : point,
      details,
    };
  fs.writeFileSync(RESULT_PATH, JSON.stringify(results, null, 2), "utf-8");
}

function readConfig(path) {
  if (fs.existsSync(path)) return ini.parse(fs.readFileSync(path, "utf-8"));
  return {};
}

class Judge {
  constructor(username, testname, testnum, pad) {
    this.TIMEOUT = 1000;
    this.MAX_MEMORY = 256 * 1024 * 1024;
    this.CHECKER = CHECKER_DIR;

    this.WORKSPACE = path.join(WORKSPACE_DIR, username);
    this.USERNAME = username;
    this.TEST_NAME = testname;
    this.TEST_NUM = testnum;
    this.PAD = pad;

    this.AC = 0;
    this.WA = 0;
    this.TLE = 0;
    this.RTE = 0;
    this.CE = 0;
    this.MLE = 0;
    this.OLE = 0;

    this.testPath = path.join(TEST_DIR, testname);
    const config = readConfig(path.join(this.testPath, "config.cfg"));
    this.config = config;
    this.ppt = parseInt(config.point_per_test) || 1;
    this.total_points = parseInt(config.total_points) || this.TEST_NUM;
    this.icpc = config.icpc || false;
    if (config.checker && config.checker != "default")
      this.CHECKER = config.checker;
    if (parseInt(config.time_limit)) this.TIMEOUT = parseInt(config.time_limit);
    if (parseInt(config.memory_limit))
      this.MAX_MEMORY = parseInt(config.memory_limit) * 1024 * 1024;
  }

  zeropad(x) {
    return x.toString().padStart(this.PAD, "0");
  }

  compileCode(codeFile) {
    let cmd = `cd "${
      this.WORKSPACE
    }" && g++ "${codeFile}.cpp" -std=c++11 -o "${codeFile}"${
      os == "win32" ? ".exe" : ""
    } -O3 -Wall -static`;
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        resolve({ stderr, CE: error ? true : false });
      });
    });
  }

  async executeCode(codeFile, i) {
    const SIG = await new Promise((resolve, reject) => {
      exec(
        `cd "${this.WORKSPACE}" && "${path.join(this.WORKSPACE, codeFile)}"`,
        {
          shell: os == "win32" ? "cmd.exe" : "/bin/bash",
          timeout:
            parseInt(this.config[this.testNameOf(i)]?.time_limit) ||
            this.TIMEOUT,
        },
        (error, stdout, stderr) => {
          if (error) {
            console.log(JSON.stringify(error));
            resolve({
              error:
                error.signal == "SIGTERM"
                  ? "TLE"
                  : error.signal || error.code
                  ? `Exit Code: ${error.code}`
                  : "SIGUNK",
            });
          } else resolve(false);
        }
      );
    });
    if (!SIG) {
      return await new Promise((resolve, reject) => {
        exec(
          `cd "${this.WORKSPACE}" && ${LIB_TIME} -v ./${codeFile}`,
          {
            timeout:
              parseInt(this.config[this.testNameOf(i)]?.time_limit) ||
              this.TIMEOUT,
          },
          (error, stdout, stderr) => {
            let memregex = /Maximum resident set size \(kbytes\): (\d+)/;
            let timeregex = /User time \(seconds\): (\d+\.\d+)/;
            let midx = 1,
              tidx = 1;
            if (os == "win32") {
              memregex = /PeakWorkingSetSize:\s+([\d.]+)\s+(\w+)/;
              timeregex =
                /Wall time:\s+(\d+)\s+days,\s+(\d{2}):(\d{2}):([\d.]+)\s+\(([\d.]+)\s+seconds\)/;
              tidx = 5;
              midx = 1;
            }
            const memoryMatch = stderr.match(memregex);
            const timeMatch = stderr.match(timeregex);

            const memory = memoryMatch ? parseInt(memoryMatch[midx], 10) : null;
            const time = timeMatch ? parseFloat(timeMatch[tidx]) : 0;
            resolve({ memory, time });
          }
        );
      });
    } else return { error: SIG.error };
  }

  check(i, o, a) {
    return new Promise((resolve, reject) => {
      exec(`${this.CHECKER} ${i} ${o} ${a}`, (error, stderr, stdout) => {
        const res = stdout.trim().split(" ");
        if (res.includes("ok"))
          resolve({
            status: "Kết quả khớp đáp án",
            feedback: res.splice(1).join(" "),
            status_code: "AC",
          }),
            this.AC++;
        else
          resolve({
            status: "Kết quả KHÁC đáp án",
            feedback: res.join(" "),
            status_code: "WA",
          }),
            this.WA++;
      });
    });
  }

  async sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  testNameOf(i) {
    let testList = [];
    const tests = fs.readdirSync(path.join(TEST_DIR, this.TEST_NAME));
    for (const t of tests)
      if (t.toLowerCase().startsWith("test")) testList.push(t);
    return testList[i - 1];
  }

  async start(update) {
    update("Bắt đầu chấm bài");
    const compile = await this.compileCode(this.TEST_NAME);
    let warnings = null;
    if (compile.stderr) warnings = compile.stderr;
    if (compile.CE) {
      saveResults(null, this.USERNAME, this.TEST_NAME, compile.stderr);
      update("Dịch lỗi!");
      return false;
    }
    let results = [],
      point = 0;
    await new Promise(async (resolve, reject) => {
      for (let i = 1; i <= this.TEST_NUM; i++) {
        update(`Test ${i} - Đang chấm`);
        const inputPath = path.join(
          this.testPath,
          `test${this.zeropad(i)}`,
          `${this.TEST_NAME}.inp`
        );
        const outputPath = path.join(
          this.testPath,
          `test${this.zeropad(i)}`,
          `${this.TEST_NAME}.out`
        );
        const input = fs.readFileSync(inputPath);
        fs.writeFileSync(
          path.join(this.WORKSPACE, `${this.TEST_NAME}.inp`),
          input
        );
        const exe = await this.executeCode(this.TEST_NAME, i);
        if (exe.error) {
          let feedback = {
            memory: "-",
            time: "-",
            point: 0,
          };
          if (exe.error == "TLE")
            (feedback["status"] = "Chạy quá thời gian"),
              (feedback["feedback"] = ">= 1000ms");
          else
            (feedback["status"] = "Chạy sinh lỗi"),
              (feedback["feedback"] = exe.error);
          update(`Test ${i} - Chấm xong`);
          results.push(feedback);
          continue;
        }
        const { memory, time } = exe;
        let feedback = await this.check(
          inputPath,
          path.join(this.WORKSPACE, `${this.TEST_NAME}.out`),
          outputPath
        );
        feedback["memory"] = memory;
        feedback["time"] = time;
        feedback["point"] =
          feedback.status_code == "AC" && !this.icpc
            ? parseFloat(this.config[this.testNameOf(i)]?.point) ||
              this.ppt ||
              1
            : 0;
        point += feedback.point;
        update(`Test ${i} - Chấm xong`);
        results.push(feedback);
      }
      resolve();
    });
    saveResults(
      warnings,
      this.USERNAME,
      this.TEST_NAME,
      false,
      this.TEST_NUM,
      this.total_points,
      this.ppt,
      this.icpc,
      point,
      results
    );
    const files = fs.readdirSync(this.WORKSPACE);
    for (const file of files)
      if (
        !fs.lstatSync(path.join(this.WORKSPACE, file)).isDirectory() &&
        !file.toLowerCase().endsWith(".cpp") &&
        file.toLowerCase().startsWith(this.TEST_NAME.toLowerCase())
      )
        fs.unlinkSync(path.join(this.WORKSPACE, file));
    return true;
  }
}

async function judge(username, problems, update) {
  const workspace = path.join(WORKSPACE_DIR, username);
  const testspace = TEST_DIR;
  const files = fs.readdirSync(workspace);

  for (const file of files) {
    if (
      problems.length > 0 &&
      !problems.includes(file.toLowerCase().split(".")[0])
    )
      continue;
    if (!file.toLowerCase().endsWith(".cpp")) continue;
    const testname = file.split(".")[0];
    const tests = fs.readdirSync(path.join(testspace, testname));
    let testnum = 0,
      pad = 1;
    for (const test of tests) {
      if (test.toLowerCase().startsWith("test")) testnum++;
      const splited = test.toLowerCase().split("test")[1];
      pad = Math.max(splited?.length || 0, pad);
    }
    const judge = new Judge(username, testname, testnum, pad);
    await judge.start(update);
    await update("Đã chấm xong bài");
  }
}

module.exports = { Judge, judge, readConfig };

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

function loadConfig() {
  const config = require("./config.json");
  if (config.testdir && fs.existsSync(config.testdir))
    TEST_DIR = config.testdir;
  if (config.checkerdir && fs.existsSync(config.checkerdir))
    CHECKER_DIR = config.checkerdir;
  if (config.usersdir && fs.existsSync(config.usersdir))
    WORKSPACE_DIR = config.usersdir;
  if (config.timedir && fs.existsSync(config.timedir))
    LIB_TIME = config.timedir;
}

loadConfig();

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

function plus(a, b) {
  a = String(a).toString();
  b = String(b).toString();

  let [int1, frac1] = a.split(".");
  let [int2, frac2] = b.split(".");

  frac1 = frac1 || "";
  frac2 = frac2 || "";

  while (frac1.length < frac2.length) frac1 += "0";
  while (frac2.length < frac1.length) frac2 += "0";

  let carry = 0;
  let fracResult = "";
  for (let i = frac1.length - 1; i >= 0; i--) {
    let sum = parseFloat(frac1[i] || "0") + parseFloat(frac2[i] || "0") + carry;
    carry = Math.floor(sum / 10);
    fracResult = (sum % 10) + fracResult;
  }

  let intResult = "";
  let maxLength = Math.max(int1.length, int2.length);
  int1 = int1.padStart(maxLength, "0");
  int2 = int2.padStart(maxLength, "0");
  for (let i = maxLength - 1; i >= 0; i--) {
    let sum = parseFloat(int1[i]) + parseFloat(int2[i]) + carry;
    carry = Math.floor(sum / 10);
    intResult = (sum % 10) + intResult;
  }

  if (carry) intResult = carry + intResult;

  let result = intResult;
  if (fracResult.length > 0) {
    result += "." + fracResult;
  }
  return result;
}

let format = (code, test) => code;

path.join = (...args) => {
  const joinedPath = pathJoin(...args);
  return formatPath(joinedPath);
};

format = (code, test) => {
  let newcode = code.toLowerCase();
  const idx = newcode.indexOf(`${test.toLowerCase()}.inp`);
  const odx = newcode.indexOf(`${test.toLowerCase()}.out`);
  const l = `${test.toLowerCase()}.inp`.length;
  if (idx != -1)
    code = code.substring(0, idx) + `${test}.inp` + code.substring(idx + l);
  if (odx != -1)
    code = code.substring(0, odx) + `${test}.out` + code.substring(odx + l);
  return code;
};

const RESULT_PATH = path.join(__dirname, "results.json");

function saveResults(
  cmd,
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
  if (CE) results[USERNAME][TEST_NAME] = { command: cmd || null, error: CE };
  else
    results[USERNAME][TEST_NAME] = {
      command: cmd || null,
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
  constructor(username, testname, testnum, pad, tests) {
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
    this.compileCommand = "";

    this.testPath = path.join(TEST_DIR, testname);
    const config = readConfig(path.join(this.testPath, "config.cfg"));
    this.config = config;
    this.ppt = parseFloat(config.point_per_test) || 1;
    this.total_points = parseFloat(config.total_points) || this.TEST_NUM;
    this.icpc = config.icpc || false;
    if (config.checker && config.checker != "default")
      this.CHECKER = config.checker;
    if (parseFloat(config.time_limit))
      this.TIMEOUT = parseFloat(config.time_limit);
    if (parseFloat(config.memory_limit))
      this.MAX_MEMORY = parseFloat(config.memory_limit) * 1024 * 1024;
    this.running = true;
    this.tests = tests;
  }

  zeropad(x) {
    return x.toString().padStart(this.PAD, "0");
  }

  compileCode(codeFile) {
    const code_file = path.join(this.WORKSPACE, `${codeFile}.cpp`);
    let code = fs.readFileSync(`${code_file}`, "utf8");
    code = format(code, this.TEST_NAME);
    fs.writeFileSync(`${code_file}`, code, "utf8");
    let cmd = `cd ${this.WORKSPACE} ${
      os == "linux" ? `&& ulimit -s ${parseInt(this.MAX_MEMORY / 1024)}` : ""
    } && g++ "${code_file}" -std=c++14 -o "${codeFile}"${
      os == "win32" ? ".exe" : ""
    } -pipe -O3 -s -static -lm -x c++ ${
      os == "win32" ? `-Wl,--stack,${this.MAX_MEMORY}` : ""
    } -Wno-unused-result`;
    this.compileCommand = cmd;
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        resolve({ stderr, CE: error ? true : false });
      });
    });
  }

  async executeCode(codeFile, i) {
    codeFile = path.join(this.WORKSPACE, codeFile);
    const SIG = await new Promise((resolve, reject) => {
      exec(
        `cd "${this.WORKSPACE}" && "${codeFile}"`,
        {
          shell: os == "win32" ? "cmd.exe" : "/bin/bash",
          timeout:
            parseFloat(this.config[this.testNameOf(i)]?.time_limit) ||
            this.TIMEOUT,
        },
        (error, stdout, stderr) => {
          if (error) {
            console.log(JSON.stringify(error));
            resolve({
              error:
                error.signal == "SIGTERM"
                  ? "TLE"
                  : error.signal
                  ? error.signal
                  : error.code
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
          `cd "${this.WORKSPACE}" && ${LIB_TIME} -v ${codeFile}`,
          {
            timeout:
              parseFloat(this.config[this.testNameOf(i)]?.time_limit) ||
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

            const memory = memoryMatch
              ? parseFloat(memoryMatch[midx], 10)
              : null;
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
      saveResults(
        this.compileCommand,
        null,
        this.USERNAME,
        this.TEST_NAME,
        compile.stderr
      );
      update("Dịch lỗi!");
      return false;
    }
    let results = [],
      point = 0;
    await new Promise(async (resolve, reject) => {
      for (let idx = 0; idx < this.TEST_NUM; idx++) {
        if (!this.running) break;
        let i = this.tests[idx];
        update(`${i} - Đang chấm`);
        const inputPath = path.join(
          this.testPath,
          `${this.zeropad(i)}`,
          `${this.TEST_NAME}.inp`
        );
        const outputPath = path.join(
          this.testPath,
          `${this.zeropad(i)}`,
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
        // point += feedback.point;
        point = parseFloat(plus(point, feedback.point));
        update(`${i} - Chấm xong`);
        results.push(feedback);
      }
      resolve();
    });
    saveResults(
      this.compileCommand,
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

  stop() {
    this.running = false;
  }
}

async function createJudge(username, problem) {
  loadConfig();
  const tests = fs.readdirSync(path.join(TEST_DIR, problem));
  let testname = problem;
  if (os == "linux")
    testname = path.join(TEST_DIR, problem).split(path.sep).pop();
  let codePath = path.join(
    path.join(WORKSPACE_DIR, username, `${testname}.cpp`)
  );
  if (!fs.existsSync(codePath)) return null;
  if (!codePath.endsWith(".cpp")) {
    let splitted = codePath.split(".");
    splitted[splitted.length - 1] = "cpp";
    fs.renameSync(codePath, splitted.join("."));
  }
  codePath = path.join(path.join(WORKSPACE_DIR, username, `${testname}.cpp`));
  let testnum = 0,
    pad = 1;
  let Tests = [];
  for (const test of tests) {
    if (!fs.lstatSync(path.join(TEST_DIR, problem, test)).isDirectory())
      continue;
    Tests.push(test);
    if (test.toLowerCase().startsWith("test")) testnum++;
    const splited = test.toLowerCase().split("test")[1];
    pad = Math.max(splited?.length || 0, pad);
  }

  const judge = new Judge(username, testname, Tests.length, pad, Tests);
  return judge;
}

module.exports = { Judge, createJudge, readConfig };

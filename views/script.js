async function loadTest(users, tests) {
  const probs = document.getElementById("probs");
  while (probs.firstChild) probs.removeChild(probs.firstChild);
  let Users = document.createElement("th");
  Users.textContent = "Thí sinh";
  probs.appendChild(Users);
  const configs = await Promise.all(
    tests.map(async (test) => {
      const info = await window.api.getTestInfo(test);
      return info.config;
    })
  );
  tests.forEach((test, idx) => {
    const selected = configs[idx]?.selected ? "✅" : "❌";
    const th = document.createElement("th");
    th.textContent = `${selected} ${test}`;
    th.id = parseString(test);
    th.classList.add("config-element");
    th.setAttribute("data-id", parseString(test));
    th.classList.add(parseString(test).replaceAll(" ", "_"));
    probs.appendChild(th);
  });
  let total = document.createElement("th");
  total.textContent = "Tổng điểm";
  probs.appendChild(total);
  setupContextMenu2();
}

function loadUsers(users, tests) {
  const tableBody = document.querySelectorAll("table tbody")[0];
  while (tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);
  users.forEach((user) => {
    const tr = document.createElement("tr");
    const tdN = document.createElement("td");
    tdN.id = "name";
    tdN.textContent = user;
    tr.appendChild(tdN);
    tr.id = parseString(user);
    tdN.classList.add("user-element");
    tdN.setAttribute("data-id", parseString(user));
    tests.forEach((test) => {
      const td = document.createElement("td");
      td.id = `${test.replaceAll(" ", "_")}`;
      td.classList.add("target-element");
      td.setAttribute(
        "data-id",
        `${user.replaceAll(" ", "_")}:${test.replaceAll(" ", "_")}`
      );
      tr.appendChild(td);
    });
    const tdT = document.createElement("td");
    tdT.id = "total";
    tr.appendChild(tdT);
    tableBody.appendChild(tr);
  });
}

function loadResult(users, tests) {
  const data = JSON.parse(window.api.getResult());
  users.forEach((user) => {
    const userId = parseString(user);
    let total = 0;
    tests.forEach((test) => {
      const testId = parseString(test);
      const ele = document.querySelectorAll(`tr#${userId} td#${testId}`)[0];
      if (ele.textContent.includes("Test")) return;
      let point = "";
      if (data[user] && data[user][test]) point = data[user][test].point;
      total += parseFloat(point) || 0;
      point = parseFloat(point).toFixed(2);
      if (data[user] && data[user][test])
        if (!data[user][test].error) ele.textContent = `√ ${point}`;
        else ele.textContent = "ℱ Dịch lỗi";
      else ele.textContent = "𐄂 Không có bài";
    });
    document.querySelectorAll(`tr#${userId} td#total`)[0].textContent =
      parseFloat(total).toFixed(2);
  });
}

function reloadAll(users, tests) {
  loadTest(users, tests);
  loadUsers(users, tests);
  loadResult(users, tests);
}

async function reload() {
  const users = await window.api.getUsers();
  const tests = await window.api.getTests();
  reloadAll(users, tests);
  setupContextMenu();
  setupContextMenu2();
  setupContextMenu3();
}

let inqueue = [];

function setupContextMenu() {
  const targetElements = document.querySelectorAll(".target-element");
  const customMenu = document.getElementById("custom-menu");
  let clickedElement = null;

  targetElements.forEach((element) => {
    element.addEventListener("dblclick", function (e) {
      e.preventDefault();
      const [user, test] = element.getAttribute("data-id").split(":");
      loadDetail(user, test);
    });
    element.addEventListener("contextmenu", function (event) {
      event.preventDefault();
      const itemId = element.getAttribute("data-id");
      const [user, test] = itemId.split(":");
      for (let i of ["recheck", "clear"]) {
        if (inqueue.includes(`${user}:${test}`)) {
          if (
            !document.getElementById(i).classList.contains("menu-item-disabled")
          )
            document.getElementById(i).classList.add("menu-item-disabled");
        } else if (
          !!document.getElementById(i).classList.contains("menu-item-disabled")
        )
          document.getElementById(i).classList.remove("menu-item-disabled");
      }
      clickedElement = element;
      customMenu.style.display = "block";
      customMenu.style.left = `${event.pageX}px`;
      customMenu.style.top = `${event.pageY}px`;
    });
  });

  document.addEventListener("click", function (event) {
    if (event.target !== customMenu && !customMenu.contains(event.target)) {
      customMenu.style.display = "none";
    }
  });

  customMenu.addEventListener("click", function (event) {
    if (clickedElement) {
      const itemId = clickedElement.getAttribute("data-id"),
        action = event.target.getAttribute("data-action");
      if (!itemId || !action || inqueue.includes(itemId)) return;
      const [user, test] = itemId.split(":");
      if (action == "recheck") inqueue.push(itemId), rejudge(user, test);
      else if (action == "clear")
        window.utils.removePoint(user, test), reload();
      else if (action == "detail") loadDetail(user, test);
      customMenu.style.display = "none";
      clickedElement = null;
    }
  });
}

async function setupContextMenu2() {
  const targetElements = document.querySelectorAll(".config-element");
  const customMenu = document.getElementById("custom-menu2");
  let clickedElement = null;

  targetElements.forEach((element) => {
    element.addEventListener("contextmenu", function (event) {
      event.preventDefault();
      const itemId = element.getAttribute("data-id");
      for (let i of ["config", "recheck2", "clear2"]) {
        if (inqueue.includes(itemId)) {
          if (
            !document.getElementById(i).classList.contains("menu-item-disabled")
          )
            document.getElementById(i).classList.add("menu-item-disabled");
        } else if (
          !!document.getElementById(i).classList.contains("menu-item-disabled")
        )
          document.getElementById(i).classList.remove("menu-item-disabled");
      }
      clickedElement = element;
      customMenu.style.display = "block";
      customMenu.style.left = `${event.pageX}px`;
      customMenu.style.top = `${event.pageY}px`;
    });
  });

  document.addEventListener("click", function (event) {
    if (event.target !== customMenu && !customMenu.contains(event.target)) {
      customMenu.style.display = "none";
    }
  });

  customMenu.addEventListener("click", async function (event) {
    if (clickedElement) {
      const itemId = clickedElement.getAttribute("data-id"),
        action = event.target.getAttribute("data-action");
      if (!itemId || !action || inqueue.includes(itemId)) return;
      const test = itemId;
      const users = await window.api.getUsers();
      if (action == "recheck") {
        inqueue.push(test);
        for (let user of users)
          if (!inqueue.includes(`${user}:${test}`))
            inqueue.push(`${user}:${test}`), rejudge(user, test, true);
      } else if (action == "clear")
        for (let user of users) window.utils.removePoint(user, test), reload();
      else if (action == "config") loadTestConfig(test);
      customMenu.style.display = "none";
      clickedElement = null;
    }
  });
}

async function setupContextMenu3() {
  const targetElements = document.querySelectorAll(".user-element");
  const customMenu = document.getElementById("custom-menu3");
  let clickedElement = null;

  targetElements.forEach((element) => {
    element.addEventListener("contextmenu", function (event) {
      event.preventDefault();
      const itemId = element.getAttribute("data-id");
      for (let i of ["recheck3", "clear3"]) {
        if (inqueue.includes(itemId)) {
          if (
            !document.getElementById(i).classList.contains("menu-item-disabled")
          )
            document.getElementById(i).classList.add("menu-item-disabled");
        } else if (
          !!document.getElementById(i).classList.contains("menu-item-disabled")
        )
          document.getElementById(i).classList.remove("menu-item-disabled");
      }
      clickedElement = element;
      customMenu.style.display = "block";
      customMenu.style.left = `${event.pageX}px`;
      customMenu.style.top = `${event.pageY}px`;
    });
  });

  document.addEventListener("click", function (event) {
    if (event.target !== customMenu && !customMenu.contains(event.target)) {
      customMenu.style.display = "none";
    }
  });

  customMenu.addEventListener("click", async function (event) {
    if (clickedElement) {
      const itemId = clickedElement.getAttribute("data-id"),
        action = event.target.getAttribute("data-action");
      if (!itemId || !action || inqueue.includes(itemId)) return;
      const user = itemId;
      const tests = await window.api.getTests();
      if (action == "recheck") {
        inqueue.push(user);
        for (let test of tests)
          if (!inqueue.includes(`${user}:${test}`))
            inqueue.push(`${user}:${test}`), rejudge(user, test, false, true);
      } else if (action == "clear")
        for (let test of tests) window.utils.removePoint(user, test), reload();
      customMenu.style.display = "none";
      clickedElement = null;
    }
  });
}

async function rejudge(user, test, fullTest = false, fullUser = false) {
  await window.judge.judge(user, test, function (content) {
    document.querySelector(
      `tr#${user.replaceAll(" ", "_")} td#${test.replaceAll(" ", "_")}`
    ).innerHTML = content;
  });
  inqueue = inqueue.filter((item) => item !== `${user}:${test}`);
  if (fullTest) {
    const users = await window.api.getUsers();
    if (users[users.length - 1] == user)
      inqueue = inqueue.filter((item) => item !== test);
  }
  if (fullUser) {
    const tests = await window.api.getTests();
    if (tests[tests.length - 1] == test)
      inqueue = inqueue.filter((item) => item !== user);
  }
  reload();
}

async function rejudgeAll() {
  const users = await window.api.getUsers();
  const tests = await window.api.getTests();
  users.forEach((user) => {
    tests.forEach((test) => {
      rejudge(user, test);
    });
  });
}

var detailModal = new bootstrap.Modal(document.getElementById("resultsModal"), {
  keyboard: false,
});

var testConfigModal = new bootstrap.Modal(
  document.getElementById("testConfigModal"),
  {
    keyboard: false,
  }
);

function loadDetail(user, test) {
  const result = JSON.parse(window.api.getResult());
  if (!result[user] || !result[user][test]) return;
  document.getElementById("username").innerText = `${user} (${test})`;
  const details = result[user][test];
  const body = document.getElementById("body");
  const tests = document.getElementById("tests");
  const points = document.getElementById("points");
  const mode = document.getElementById("mode");
  const warnings = document.getElementById("warnings");
  warnings.scrollTop = 0;
  document.getElementsByClassName("detail-table-container")[0].scrollTop = 0;
  if (details.error) {
    warnings.textContent = details.error;
    document.getElementById("w-title").textContent = "Dịch lỗi";
    document.getElementById("sec-warnings").style.display = "block";
    detailModal.show();
    return;
  }
  if (details.warnings) {
    warnings.textContent = details.warnings;
    document.getElementById("sec-warnings").style.display = "block";
  } else document.getElementById("sec-warnings").style.display = "none";
  tests.textContent = details.total_tests;
  points.textContent = details.point;
  mode.textContent = details.icpc ? "ICPC" : "IOI";
  let content = "";
  for (let test of details.details) {
    content += `<tr>
          <td>Test ${(details.details.indexOf(test) + 1)
            .toString()
            .padStart(2, "0")}</td>
          <td>${test.status}</td>
          <td>${test.feedback}</td>
          <td>${test.memory === "-" ? "---" : `${test.memory}KB`}</td>
          <td>${test.time === "-" ? "---" : `${test.time}s`}</td>
          <td>${test.point}</td>
        </tr>`;
  }
  body.innerHTML = content;
  detailModal.show();
}

async function loadTestConfig(test) {
  const info = await window.api.getTestInfo(test);
  const tests = info.list,
    config = info.config;
  document.getElementById("inputFileName").placeholder =
    config.input_file || `${test}.INP`;
  document.getElementById("outputFileName").placeholder =
    config.output_file || `${test}.OUT`;
  document.getElementById("inputFileName").value =
    config.input_file || `${test}.INP`;
  document.getElementById("outputFileName").value =
    config.output_file || `${test}.OUT`;
  document.getElementById("testnum").textContent = tests.length;
  const body = document.getElementById("tcBody");
  while (body.firstChild) body.removeChild(body.firstChild);
  const tr = document.createElement("tr");
  const tdP = document.createElement("td");
  const inputP = document.createElement("input");
  inputP.id = "g_point";
  inputP.type = "number";
  inputP.classList.add("form-control");
  inputP.value = config.point_per_test || 1;
  tdP.appendChild(inputP);
  const tdT = document.createElement("td");
  const inputT = document.createElement("input");
  inputT.id = "g_time";
  inputT.type = "number";
  inputT.classList.add("form-control");
  inputT.value = parseFloat(config.time_limit) / 1000 || 1;
  tdT.appendChild(inputT);
  const tdM = document.createElement("td");
  const inputM = document.createElement("input");
  inputM.id = "g_memory";
  inputM.type = "number";
  inputM.classList.add("form-control");
  inputM.value = config.memory_limit || 256;
  tdM.appendChild(inputM);
  const tdN = document.createElement("td");
  tdN.textContent = "Thiết lập chung";
  tr.appendChild(tdN);
  tr.appendChild(tdP);
  tr.appendChild(tdT);
  tr.appendChild(tdM);
  body.appendChild(tr);
  let ajfakwgj = null,
    akwfjka = null,
    jawfj = null;
  for (let i in config) {
    if (!i.toLowerCase().startsWith("test") || !config[i].point) continue;
    if (!ajfakwgj) ajfakwgj = config[i].point;
    else if (ajfakwgj != config[i].point) {
      ajfakwgj = null;
      break;
    }
    if (!akwfjka) akwfjka = config[i].time_limit;
    else if (akwfjka != config[i].time_limit) {
      akwfjka = null;
      break;
    }
    if (!jawfj) jawfj = config[i].memory_limit;
    else if (jawfj != config[i].memory_limit) {
      jawfj = null;
      break;
    }
  }
  for (let i = 0; i < tests.length; i++) {
    let t = tests[i];
    const tr = document.createElement("tr");
    const tdP = document.createElement("td");
    const inputP = document.createElement("input");
    inputP.id = "point";
    inputP.type = "number";
    inputP.classList.add("form-control");
    inputP.value =
      !ajfakwgj && ajfakwgj != config[tests[i]]?.point
        ? config[tests[i]].point
        : "";
    tdP.appendChild(inputP);
    const tdT = document.createElement("td");
    const inputT = document.createElement("input");
    inputT.id = "time";
    inputT.type = "number";
    inputT.classList.add("form-control");
    inputT.value =
      !akwfjka && akwfjka != config[tests[i]]?.time_limit
        ? parseFloat(config[tests[i]].time_limit) / 1000
        : "";
    tdT.appendChild(inputT);
    const tdM = document.createElement("td");
    const inputM = document.createElement("input");
    inputM.id = "memory";
    inputM.type = "number";
    inputM.classList.add("form-control");
    inputM.value =
      !jawfj && jawfj != config[tests[i]]?.memory_limit
        ? config[tests[i]].memory_limit
        : "";
    tdM.appendChild(inputM);
    const tdN = document.createElement("td");
    tdN.textContent = t;
    tr.appendChild(tdN);
    tr.appendChild(tdP);
    tr.appendChild(tdT);
    tr.appendChild(tdM);
    body.appendChild(tr);
  }
  document
    .getElementById("saveTestConfig")
    .setAttribute("onclick", `saveTestConfig("${test}")`);

  let stdin = config.input_file,
    stdout = config.output_file;
  if (stdin)
    (document.getElementById("useStandardInput").checked = false),
      (document.getElementById("inputFileName").disabled = false);
  else
    (document.getElementById("useStandardInput").checked = true),
      (document.getElementById("inputFileName").disabled = true);
  if (stdout)
    (document.getElementById("useStandardOutput").checked = false),
      (document.getElementById("outputFileName").disabled = false);
  else
    (document.getElementById("useStandardOutput").checked = true),
      (document.getElementById("outputFileName").disabled = true);
  let checker = config.checker || "lcmp";
  document.getElementById("checkerDropdown").value = checker;
  document.getElementById("useChecker").checked = config.selected;
  document
    .getElementById("useStandardInput")
    .addEventListener("change", (e) => {
      e.preventDefault();
      if (e.target.checked)
        document.getElementById("inputFileName").disabled = true;
      else document.getElementById("inputFileName").disabled = false;
    });
  document
    .getElementById("useStandardOutput")
    .addEventListener("change", (e) => {
      e.preventDefault();
      if (e.target.checked)
        document.getElementById("outputFileName").disabled = true;
      else document.getElementById("outputFileName").disabled = false;
    });
  testConfigModal.show();
}

async function saveTestConfig(test) {
  const info = await window.api.getTestInfo(test);
  const tests = info.list;
  const g_p = document.getElementById("g_point").value;
  const g_t = document.getElementById("g_time").value;
  const g_m = document.getElementById("g_memory").value;
  if (!g_p || !g_t || !g_m) return;
  const testsConfig = {};
  const pointInputs = document.querySelectorAll("input#point");
  const timeInputs = document.querySelectorAll("input#time");
  const memInputs = document.querySelectorAll("input#memory");
  tests.forEach((t) => {
    testsConfig[t] = {};
  });
  pointInputs.forEach((i, idx) => {
    testsConfig[tests[idx]]["point"] = parseFloat(i.value) || parseFloat(g_p);
  });
  timeInputs.forEach((i, idx) => {
    testsConfig[tests[idx]]["time_limit"] =
      parseFloat(i.value) * 1000 || parseFloat(g_t) * 1000;
  });
  memInputs.forEach((i, idx) => {
    testsConfig[tests[idx]]["memory_limit"] =
      parseFloat(i.value) || parseFloat(g_m);
  });
  let stdin = document.getElementById("useStandardInput").checked;
  let stdout = document.getElementById("useStandardOutput").checked;
  if (!stdin) stdin = document.getElementById("inputFileName").value;
  else stdin = false;
  if (!stdout) stdout = document.getElementById("outputFileName").value;
  else stdout = false;
  testsConfig["input_file"] = stdin;
  testsConfig["output_file"] = stdout;
  let checker = document.getElementById("checkerDropdown").value;
  if (checker == "lcmp") checker = null;
  testsConfig["checker"] = checker;
  let selected = document.getElementById("useChecker").checked;
  testsConfig["selected"] = selected;
  window.utils.saveTestConfig(test, testsConfig);
  testConfigModal.hide();
  reload();
}

function parseString(str) {
  if (str[0] >= "0" && str[0] <= "9") str = "_N" + str;
  return str
    .replaceAll(" ", "_")
    .replaceAll(".", "DOT")
    .replaceAll("(", "OB")
    .replaceAll(")", "CB");
}

reload();
setupContextMenu();
setupContextMenu2();
setupContextMenu3();

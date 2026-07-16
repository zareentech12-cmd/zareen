/* Soft gate only — this runs in the visitor's browser, so it is not real access
   control. Real write protection is the GitHub token below, which lives only in
   this browser's localStorage and is never shipped in any file. */
const ADMIN_USER = "admin";
const ADMIN_PASS = "hbZ8-LseX-avHw";

const OWNER = "zareentech12-cmd";
const REPO = "zareen";
const BRANCH = "main";
const FILE_PATH = "data/content.json";
const TOKEN_KEY = "zareen_gh_token";
const SESSION_KEY = "zareen_admin_session";

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const tokenSetup = document.getElementById("tokenSetup");
const tokenForm = document.getElementById("tokenForm");
const editorPanels = document.getElementById("editorPanels");
const statusMsg = document.getElementById("statusMsg");
const projectsList = document.getElementById("projectsList");

let currentData = null;
let currentSha = null;

function showStatus(msg, kind) {
  statusMsg.textContent = msg;
  statusMsg.hidden = false;
  statusMsg.className = "status-msg" + (kind ? " " + kind : "");
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  if (localStorage.getItem(TOKEN_KEY)) {
    tokenSetup.hidden = true;
    editorPanels.hidden = false;
    loadContent();
  } else {
    tokenSetup.hidden = false;
    editorPanels.hidden = true;
  }
}

if (sessionStorage.getItem(SESSION_KEY) === "1") {
  showDashboard();
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    sessionStorage.setItem(SESSION_KEY, "1");
    loginError.hidden = true;
    showDashboard();
  } else {
    loginError.hidden = false;
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});

document.getElementById("forgetTokenBtn").addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  location.reload();
});

tokenForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const token = document.getElementById("ghToken").value.trim();
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    showDashboard();
  }
});

async function ghGetContent() {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) throw new Error("Couldn't load content from GitHub (" + res.status + "). Check your token.");
  const json = await res.json();
  const decoded = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ""))));
  return { data: JSON.parse(decoded), sha: json.sha };
}

async function ghPutContent(newData, sha) {
  const token = localStorage.getItem(TOKEN_KEY);
  const body = {
    message: "Update site content via admin panel",
    content: btoa(unescape(encodeURIComponent(JSON.stringify(newData, null, 2)))),
    sha,
    branch: BRANCH,
  };
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Save failed (" + res.status + ")");
  }
  return res.json();
}

async function loadContent() {
  try {
    showStatus("Loading current content…");
    const { data, sha } = await ghGetContent();
    currentData = data;
    currentSha = sha;
    populateForm(data);
    statusMsg.hidden = true;
  } catch (e) {
    showStatus(e.message, "error");
  }
}

function populateForm(data) {
  document.getElementById("f_heroEyebrow").value = data.hero?.eyebrow || "";
  document.getElementById("f_heroTitle").value = data.hero?.title || "";
  document.getElementById("f_heroLede").value = data.hero?.lede || "";
  document.getElementById("f_aboutText").value = data.about?.text || "";
  renderProjectRows(data.projects || []);
}

function renderProjectRows(projects) {
  projectsList.innerHTML = "";
  projects.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "project-row";
    row.innerHTML = `
      <div class="project-row-head">
        <span>Project ${i + 1}</span>
        <button type="button" class="remove-btn" data-i="${i}">Remove</button>
      </div>
      <label>Title<input type="text" data-field="title" data-i="${i}" value="${escapeAttr(p.title || "")}"></label>
      <label>Description<textarea rows="2" data-field="description" data-i="${i}">${escapeHtml(p.description || "")}</textarea></label>
      <div class="field-row">
        <label>Tags (comma separated)<input type="text" data-field="tags" data-i="${i}" value="${escapeAttr((p.tags || []).join(", "))}"></label>
        <label>Link<input type="text" data-field="link" data-i="${i}" value="${escapeAttr(p.link || "")}"></label>
      </div>
      <label>Thumbnail color<input type="color" data-field="color" data-i="${i}" value="${escapeAttr(p.color || "#B8843A")}"></label>
    `;
    projectsList.appendChild(row);
  });

  projectsList.querySelectorAll("[data-field]").forEach((el) => {
    el.addEventListener("input", (e) => {
      const i = Number(e.target.dataset.i);
      const field = e.target.dataset.field;
      if (field === "tags") {
        currentData.projects[i].tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
      } else {
        currentData.projects[i][field] = e.target.value;
      }
    });
  });

  projectsList.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const i = Number(e.target.dataset.i);
      currentData.projects.splice(i, 1);
      renderProjectRows(currentData.projects);
    });
  });
}

document.getElementById("addProjectBtn").addEventListener("click", () => {
  if (!currentData) return;
  currentData.projects = currentData.projects || [];
  currentData.projects.push({ title: "", description: "", tags: [], link: "#", color: "#B8843A" });
  renderProjectRows(currentData.projects);
});

document.getElementById("publishBtn").addEventListener("click", async () => {
  if (!currentData) return;
  currentData.hero = currentData.hero || {};
  currentData.hero.eyebrow = document.getElementById("f_heroEyebrow").value;
  currentData.hero.title = document.getElementById("f_heroTitle").value;
  currentData.hero.lede = document.getElementById("f_heroLede").value;
  currentData.about = currentData.about || {};
  currentData.about.text = document.getElementById("f_aboutText").value;

  try {
    showStatus("Publishing…");
    const fresh = await ghGetContent();
    const result = await ghPutContent(currentData, fresh.sha);
    currentSha = result.content.sha;
    showStatus("Published. The live site updates in a minute or two.", "ok");
  } catch (e) {
    showStatus(e.message, "error");
  }
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

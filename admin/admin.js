/* Soft gate only — this runs in the visitor's browser, so it is not real access
   control. Real write protection is the GitHub token below, which lives only in
   this browser's localStorage and is never shipped in any file.
   The password below is stored hashed (SHA-256), not in plain text, so it isn't
   readable at a glance in the page source — but it is not salted or slow-hashed,
   so treat this as a deterrent against casual viewing, not real cryptographic
   protection. Someone willing to run the hash through a cracking tool, or just
   call showDashboard() directly in devtools, can still get past it. */
const ADMIN_USER = "admin";
const ADMIN_PASS_HASH = "775692e1d98133ad6c462714650124c8d6968422959ac7205aae8d5771fd16db";

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const OWNER = "zareentech12-cmd";
const REPO = "zareen";
const BRANCH = "main";
const CONTENT_PATH = "data/content.json";
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

let currentData = null;
let currentSha = null;

function showStatus(msg, kind) {
  statusMsg.textContent = msg;
  statusMsg.hidden = false;
  statusMsg.className = "status-msg" + (kind ? " " + kind : "");
}

function showLoginIssue(msg) {
  loginError.hidden = false;
  loginError.textContent = msg;
}

/* Any uncaught error becomes visible on the page instead of a silent freeze —
   there is no other console this site's visitors would think to check. */
window.addEventListener("error", (e) => {
  const msg = "Unexpected error: " + e.message;
  if (dashboardView && !dashboardView.hidden) showStatus(msg, "error");
  else showLoginIssue(msg);
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = "Unexpected error: " + (e.reason && e.reason.message ? e.reason.message : e.reason);
  if (dashboardView && !dashboardView.hidden) showStatus(msg, "error");
  else showLoginIssue(msg);
});

function storageOk() {
  try {
    localStorage.setItem("__zareen_test__", "1");
    localStorage.removeItem("__zareen_test__");
    return true;
  } catch (e) {
    return false;
  }
}

if (!storageOk()) {
  showLoginIssue(
    "This browser is blocking local storage (common in private/incognito mode, or with strict privacy settings). Sign-in can't be kept without it — try a normal browser window."
  );
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  let hasToken = false;
  try {
    hasToken = !!localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    showStatus("Local storage is blocked, so a GitHub token can't be saved in this browser.", "error");
    return;
  }
  if (hasToken) {
    tokenSetup.hidden = true;
    editorPanels.hidden = false;
    loadContent();
  } else {
    tokenSetup.hidden = false;
    editorPanels.hidden = true;
  }
}

try {
  if (localStorage.getItem(SESSION_KEY) === "1") {
    showDashboard();
  }
} catch (e) {
  /* storageOk() above already surfaced this */
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;

  let passwordOk = false;
  try {
    passwordOk = (await sha256Hex(p)) === ADMIN_PASS_HASH;
  } catch (err) {
    showLoginIssue("This browser can't run the sign-in check. Try a recent version of Chrome, Firefox, Safari, or Edge.");
    return;
  }

  if (u === ADMIN_USER && passwordOk) {
    try {
      /* localStorage (not sessionStorage) so this browser stays signed in
         across restarts, until Log out is clicked. */
      localStorage.setItem(SESSION_KEY, "1");
    } catch (err) {
      showLoginIssue("Couldn't sign in: this browser is blocking local storage. Try a normal (non-private) window.");
      return;
    }
    loginError.hidden = true;
    showDashboard();
  } else {
    showLoginIssue("Incorrect username or password.");
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
  location.reload();
});

document.getElementById("forgetTokenBtn").addEventListener("click", () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
  location.reload();
});

tokenForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const token = document.getElementById("ghToken").value.trim();
  if (!token) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    showStatus("Couldn't save the token: this browser is blocking local storage.", "error");
    return;
  }
  showDashboard();
});

/* ---- GitHub Contents API — generic file read/write ---- */

async function ghGetFile(path) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("GitHub read failed (" + res.status + "). Check your token.");
  return res.json();
}

async function ghPutFile(path, base64Content, sha, message) {
  const token = localStorage.getItem(TOKEN_KEY);
  const body = { message, content: base64Content, branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Save failed (" + res.status + ")");
  }
  return res.json();
}

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function base64ToUtf8(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));
}

async function ghGetContent() {
  const file = await ghGetFile(CONTENT_PATH);
  if (!file) throw new Error("content.json not found in the repo.");
  return { data: JSON.parse(base64ToUtf8(file.content)), sha: file.sha };
}

async function ghPutContent(data, sha) {
  return ghPutFile(CONTENT_PATH, utf8ToBase64(JSON.stringify(data, null, 2)), sha, "Update site content via admin panel");
}

/* ---- Load + populate ---- */

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
  data.brand = data.brand || { logo: "bracket", customLogoUrl: "" };
  data.contact = data.contact || { email: "", phone: "", social: [] };
  data.hero = data.hero || { eyebrow: "", title: "", lede: "" };
  data.about = data.about || { text: "" };
  data.services = data.services || [];
  data.team = data.team || [];
  data.projects = data.projects || [];

  document.querySelectorAll('input[name="logoChoice"]').forEach((el) => {
    el.checked = el.value === data.brand.logo;
  });

  document.getElementById("f_email").value = data.contact.email || "";
  document.getElementById("f_phone").value = data.contact.phone || "";
  renderList("socialList", data.contact.social, SOCIAL_FIELDS, "Link");

  document.getElementById("f_heroEyebrow").value = data.hero.eyebrow || "";
  document.getElementById("f_heroTitle").value = data.hero.title || "";
  document.getElementById("f_heroLede").value = data.hero.lede || "";
  document.getElementById("f_aboutText").value = data.about.text || "";

  renderList("servicesList", data.services, SERVICE_FIELDS, "Service");
  renderList("teamList", data.team, TEAM_FIELDS, "Member");
  renderList("projectsList", data.projects, PROJECT_FIELDS, "Project");
}

document.querySelectorAll('input[name="logoChoice"]').forEach((el) => {
  el.addEventListener("change", (e) => {
    if (!currentData) return;
    currentData.brand.logo = e.target.value;
    currentData.brand.customLogoUrl = "";
  });
});

/* ---- Generic list editor (services, team, projects, social links) ---- */

const SOCIAL_FIELDS = [
  { key: "label", label: "Label (e.g. Upwork, GitHub)" },
  { key: "url", label: "URL" },
];
const SERVICE_FIELDS = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description", type: "textarea" },
];
const TEAM_FIELDS = [
  { key: "photo", label: "Picture", type: "image" },
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "bio", label: "Bio", type: "textarea" },
  { key: "color", label: "Avatar color (used if no picture)", type: "color" },
  { key: "github", label: "GitHub link" },
  { key: "upwork", label: "Upwork link" },
];
const PROJECT_FIELDS = [
  { key: "image", label: "Picture", type: "image" },
  { key: "title", label: "Title" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "tags", label: "Tags (comma separated)", type: "tags" },
  { key: "link", label: "Live link" },
  { key: "githubLink", label: "GitHub / source link" },
  { key: "color", label: "Thumbnail color (used if no picture)", type: "color" },
];

function assetSrc(path) {
  return path ? "../" + path : "";
}

function renderList(containerId, items, fields, itemLabel) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  items.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "project-row";
    const fieldsHtml = fields
      .map((f) => {
        if (f.type === "textarea") {
          return `<label>${f.label}<textarea rows="2" data-list="${containerId}" data-field="${f.key}" data-i="${i}">${escapeHtml(item[f.key] || "")}</textarea></label>`;
        }
        if (f.type === "color") {
          return `<label>${f.label}<input type="color" data-list="${containerId}" data-field="${f.key}" data-i="${i}" value="${escapeAttr(item[f.key] || "#B8843A")}"></label>`;
        }
        if (f.type === "image") {
          const src = assetSrc(item[f.key]);
          const preview = src ? `<img class="field-preview" src="${escapeAttr(src)}" alt="">` : "";
          return `<label>${f.label}<input type="file" accept="image/*" data-list="${containerId}" data-field="${f.key}" data-i="${i}" data-imgfield="1"></label>${preview}`;
        }
        const val = f.type === "tags" ? (item[f.key] || []).join(", ") : item[f.key] || "";
        return `<label>${f.label}<input type="text" data-list="${containerId}" data-field="${f.key}" data-i="${i}" value="${escapeAttr(val)}"></label>`;
      })
      .join("");
    row.innerHTML = `
      <div class="project-row-head">
        <span>${itemLabel} ${i + 1}</span>
        <button type="button" class="remove-btn" data-list="${containerId}" data-i="${i}">Remove</button>
      </div>
      ${fieldsHtml}`;
    container.appendChild(row);
  });

  container.querySelectorAll("[data-field]:not([data-imgfield])").forEach((el) => {
    el.addEventListener("input", (e) => {
      const i = Number(e.target.dataset.i);
      const field = e.target.dataset.field;
      if (field === "tags") {
        items[i][field] = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
      } else {
        items[i][field] = e.target.value;
      }
    });
  });

  container.querySelectorAll("[data-imgfield]").forEach((el) => {
    el.addEventListener("change", async (e) => {
      const i = Number(e.target.dataset.i);
      const field = e.target.dataset.field;
      const file = e.target.files[0];
      if (!file) return;
      showStatus("Uploading picture…");
      try {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `assets/uploads/${containerId}-${i}-${Date.now()}.${ext}`;
        const base64 = await fileToBase64(file);
        await ghPutFile(path, base64, undefined, `Upload picture for ${itemLabel.toLowerCase()} ${i + 1}`);
        items[i][field] = path;
        statusMsg.hidden = true;
        renderList(containerId, items, fields, itemLabel);
      } catch (err) {
        showStatus("Picture upload failed: " + err.message, "error");
      }
    });
  });

  container.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      items.splice(Number(e.target.dataset.i), 1);
      renderList(containerId, items, fields, itemLabel);
    });
  });
}

function blankFor(fields) {
  const obj = {};
  fields.forEach((f) => {
    obj[f.key] = f.type === "tags" ? [] : f.type === "color" ? "#B8843A" : "";
  });
  return obj;
}

document.getElementById("addSocialBtn").addEventListener("click", () => {
  if (!currentData) return;
  currentData.contact.social.push(blankFor(SOCIAL_FIELDS));
  renderList("socialList", currentData.contact.social, SOCIAL_FIELDS, "Link");
});
document.getElementById("addServiceBtn").addEventListener("click", () => {
  if (!currentData) return;
  currentData.services.push(blankFor(SERVICE_FIELDS));
  renderList("servicesList", currentData.services, SERVICE_FIELDS, "Service");
});
document.getElementById("addTeamBtn").addEventListener("click", () => {
  if (!currentData) return;
  currentData.team.push(blankFor(TEAM_FIELDS));
  renderList("teamList", currentData.team, TEAM_FIELDS, "Member");
});
document.getElementById("addProjectBtn").addEventListener("click", () => {
  if (!currentData) return;
  currentData.projects.push(blankFor(PROJECT_FIELDS));
  renderList("projectsList", currentData.projects, PROJECT_FIELDS, "Project");
});

/* ---- Logo upload ---- */

document.getElementById("logoUpload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || !currentData) return;
  const logoStatus = document.getElementById("logoStatus");
  logoStatus.hidden = false;
  logoStatus.className = "status-msg";
  logoStatus.textContent = "Uploading…";

  try {
    const ext = file.name.split(".").pop().toLowerCase();
    const path = `assets/logo-custom.${ext}`;
    const base64 = await fileToBase64(file);
    const existing = await ghGetFile(path);
    await ghPutFile(path, base64, existing ? existing.sha : undefined, "Upload custom logo");

    currentData.brand.logo = "custom";
    currentData.brand.customLogoUrl = path;
    document.querySelectorAll('input[name="logoChoice"]').forEach((el) => (el.checked = false));

    logoStatus.textContent = "Uploaded. Click \"Publish changes\" to make it live.";
    logoStatus.className = "status-msg ok";
  } catch (err) {
    logoStatus.textContent = err.message;
    logoStatus.className = "status-msg error";
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---- Publish ---- */

document.getElementById("publishBtn").addEventListener("click", async () => {
  if (!currentData) return;
  currentData.hero = currentData.hero || {};
  currentData.hero.eyebrow = document.getElementById("f_heroEyebrow").value;
  currentData.hero.title = document.getElementById("f_heroTitle").value;
  currentData.hero.lede = document.getElementById("f_heroLede").value;
  currentData.about = currentData.about || {};
  currentData.about.text = document.getElementById("f_aboutText").value;
  currentData.contact.email = document.getElementById("f_email").value;
  currentData.contact.phone = document.getElementById("f_phone").value;

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

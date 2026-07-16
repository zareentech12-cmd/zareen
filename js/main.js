document.getElementById("year").textContent = new Date().getFullYear();

const navToggle = document.getElementById("navToggle");
const siteNav = document.getElementById("siteNav");

navToggle.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

const LOGO_ASSETS = {
  bracket: { light: "assets/bracket-icon.svg", dark: "assets/bracket-icon-reversed.svg" },
  facet: { light: "assets/facet-icon.svg", dark: "assets/facet-icon-reversed.svg" },
  node: { light: "assets/node-icon.svg", dark: "assets/node-icon-reversed.svg" },
};

function applyLogo(brand) {
  const choice = (brand && brand.logo) || "bracket";
  let light, dark;
  if (choice === "custom" && brand.customLogoUrl) {
    light = dark = brand.customLogoUrl;
  } else {
    const a = LOGO_ASSETS[choice] || LOGO_ASSETS.bracket;
    light = a.light;
    dark = a.dark;
  }
  document.querySelectorAll(".logo-light").forEach((img) => (img.src = light));
  document.querySelectorAll(".logo-dark").forEach((img) => (img.src = dark));
}

function renderServices(services) {
  const grid = document.getElementById("servicesGrid");
  grid.innerHTML = "";
  if (!services || services.length === 0) {
    grid.innerHTML = '<p class="loading-note">Services coming soon.</p>';
    return;
  }
  services.forEach((s, i) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <p class="card-index">${String(i + 1).padStart(2, "0")}</p>
      <h3>${escapeHtml(s.title || "")}</h3>
      <p>${escapeHtml(s.description || "")}</p>`;
    grid.appendChild(card);
  });
}

function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function renderTeam(team) {
  const grid = document.getElementById("teamGrid");
  grid.innerHTML = "";
  if (!team || team.length === 0) {
    grid.innerHTML = '<p class="loading-note">Team coming soon.</p>';
    return;
  }
  team.forEach((m) => {
    const card = document.createElement("article");
    card.className = "team-card";
    const linkHtml = m.link ? `<a href="${escapeAttr(m.link)}" target="_blank" rel="noopener">Profile →</a>` : "";
    card.innerHTML = `
      <div class="team-avatar" style="background:${escapeAttr(m.color || "#B8843A")};">${escapeHtml(initials(m.name))}</div>
      <h3>${escapeHtml(m.name || "")}</h3>
      <p class="team-role">${escapeHtml(m.role || "")}</p>
      <p class="bio">${escapeHtml(m.bio || "")}</p>
      ${linkHtml}`;
    grid.appendChild(card);
  });
}

function renderProjects(projects) {
  const grid = document.getElementById("projectsGrid");
  grid.innerHTML = "";

  if (!projects || projects.length === 0) {
    grid.innerHTML = '<p class="loading-note">No projects yet — add one from the admin panel.</p>';
    return;
  }

  projects.forEach((p) => {
    const card = document.createElement("article");
    card.className = "project-card";
    const tags = (p.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("");
    card.innerHTML = `
      <div class="project-thumb" style="background:${escapeAttr(p.color || "#B8843A")};"></div>
      <div class="project-body">
        <h3>${escapeHtml(p.title || "Untitled project")}</h3>
        <p>${escapeHtml(p.description || "")}</p>
        <p class="tags">${tags}</p>
        <a class="project-link" href="${escapeAttr(p.link || "#")}" target="_blank" rel="noopener">View project →</a>
      </div>`;
    grid.appendChild(card);
  });

  const nextCard = document.createElement("article");
  nextCard.className = "project-card project-card-empty";
  nextCard.innerHTML = `
    <div class="project-body">
      <h3>Your next project</h3>
      <p>This slot is open. Ship something, then add it from the admin panel.</p>
    </div>`;
  grid.appendChild(nextCard);
}

function renderContact(contact) {
  const social = (contact && contact.social) || [];
  const upwork = social.find((s) => /upwork/i.test(s.label || ""));
  const email = (contact && contact.email) || "";
  const phone = (contact && contact.phone) || "";

  const navCta = document.getElementById("navCta");
  if (upwork && upwork.url) {
    navCta.href = upwork.url;
  }

  const contactUpwork = document.getElementById("contactUpwork");
  if (upwork && upwork.url) contactUpwork.href = upwork.url;

  const contactEmail = document.getElementById("contactEmail");
  if (email) {
    contactEmail.href = "mailto:" + email;
    contactEmail.textContent = email;
  }

  const contactPhone = document.getElementById("contactPhone");
  if (phone) {
    contactPhone.textContent = phone;
    contactPhone.hidden = false;
  }

  const footerLinks = document.getElementById("footerLinks");
  footerLinks.innerHTML = "";
  social.forEach((s) => {
    if (!s.label) return;
    const a = document.createElement("a");
    a.href = s.url || "#";
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = s.label;
    footerLinks.appendChild(a);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

fetch("data/content.json", { cache: "no-store" })
  .then((res) => res.json())
  .then((data) => {
    applyLogo(data.brand);

    if (data.hero) {
      if (data.hero.eyebrow) document.getElementById("heroEyebrow").textContent = data.hero.eyebrow;
      if (data.hero.title) document.getElementById("heroTitle").textContent = data.hero.title;
      if (data.hero.lede) document.getElementById("heroLede").textContent = data.hero.lede;
    }
    if (data.about && data.about.text) {
      document.getElementById("aboutText").textContent = data.about.text;
    }
    renderServices(data.services);
    renderTeam(data.team);
    renderProjects(data.projects);
    renderContact(data.contact);
  })
  .catch(() => {
    document.getElementById("projectsGrid").innerHTML =
      '<p class="loading-note">Couldn\'t load content right now.</p>';
  });

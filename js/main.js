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
    if (data.hero) {
      if (data.hero.eyebrow) document.getElementById("heroEyebrow").textContent = data.hero.eyebrow;
      if (data.hero.title) document.getElementById("heroTitle").textContent = data.hero.title;
      if (data.hero.lede) document.getElementById("heroLede").textContent = data.hero.lede;
    }
    if (data.about && data.about.text) {
      document.getElementById("aboutText").textContent = data.about.text;
    }
    renderProjects(data.projects);
  })
  .catch(() => {
    document.getElementById("projectsGrid").innerHTML =
      '<p class="loading-note">Couldn\'t load projects right now.</p>';
  });

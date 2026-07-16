try {
  var t = localStorage.getItem("zareen_theme");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch (e) {}

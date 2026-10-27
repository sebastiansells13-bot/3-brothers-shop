// Mobile menu button (below 960px the nav collapses behind it).
document.querySelector(".nav-toggle")?.addEventListener("click", (e) => {
  const open = document.body.classList.toggle("nav-open");
  e.currentTarget.setAttribute("aria-expanded", open);
});

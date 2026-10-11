export function getTheme() {
  return localStorage.getItem("cp-theme") || "system";
}

export function applyTheme(theme) {
  localStorage.setItem("cp-theme", theme);
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function initThemeListener() {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (getTheme() === "system") applyTheme("system");
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

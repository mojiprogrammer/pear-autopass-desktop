(() => {
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const searchInput = document.getElementById("search-input");
  const rows = [...document.querySelectorAll(".activity-row")];
  const emptyState = document.getElementById("empty-state");
  const dialog = document.getElementById("info-dialog");
  const dialogTitle = document.getElementById("dialog-title");
  const dialogCopy = document.getElementById("dialog-copy");
  const dialogOk = document.getElementById("dialog-ok");
const themeIcon = document.getElementById("theme-icon");
  function readTheme() {
    try { return sessionStorage.getItem("peervault-theme"); } catch { return null; }
  }
  function saveTheme(theme) {
    try { sessionStorage.setItem("peervault-theme", theme); } catch { /* Theme still works without storage. */ }
  }
  function applyTheme(theme) {
  const dark = theme === "dark";

  root.dataset.theme = dark ? "dark" : "light";

  // Change the icon based on the active theme
  if (themeIcon) {
    themeIcon.textContent = dark ? "☾" : "☼";
  }

  if (toggle) {
    toggle.setAttribute("aria-checked", String(!dark));
    toggle.setAttribute(
      "aria-label",
      dark ? "Switch to light theme" : "Switch to dark theme"
    );
    toggle.title = dark ? "Switch to light theme" : "Switch to dark theme";
  }

  saveTheme(theme);
}
  applyTheme(readTheme() === "light" ? "light" : "dark");
  toggle?.addEventListener("click", () => applyTheme(root.dataset.theme === "dark" ? "light" : "dark"));

  searchInput?.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    let count = 0;
    rows.forEach(row => {
      const match = row.textContent.toLowerCase().includes(query);
      row.hidden = !match;
      if (match) count++;
    });
    if (emptyState) emptyState.hidden = count !== 0;
    const summary = document.getElementById("save-status");
    if (summary) summary.textContent = query ? `${count} matching ${count === 1 ? "item" : "items"}` : "Your vault is up to date";
  });

  const details = {
    project: ["Project Plan", "A sample note in your recent activity. Your real vault content should be loaded by the application layer."],
    design: ["Design Assets", "A sample file entry. File previews and access permissions should be handled by your app."],
    alex: ["Alex Rivera", "A sample contact in your vault. Contact information is demonstration content."],
    team: ["Team Docs", "A sample shared item. Actual sharing depends on your peer connection and authorization."]
  };
  function showDialog(title, copy) {
    if (!dialog) return;
    dialogTitle.textContent = title;
    dialogCopy.textContent = copy;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else alert(`${title}\n\n${copy}`);
  }
  rows.forEach(row => row.addEventListener("click", () => {
    const item = details[row.dataset.entry];
    if (item) showDialog(item[0], item[1]);
  }));
  document.getElementById("learn-more-btn")?.addEventListener("click", () =>
    showDialog("Your vault, your control.", "PeerVault is designed around privacy. This dashboard is a UI preview; encryption, storage, and peer permissions must be provided by your application's data layer."));
  document.getElementById("add-entry-btn")?.addEventListener("click", () =>
    showDialog("Create a new entry", "Connect this action to your existing app.js entry-creation workflow to save a real note, file, or secure item."));
  document.getElementById("view-all-btn")?.addEventListener("click", () =>
    showDialog("Recent activity", "This preview shows four sample activity items. Connect this view to your real activity feed when the data layer is ready."));
  dialogOk?.addEventListener("click", () => dialog?.close());
  dialog?.querySelector(".dialog-close")?.addEventListener("click", () => dialog.close());

  document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item === button));
    const view = button.dataset.view;
    if (view && view !== "dashboard") {
      showDialog(button.textContent.trim(), `The ${button.textContent.trim()} view is a dashboard navigation placeholder. Connect it to your existing application routing.`);
    }
  }));

  document.getElementById("update-btn")?.addEventListener("click", () => {
    const label = document.getElementById("connection-label");
    if (label) label.textContent = "Connection status refreshed";
  });
})(); 

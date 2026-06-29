// config.js — repo-bridge config + five-state model. Pure-static, no backend.
// DEFAULT_CONFIG is the ONLY place owner identity lives. A forker edits exactly this object.
var DEFAULT_CONFIG = {
  clientId: "Iv23lijzJtw5tNZKkfNa",
  appSlug: "sundeepg98-repo-bridge",
  appName: "sundeepg98-repo-bridge",
  owner: "Sundeepg98",
  appId: "3913118",
  installationId: "136750334",
  bridgeUrl: "https://sundeepg98.github.io/repo-bridge/"
};

// Bootstrap — wired fully in later tasks. For now: mark default state, no-op otherwise.
function initConfig(win) {
  win = win || window;
  var search = (win.location && win.location.search) || "";
  if (!search || search.indexOf("id=") === -1) {
    document.documentElement.setAttribute("data-config-state", "default");
    return;
  }
  // Non-default handling added in Tasks 2-4.
  document.documentElement.setAttribute("data-config-state", "pending");
}

// Auto-run in a browser; stay completely inert under Node (window undefined) so tests can require this file.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState !== "loading") initConfig(window);
  else document.addEventListener("DOMContentLoaded", function () { initConfig(window); });
}

// Node test hook — defined functions are exported as they are added in later tasks.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFAULT_CONFIG: DEFAULT_CONFIG };
}

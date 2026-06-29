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

var CLIENT_ID_RE = /^Iv[A-Za-z0-9._-]{6,42}$/;

function isValidClientId(id) {
  return typeof id === "string" && CLIENT_ID_RE.test(id);
}

function parseQuery(search) {
  var p = new URLSearchParams(search || "");
  function g(k) { var v = p.get(k); v = v && v.trim(); return v || null; }
  return { id: g("id"), app: g("app"), name: g("name"), repo: g("repo") };
}

// verify: null = not attempted; {ok:true, clientId} = fetched; {ok:false} = failed/unavailable.
function classifyState(params, verify) {
  if (!params || !params.id) return "default";
  if (!isValidClientId(params.id)) return "invalid";
  if (params.app && verify && verify.ok) {
    return verify.clientId === params.id ? "verified" : "mismatch";
  }
  return "community";
}

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
  module.exports = { DEFAULT_CONFIG: DEFAULT_CONFIG, isValidClientId: isValidClientId, parseQuery: parseQuery, classifyState: classifyState };
}

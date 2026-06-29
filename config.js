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

function verifyApp(slug, fetchImpl) {
  var f = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!f || !slug) return Promise.resolve({ ok: false });
  return f("https://api.github.com/apps/" + encodeURIComponent(slug), {
    headers: { "Accept": "application/vnd.github+json" }
  }).then(function (r) {
    if (!r.ok) return { ok: false };
    return r.json().then(function (d) {
      return { ok: true, clientId: d.client_id || null, name: d.name || null,
               owner: (d.owner && d.owner.login) || null, htmlUrl: d.html_url || null };
    });
  }).catch(function () { return { ok: false }; });
}

// Replaced by full DOM rendering in Task 4.
function applyConfig(doc, config, state, appData) {
  (doc || document).documentElement.setAttribute("data-config-state", state);
}

function configFromParams(params) {
  return { clientId: params.id, appSlug: params.app || null, appName: null,
           name: params.name || null, repo: params.repo || null };
}

function initConfig(win) {
  win = win || window;
  var params = parseQuery((win.location && win.location.search) || "");
  var immediate = classifyState(params, null);  // default | invalid | community (pre-verify)
  if (immediate === "default") { applyConfig(document, DEFAULT_CONFIG, "default", null); return; }
  if (immediate === "invalid") { applyConfig(document, DEFAULT_CONFIG, "invalid", null); return; }
  var cfg = configFromParams(params);
  if (params.app) {
    verifyApp(params.app).then(function (v) {
      applyConfig(document, cfg, classifyState(params, v), (v && v.ok) ? v : null);
    });
  } else {
    applyConfig(document, cfg, "community", null);
  }
}

// Auto-run in a browser; stay completely inert under Node (window undefined) so tests can require this file.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState !== "loading") initConfig(window);
  else document.addEventListener("DOMContentLoaded", function () { initConfig(window); });
}

// Node test hook — defined functions are exported as they are added in later tasks.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFAULT_CONFIG: DEFAULT_CONFIG, isValidClientId: isValidClientId, parseQuery: parseQuery, classifyState: classifyState, verifyApp: verifyApp };
}

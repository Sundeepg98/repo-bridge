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

function qs(doc, sel) { return (doc || document).querySelector(sel); }
function setText(doc, sel, text) { var el = qs(doc, sel); if (el) el.textContent = text; }
function hide(doc, sel) { var el = qs(doc, sel); if (el) el.hidden = true; }
function remove(doc, sel) { var el = qs(doc, sel); if (el && el.parentNode) el.parentNode.removeChild(el); }

function setNote(doc, text, warn) {
  var note = qs(doc, "#config-note");
  if (!note) return;
  note.textContent = text;
  note.className = "config-note" + (warn ? " warn" : "");
  note.hidden = false;
}

// Shared neutral chrome for every non-default, non-invalid state.
function neutralChrome(doc, config) {
  if (typeof document !== "undefined") document.title = "repo-bridge — connect a private repo to an AI sandbox";
  setText(doc, "#eyebrow", "GitHub App · repo-bridge");
  hide(doc, "#h1-ns");                 // h1 reads just "repo-bridge"
  setText(doc, "#foot-meta", "repo-bridge");
  remove(doc, "#foot-manage");         // owner-specific install link — cardinal never
  hide(doc, "#id-appid");              // owner App ID — never for non-owner
  hide(doc, "#id-install");            // owner Installation — never for non-owner
  // Surface the VISITOR's Client ID in the app-details + both connect slots.
  var code = qs(doc, "#id-clientid-code");
  if (code) code.textContent = config.clientId;   // the Copy button copies from this node (data-copy-target)
  var slots = (doc || document).querySelectorAll(".cidslot");
  for (var i = 0; i < slots.length; i++) slots[i].textContent = config.clientId;
}

// Synchronous neutralize for the verify round-trip: hide all owner-specifics (incl. #foot-view,
// which the final render will remove for community/mismatch or restore for verified) so the owner
// showcase never flashes while verifyApp() is in flight.
function renderVerifying(doc, config) {
  neutralChrome(doc, config);
  hide(doc, "#foot-view");
  setNote(doc, "Checking this app with GitHub…", false);
  (doc || document).documentElement.setAttribute("data-config-state", "verifying");
}

function renderInvalid(doc) {
  // Fall back to the owner default showcase + a gentle notice (no chrome changes).
  setNote(doc, "That connection link looked malformed, so you're seeing the default repo-bridge page. Double-check the ?id= value.", false);
}

function renderCommunity(doc, config) {
  neutralChrome(doc, config);
  setText(doc, "#id-app-name", config.name ? ("claimed: " + config.name) : "unverified");
  remove(doc, "#foot-view");           // no verified slug -> no app link
  setNote(doc, "Unverified bridge. This page can't confirm who owns this Client ID — GitHub's authorization screen is the authority. Only continue if you trust whoever sent you this link.", false);
}

function renderVerified(doc, config, appData) {
  neutralChrome(doc, config);
  setText(doc, "#id-app-name", appData.name || "verified app");
  var view = qs(doc, "#foot-view");
  if (view && appData.htmlUrl) { view.hidden = false; view.setAttribute("href", appData.htmlUrl); }
  else if (view) { remove(doc, "#foot-view"); }
  var note = qs(doc, "#config-note");
  if (note) {
    note.textContent = "Verified against GitHub: ";
    var s = doc.createElement("span"); s.className = "cn-strong";
    s.textContent = (appData.name || "this app") + (appData.owner ? (" · @" + appData.owner) : "");
    note.appendChild(s);
    note.className = "config-note"; note.hidden = false;
  }
}

function renderMismatch(doc, config) {
  neutralChrome(doc, config);
  hide(doc, "#id-app");                 // don't lend any name credibility
  remove(doc, "#foot-view");
  setNote(doc, "Warning: this link's app slug does not match its Client ID. It may be impersonating an app. Do not authorize unless you trust the source.", true);
}

function applyConfig(doc, config, state, appData) {
  doc = doc || document;
  doc.documentElement.setAttribute("data-config-state", state);
  if (state === "default") return;                       // owner showcase stays as-is
  if (state === "invalid") { renderInvalid(doc); return; }
  if (state === "verified") { renderVerified(doc, config, appData || {}); return; }
  if (state === "mismatch") { renderMismatch(doc, config); return; }
  renderCommunity(doc, config);                          // community
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
    renderVerifying(document, cfg);   // sync: no owner-chrome flash during the round-trip
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

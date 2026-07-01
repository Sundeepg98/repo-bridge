// config.js — repo-bridge config + five-state model. Pure-static, no backend.
// DEFAULT_CONFIG is the GENERIC template default — no owner identity. It is what the bare URL
// (no ?id=) renders, so it must stay free of any owner-specific value. A forker makes the page
// theirs by editing exactly this object (clientId/appSlug/appName/owner).
var DEFAULT_CONFIG = {
  clientId: "",
  appSlug: "",
  appName: "repo-bridge",
  owner: ""
};

// OWNER_PRESET — the owner's own app, used ONLY as a documented ?id=&app= link target, NEVER for
// default chrome. The Client ID is public/opaque (it appears on GitHub's consent screen), so it is
// fine to ship in source. Operational IDs (appId / installationId) are deliberately NOT kept here —
// they were only ever rendered in the now-removed showcase rows / install link.
var OWNER_PRESET = {
  clientId: "Iv23lijzJtw5tNZKkfNa",
  appSlug: "sundeepg98-repo-bridge",
  appName: "sundeepg98-repo-bridge",
  owner: "Sundeepg98"
};

var CLIENT_ID_RE = /^Iv[A-Za-z0-9._-]{6,42}$/;

function isValidClientId(id) {
  return typeof id === "string" && CLIENT_ID_RE.test(id);
}

// The visible Client ID placeholder shown on the unconfigured default page. It MUST fail
// isValidClientId so the launch/copy guard can never hand it out as a real connect URL
// (asserted in config.test.js). index.html ships the same literal for the no-JS view.
var PLACEHOLDER_CLIENT_ID = "YOUR_CLIENT_ID";

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
  setText(doc, "#eyebrow", "Device-flow GitHub bridge");   // same string as the static eyebrow — one source
  hide(doc, "#h1-ns");                 // h1 reads just "repo-bridge"
  setText(doc, "#foot-meta", "repo-bridge");
  // Defense-in-depth: the genericize pass already removed the owner App ID / Installation rows and
  // the install link from the static bytes, so these three are null-safe no-ops today. They stay to
  // re-neutralize any future reintroduction (or an owner-branded alternate deployment).
  remove(doc, "#foot-manage");
  hide(doc, "#id-appid");
  hide(doc, "#id-install");
  // Surface the VISITOR's Client ID in the app-details + both connect slots.
  var code = qs(doc, "#id-clientid-code");
  if (code) code.textContent = config.clientId;   // the Copy button copies from this node (data-copy-target)
  var slots = (doc || document).querySelectorAll(".cidslot");
  for (var i = 0; i < slots.length; i++) slots[i].textContent = config.clientId;
}

// Synchronous "checking" state for the verify round-trip: neutral chrome + hide #foot-view (the
// final render restores it for verified, or removes it for community/mismatch) and show a checking
// note, so no premature or unverified app identity is shown while verifyApp() is in flight.
function renderVerifying(doc, config) {
  neutralChrome(doc, config);
  hide(doc, "#foot-view");
  setNote(doc, "Checking this app with GitHub…", false);
  setText(doc, "#id-app-name", "…");
  (doc || document).documentElement.setAttribute("data-config-state", "verifying");
}

function renderInvalid(doc) {
  // Malformed ?id= → leave the generic default page (already generic in the static bytes) in
  // place and add a gentle notice. No chrome changes.
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
  setText(doc, "#id-app-name", appData.name || "this app");   // was "verified app" — drop the endorsing word
  var view = qs(doc, "#foot-view");
  if (view && appData.htmlUrl) { view.hidden = false; view.setAttribute("href", appData.htmlUrl); }
  else if (view) { remove(doc, "#foot-view"); }
  var note = qs(doc, "#config-note");
  if (note) {
    var ownerLabel = appData.owner ? ("@" + appData.owner) : "its owner";
    var ident = (appData.name || "this app") + (appData.owner ? (" · @" + appData.owner) : "");
    note.textContent = "GitHub-attested identity — ";
    var s = doc.createElement("span"); s.className = "cn-strong";
    s.textContent = ident;
    note.appendChild(s);
    note.appendChild(doc.createTextNode(
      ". That confirms who registered the app, not whether it's safe to use — anyone can register one. Authorize only if you trust " + ownerLabel + "."
    ));
    note.className = "config-note"; note.hidden = false;
  }
}

function renderMismatch(doc, config) {
  neutralChrome(doc, config);
  hide(doc, "#id-app");                 // don't lend any name credibility
  remove(doc, "#foot-view");
  setNote(doc, "Warning: this link's app slug does not match its Client ID. It may be impersonating an app. Do not authorize unless you trust the source.", true);
}

// Write a Client ID (or the placeholder) into both connect-line/full-prompt .cidslot spans AND the
// app-details #id-clientid-code, then re-run the page's repo-sync so every .launch-link href is
// rebuilt from the updated prompt text. Shared by renderDefault's initial paint and the form handler.
function setClientIdEverywhere(doc, value) {
  doc = doc || document;
  setText(doc, "#id-clientid-code", value);
  var slots = doc.querySelectorAll(".cidslot");
  for (var i = 0; i < slots.length; i++) slots[i].textContent = value;
  var repo = qs(doc, "#repo-in");
  if (repo && repo.dispatchEvent && typeof Event === "function") {
    repo.dispatchEvent(new Event("input", { bubbles: true }));   // no-op before the IIFE binds its listener
  }
}

// The "Configure repo-bridge for your GitHub App" card — injected into the connect card ONLY in the
// unconfigured default state (it supersedes the old bring-your-own note). Paste a Client ID → it
// live-rewrites both connect slots (byte-identical to a ?id= link, which flips configuredCid() true
// so the existing launch/copy guards stop blocking) and reveals a shareable ?id=&app= link built
// from window.location (a fork emits a fork-domain link automatically — no baked URL). The optional
// slug feeds ONLY the share link's &app=, never the connect line. All inputs start empty and labels
// are generic, so NO owner identifier ever enters the served bytes (the must-NEVER invariant holds).
function renderConfigureForm(doc) {
  var card = qs(doc, "#connect .connect");
  if (!card) return;
  function mk(tag, attrs, text) {
    var el = doc.createElement(tag), k;
    if (attrs) for (k in attrs) if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    return el;
  }
  var form = mk("div", { id: "rb-cid-form", "class": "config-note" });
  form.appendChild(mk("p", { "class": "cn-strong" }, "Bring your own GitHub App"));
  form.appendChild(mk("p", null, "Paste your Client ID to configure this page for your app — the connect line and launch buttons go live right here, and you get a shareable link. No app yet? Follow the README to create one (Contents R/W + Metadata, Device Flow on)."));
  form.appendChild(mk("label", { "for": "rb-cid-in" }, "Client ID"));
  var cidInput = mk("input", { id: "rb-cid-in", type: "text", "class": "repo-in", placeholder: "Iv23…", autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
  form.appendChild(cidInput);
  form.appendChild(mk("label", { "for": "rb-slug-in" }, "App slug (optional)"));
  var slugInput = mk("input", { id: "rb-slug-in", type: "text", "class": "repo-in", placeholder: "your-app-slug", autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
  form.appendChild(slugInput);
  var HINT_DEFAULT = "The slug only feeds your shareable link (its ?app=) — the connect line uses the Client ID alone.";
  var hint = mk("p", { id: "rb-cid-hint", "class": "launch-note" }, HINT_DEFAULT);
  form.appendChild(hint);

  var share = mk("div", { id: "rb-share" });
  share.hidden = true;
  share.appendChild(mk("p", { "class": "rb-share-label" }, "Your shareable link"));   // not a <label for=code>: <code> is not labelable (A11y P5)
  share.appendChild(mk("code", { id: "rb-share-url" }));
  share.appendChild(mk("button", { type: "button", "class": "copy", "data-copy-target": "#rb-share-url", "aria-label": "Copy shareable link" }, "Copy link"));
  form.appendChild(share);
  card.appendChild(form);

  function onConfigInput() {
    var id = cidInput.value.trim(), slug = slugInput.value.trim(), valid = isValidClientId(id);
    setClientIdEverywhere(doc, valid ? id : PLACEHOLDER_CLIENT_ID);
    var shareUrl = qs(doc, "#rb-share-url");
    var status = qs(doc, "#copy-status");
    if (valid) {
      var base = window.location.origin + window.location.pathname.replace(/[^\/]*$/, "");
      if (shareUrl) shareUrl.textContent = base + "?id=" + encodeURIComponent(id) + (slug ? "&app=" + encodeURIComponent(slug) : "");
      var wasHidden = share.hidden;
      share.hidden = false;
      cidInput.removeAttribute("aria-invalid");
      hint.textContent = "✓ Connect line is live — copy it above, or share your link.";
      if (status && wasHidden) status.textContent = "Shareable link ready";   // A11y P9: announce once on reveal
    } else {
      share.hidden = true;
      if (id) {                                                   // non-empty but malformed
        cidInput.setAttribute("aria-invalid", "true");
        hint.textContent = "Client IDs start with Iv and are about 20 characters.";
      } else {                                                    // empty -> back to the neutral hint
        cidInput.removeAttribute("aria-invalid");
        hint.textContent = HINT_DEFAULT;
      }
    }
  }
  // Node-stub null-safety: the dependency-free test stub builds the form but its elements have no
  // addEventListener — guard so the unit tests never throw (the handler also never fires there, so
  // window.location is never touched in Node).
  if (cidInput && cidInput.addEventListener) {
    cidInput.addEventListener("input", onConfigInput);
    if (slugInput && slugInput.addEventListener) slugInput.addEventListener("input", onConfigInput);
  }
}

// Bare-URL default. The static bytes are already generic, so renderDefault only dresses the connect
// card for the unconfigured tool: it shows the placeholder Client ID (or the forker's own, if
// DEFAULT_CONFIG was edited) and, when truly unconfigured, injects the configure-your-GitHub-App card
// (§2). It NEVER touches page chrome (title/eyebrow/h1/footer) — those are correct from the static
// bytes. The launch/copy guard lives in index.html and keys off isValidClientId(), so a placeholder
// id is never handed out as a real connect URL.
function renderDefault(doc, config) {
  doc = doc || document;
  config = config || {};
  var configured = isValidClientId(config.clientId);
  setClientIdEverywhere(doc, configured ? config.clientId : PLACEHOLDER_CLIENT_ID);
  setText(doc, "#id-app-name", configured ? (config.appName || "") : "");
  // MF-3: hide the empty "APP" row on the unconfigured bare URL — only show it when a real app
  // name is actually configured. (community/verified always set a name; mismatch hides it already.)
  var appRow = qs(doc, "#id-app");
  if (appRow) appRow.hidden = !(configured && config.appName);
  if (!configured) {
    // MF-1: the static lead promises "just name your repo," but on the bare URL the connect line is
    // inert until a Client ID is set. Reframe the unconfigured lead as setup-first. (The configured
    // ?id= states never reach this branch, so their static consumer copy stays intact.)
    setText(doc, "#connect-lead",
      "Point this page at your own GitHub App once (below), then drop a single line into any AI " +
      "chat you're already in — it fetches the device-flow steps and runs them. Just name your repo.");
    if (!qs(doc, "#rb-cid-in")) {   // idempotence: the form's own marker (mirrors the old #default-note guard)
      renderConfigureForm(doc);
    }
  }
}

function applyConfig(doc, config, state, appData) {
  doc = doc || document;
  doc.documentElement.setAttribute("data-config-state", state);
  if (state === "default") { renderDefault(doc, config); return; }
  if (state === "invalid") { renderDefault(doc, config); renderInvalid(doc); return; }
  if (state === "verified") { renderVerified(doc, config, appData || {}); return; }
  if (state === "mismatch") { renderMismatch(doc, config); return; }
  renderCommunity(doc, config);                          // community
}

function configFromParams(params) {
  return { clientId: params.id, name: params.name || null };
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

// config.js is loaded at end-of-body — every element initConfig touches is already parsed,
// so run immediately (before first paint) to neutralize non-owner configs without a flash.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  initConfig(window);
}

// Node test hook — defined functions are exported as they are added in later tasks.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFAULT_CONFIG: DEFAULT_CONFIG, OWNER_PRESET: OWNER_PRESET, PLACEHOLDER_CLIENT_ID: PLACEHOLDER_CLIENT_ID, isValidClientId: isValidClientId, parseQuery: parseQuery, classifyState: classifyState, verifyApp: verifyApp, renderDefault: renderDefault };
}

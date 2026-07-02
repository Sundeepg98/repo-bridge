const test = require("node:test");
const assert = require("node:assert");
const { DEFAULT_CONFIG, DEMO_PRESET, PLACEHOLDER_CLIENT_ID, isValidClientId, parseQuery, classifyState, verifyApp, renderDefault, launchState } = require("./docs/config.js");

test("isValidClientId accepts a real GitHub App client id", () => {
  assert.strictEqual(isValidClientId("Iv23lijzJtw5tNZKkfNa"), true);
  assert.strictEqual(isValidClientId("Iv1abcdef0123"), true);
});
test("isValidClientId rejects junk, wrong prefix, HTML metachars, and non-strings", () => {
  assert.strictEqual(isValidClientId(""), false);
  assert.strictEqual(isValidClientId("xx23lijzJtw5tNZKkfNa"), false);
  assert.strictEqual(isValidClientId("Iv12"), false);                 // too short
  assert.strictEqual(isValidClientId("Iv23<script>alert(1)</script>"), false);
  assert.strictEqual(isValidClientId(null), false);
  assert.strictEqual(isValidClientId(12345), false);
});
test("parseQuery extracts and trims the four params, null for absent", () => {
  const p = parseQuery("?id=Iv23lijzJtw5tNZKkfNa&app=my-app&name=My%20App&repo=me/proj");
  assert.deepStrictEqual(p, { id:"Iv23lijzJtw5tNZKkfNa", app:"my-app", name:"My App", repo:"me/proj" });
  assert.deepStrictEqual(parseQuery(""), { id:null, app:null, name:null, repo:null });
  assert.strictEqual(parseQuery("?id=%20%20").id, null);              // whitespace-only -> null
});
test("classifyState: no id -> default", () => {
  assert.strictEqual(classifyState({ id:null }, null), "default");
});
test("classifyState: malformed id -> invalid", () => {
  assert.strictEqual(classifyState({ id:"nope" }, null), "invalid");
});
test("classifyState: valid id, no app slug -> community", () => {
  assert.strictEqual(classifyState({ id:"Iv23lijzJtw5tNZKkfNa", app:null }, null), "community");
});
test("classifyState: valid id + app, verify unavailable -> community", () => {
  assert.strictEqual(classifyState({ id:"Iv23lijzJtw5tNZKkfNa", app:"a" }, { ok:false }), "community");
});
test("classifyState: app verify client_id matches -> verified", () => {
  assert.strictEqual(classifyState({ id:"Iv23lijzJtw5tNZKkfNa", app:"a" }, { ok:true, clientId:"Iv23lijzJtw5tNZKkfNa" }), "verified");
});
test("classifyState: app verify client_id mismatches -> mismatch", () => {
  assert.strictEqual(classifyState({ id:"Iv23lijzJtw5tNZKkfNa", app:"a" }, { ok:true, clientId:"IvDIFFERENT0000" }), "mismatch");
});
test("verifyApp returns ok + parsed fields on a 200 with client_id", async () => {
  const fakeFetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({
    client_id: "Iv23Xexample0000", name: "My App", owner: { login: "me" }, html_url: "https://github.com/apps/my-app"
  }) });
  assert.deepStrictEqual(await verifyApp("my-app", fakeFetch), {
    ok: true, clientId: "Iv23Xexample0000", name: "My App", owner: "me", htmlUrl: "https://github.com/apps/my-app"
  });
});
test("verifyApp returns {ok:false} on a non-200 response", async () => {
  assert.deepStrictEqual(await verifyApp("x", () => Promise.resolve({ ok: false })), { ok: false });
});
test("verifyApp returns {ok:false} when the fetch rejects (network error)", async () => {
  assert.deepStrictEqual(await verifyApp("x", () => Promise.reject(new Error("network"))), { ok: false });
});
test("verifyApp returns {ok:false} when slug is missing", async () => {
  assert.deepStrictEqual(await verifyApp(null, () => Promise.resolve({ ok: true })), { ok: false });
});
// Fork-parametric identity tests (red-team fix 12): assert SHAPE, not the author's literals, so a
// personalized fork that follows the README passes `node --test` unchanged. The load-bearing
// invariants stay literal: operational IDs (appId/installationId) never ship, and the placeholder
// never validates. (The OWNER_PRESET test block was deleted with OWNER_PRESET itself — fix 16.)
test("DEFAULT_CONFIG: template-generic OR a fork's own app — string shape, clientId empty-or-valid, no operational IDs", () => {
  ["clientId", "appSlug", "appName", "owner"].forEach(function (k) {
    assert.strictEqual(typeof DEFAULT_CONFIG[k], "string", k + " must be a string");
  });
  assert.ok(DEFAULT_CONFIG.clientId === "" || isValidClientId(DEFAULT_CONFIG.clientId),
    "clientId must be \"\" (unconfigured template) or a valid Iv… Client ID (personalized fork)");
  assert.ok(DEFAULT_CONFIG.appName.length > 0, "appName must be non-empty (it labels the page)");
  assert.ok(!("appId" in DEFAULT_CONFIG), "DEFAULT_CONFIG must never carry an App ID");
  assert.ok(!("installationId" in DEFAULT_CONFIG), "DEFAULT_CONFIG must never carry an Installation ID");
});
test("DEMO_PRESET: null (fork-safe) OR a public demo-app shape — never an owner handle or operational IDs", () => {
  if (DEMO_PRESET != null) {
    assert.ok(isValidClientId(DEMO_PRESET.clientId), "DEMO_PRESET.clientId must be a valid Iv… Client ID");
    assert.strictEqual(typeof DEMO_PRESET.appSlug, "string", "DEMO_PRESET.appSlug must be a string");
    assert.ok(DEMO_PRESET.appSlug.length > 0, "DEMO_PRESET.appSlug must be non-empty (the demo link's &app= needs it)");
    assert.ok(!("owner" in DEMO_PRESET), "no owner handle — @owner is runtime-fetched, never baked");
    assert.ok(!("appId" in DEMO_PRESET) && !("installationId" in DEMO_PRESET), "no operational IDs");
  }
  // DEMO ≠ OWNER, folded from the deleted OWNER_PRESET cross-check (fix 16): the demo must always be
  // a dedicated PUBLIC demo app, never anyone's personal app. With OWNER_PRESET gone there is no
  // owner Client ID left in config.js to collide with — the invariant is structural now.
});
test("PLACEHOLDER_CLIENT_ID can never validate as a real Client ID (launch/copy guard hinge)", () => {
  assert.strictEqual(PLACEHOLDER_CLIENT_ID, "YOUR_CLIENT_ID");
  assert.strictEqual(isValidClientId(PLACEHOLDER_CLIENT_ID), false);   // if this ever passes, the guard breaks silently
});

// --- launchState coverage -----------------------------------------------------------------
// launchState is the pure launcher-gate decision extracted from index.html syncRepo: it decides
// whether the launch buttons get a live href (ready) — i.e. whether the connect prompt + Client ID
// gets baked into a launch URL — and which label copy shows (reason). The SECURITY invariant is that
// state 'mismatch' ALWAYS forces not-ready, even with a valid cid + repo present.
test("launchState: default state, no cid, no repo -> not ready, no-cid", () => {
  assert.deepStrictEqual(launchState({ state: "default", cid: false, repo: "" }), { ready: false, reason: "no-cid" });
});
test("launchState: community with cid + repo -> ready", () => {
  assert.deepStrictEqual(launchState({ state: "community", cid: true, repo: "me/proj" }), { ready: true, reason: "ready" });
});
test("launchState: SECURITY — mismatch with cid + repo can NEVER re-enable the launcher", () => {
  assert.deepStrictEqual(launchState({ state: "mismatch", cid: true, repo: "me/proj" }), { ready: false, reason: "mismatch" });
});
test("launchState: cid but empty repo -> not ready, no-repo", () => {
  assert.deepStrictEqual(launchState({ state: "community", cid: true, repo: "" }), { ready: false, reason: "no-repo" });
});
test("launchState: invalid state (broken ?id=) with a repo but no cid -> no-cid, never launches", () => {
  assert.deepStrictEqual(launchState({ state: "invalid", cid: false, repo: "me/proj" }), { ready: false, reason: "no-cid" });
});
test("launchState: verified launches like community (only mismatch is special)", () => {
  assert.deepStrictEqual(launchState({ state: "verified", cid: true, repo: "me/proj" }), { ready: true, reason: "ready" });
});
test("launchState: mismatch precedence — flagged wins even with no cid and no repo", () => {
  assert.deepStrictEqual(launchState({ state: "mismatch", cid: false, repo: "" }), { ready: false, reason: "mismatch" });
});
test("launchState: a whitespace-only repo counts as no repo", () => {
  assert.deepStrictEqual(launchState({ state: "community", cid: true, repo: "   " }), { ready: false, reason: "no-repo" });
});

// --- renderDefault coverage ---------------------------------------------------------------
// Minimal, dependency-free DOM stub (NO jsdom) implementing only the operations renderDefault
// touches: querySelector / querySelectorAll / createElement / textContent / appendChild. This
// keeps the suite 100% dependency-free; the trade-off vs jsdom is that we model only what the
// function under test actually exercises (sufficient — renderDefault touches a small fixed set).
function makeStubDoc() {
  function el(tag) {
    return {
      tag: tag, className: "", id: "", children: [], _text: "", attrs: {}, dataset: {}, hidden: false,
      get textContent() { return this._text; },
      set textContent(v) { this._text = v; },
      // Blocker 2: the configure form is built with setAttribute (incl. id/class/data-copy-target).
      setAttribute: function (k, v) { this.attrs[k] = v; if (k === "id") this.id = v; if (k === "class") this.className = v; },
      getAttribute: function (k) { return this.attrs.hasOwnProperty(k) ? this.attrs[k] : null; },
      appendChild: function (c) { this.children.push(c); return c; },
      insertBefore: function (c, ref) { var i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; },
      get firstChild() { return this.children.length ? this.children[0] : null; }
    };
  }
  var clientCode = el("code"); clientCode.id = "id-clientid-code";
  var appName = el("code"); appName.id = "id-app-name";
  var cidA = el("span"); cidA.className = "cidslot";
  var cidB = el("span"); cidB.className = "cidslot";
  var card = el("div"); card.className = "connect";
  var byId = { "#id-clientid-code": clientCode, "#id-app-name": appName, "#connect .connect": card };
  function findById(node, id) {                 // search the injected form subtree by id
    for (var i = 0; i < node.children.length; i++) {
      if (node.children[i].id === id) return node.children[i];
      var deep = findById(node.children[i], id);
      if (deep) return deep;
    }
    return null;
  }
  var doc = {
    createElement: el,
    createTextNode: function (t) { return { nodeType: 3, textContent: t, id: "", children: [], _text: t }; },
    querySelectorAll: function (sel) { return sel === ".cidslot" ? [cidA, cidB] : []; },
    // Note: NO "#repo-in" node — so setClientIdEverywhere's dispatch is skipped in Node (window untouched).
    querySelector: function (sel) {
      if (byId[sel]) return byId[sel];
      if (sel.charAt(0) === "#") return findById(card, sel.slice(1));
      return null;
    }
  };
  return { doc: doc, clientCode: clientCode, appName: appName, cidslots: [cidA, cidB], card: card,
           q: function (sel) { return doc.querySelector(sel); } };
}

// Explicit UNCONFIGURED fixture for the renderDefault behavior tests (red-team fix 12): feeding the
// LIVE DEFAULT_CONFIG here re-coupled the suite to the template literal — on a personalized fork
// (valid clientId) renderDefault correctly skips the configure form and these behavior tests broke.
// The unconfigured BRANCH is what's under test, so pin the branch's input, not the shipped config.
var UNCONFIGURED = { clientId: "", appSlug: "", appName: "repo-bridge", owner: "" };

test("renderDefault (unconfigured): placeholder in app-details + both connect slots, app name empty, configure form present (share hidden)", () => {
  var h = makeStubDoc();
  renderDefault(h.doc, UNCONFIGURED);                         // clientId === "" -> unconfigured
  assert.strictEqual(h.clientCode.textContent, PLACEHOLDER_CLIENT_ID);
  assert.strictEqual(h.cidslots[0].textContent, PLACEHOLDER_CLIENT_ID);
  assert.strictEqual(h.cidslots[1].textContent, PLACEHOLDER_CLIENT_ID);
  assert.strictEqual(h.appName.textContent, "");
  assert.ok(h.q("#rb-cid-form"), "configure form present when unconfigured");
  assert.ok(h.q("#rb-cid-in"), "Client ID input present");
  assert.ok(h.q("#rb-share-url"), "share-url node present");
  assert.strictEqual(h.q("#rb-share").hidden, true, "share block hidden until a valid id is entered");
});
test("renderDefault (forker edited DEFAULT_CONFIG to a real id): shows real id + appName, NO configure form", () => {
  var h = makeStubDoc();
  renderDefault(h.doc, { clientId: "Iv23forkerExample00", appName: "forker-bridge" });
  assert.strictEqual(h.clientCode.textContent, "Iv23forkerExample00");
  assert.strictEqual(h.cidslots[0].textContent, "Iv23forkerExample00");
  assert.strictEqual(h.appName.textContent, "forker-bridge");
  assert.strictEqual(h.q("#rb-cid-in"), null, "no configure form once a real Client ID is configured");
});
test("renderDefault is idempotent — a second call does not double-inject the form", () => {
  var h = makeStubDoc();
  renderDefault(h.doc, UNCONFIGURED);
  renderDefault(h.doc, UNCONFIGURED);
  var forms = h.card.children.filter(function (c) { return c.id === "rb-cid-form"; });
  assert.strictEqual(forms.length, 1, "exactly one configure form after a repeat call");
});

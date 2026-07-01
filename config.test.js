const test = require("node:test");
const assert = require("node:assert");
const { DEFAULT_CONFIG, OWNER_PRESET, PLACEHOLDER_CLIENT_ID, isValidClientId, parseQuery, classifyState, verifyApp, renderDefault, launchState } = require("./docs/config.js");

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
test("DEFAULT_CONFIG is the generic template default — no owner identifiers in the served default", () => {
  assert.strictEqual(DEFAULT_CONFIG.clientId, "");
  assert.strictEqual(DEFAULT_CONFIG.owner, "");
  assert.strictEqual(DEFAULT_CONFIG.appSlug, "");
  assert.strictEqual(DEFAULT_CONFIG.appName, "repo-bridge");   // the one owner-identifier-capable field — pin it generic
  assert.ok(!("appId" in DEFAULT_CONFIG), "DEFAULT_CONFIG must not carry the owner App ID");
  assert.ok(!("installationId" in DEFAULT_CONFIG), "DEFAULT_CONFIG must not carry the owner Installation ID");
});
test("OWNER_PRESET holds the owner's public Client ID for ?id= links, but no operational IDs", () => {
  assert.strictEqual(OWNER_PRESET.clientId, "Iv23lijzJtw5tNZKkfNa");
  assert.ok(!("appId" in OWNER_PRESET), "OWNER_PRESET must not carry the owner App ID");
  assert.ok(!("installationId" in OWNER_PRESET), "OWNER_PRESET must not carry the owner Installation ID");
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

test("renderDefault (unconfigured): placeholder in app-details + both connect slots, app name empty, configure form present (share hidden)", () => {
  var h = makeStubDoc();
  renderDefault(h.doc, DEFAULT_CONFIG);                       // clientId === "" -> unconfigured
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
  renderDefault(h.doc, DEFAULT_CONFIG);
  renderDefault(h.doc, DEFAULT_CONFIG);
  var forms = h.card.children.filter(function (c) { return c.id === "rb-cid-form"; });
  assert.strictEqual(forms.length, 1, "exactly one configure form after a repeat call");
});

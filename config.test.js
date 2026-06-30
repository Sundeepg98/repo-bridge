const test = require("node:test");
const assert = require("node:assert");
const { DEFAULT_CONFIG, OWNER_PRESET, isValidClientId, parseQuery, classifyState, verifyApp } = require("./config.js");

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
  assert.ok(!("appId" in DEFAULT_CONFIG), "DEFAULT_CONFIG must not carry the owner App ID");
  assert.ok(!("installationId" in DEFAULT_CONFIG), "DEFAULT_CONFIG must not carry the owner Installation ID");
});
test("OWNER_PRESET holds the owner's public Client ID for ?id= links, but no operational IDs", () => {
  assert.strictEqual(OWNER_PRESET.clientId, "Iv23lijzJtw5tNZKkfNa");
  assert.ok(!("appId" in OWNER_PRESET), "OWNER_PRESET must not carry the owner App ID");
  assert.ok(!("installationId" in OWNER_PRESET), "OWNER_PRESET must not carry the owner Installation ID");
});

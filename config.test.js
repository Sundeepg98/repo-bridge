const test = require("node:test");
const assert = require("node:assert");
const { isValidClientId, parseQuery, classifyState } = require("./config.js");

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

const test = require("node:test");
const assert = require("node:assert");
const { PROVIDERS } = require("./docs/providers.js");

const KLASS = ["general", "git-native", "isolated"];
const TIER = ["works", "candidate", "native", "cant"];

test("PROVIDERS is a non-empty array of well-formed entries", () => {
  assert.ok(Array.isArray(PROVIDERS) && PROVIDERS.length > 0);
  PROVIDERS.forEach(function (p) {
    assert.strictEqual(typeof p.name, "string");
    assert.ok(p.name.length > 0);
    assert.ok(KLASS.indexOf(p.klass) !== -1, "bad klass: " + p.klass);
    assert.ok(TIER.indexOf(p.tier) !== -1, "bad tier: " + p.tier);
    assert.strictEqual(typeof p.note, "string");
  });
});
test("works tier includes the live-verified Kimi surface (robust to adding more)", () => {
  var works = PROVIDERS.filter(function (p) { return p.tier === "works"; });
  assert.ok(works.length >= 1, "at least one verified-working surface");
  assert.ok(works.some(function (p) { return /Kimi/.test(p.name); }), "Kimi must be in the verified-working group");
});
test("every works entry is dated (point-in-time, not a perpetual guarantee)", () => {
  var works = PROVIDERS.filter(function (p) { return p.tier === "works"; });
  works.forEach(function (p) {
    assert.strictEqual(typeof p.verified_on, "string", p.name + ": works entry must carry verified_on");
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(p.verified_on), p.name + ": verified_on must be YYYY-MM-DD, got " + p.verified_on);
  });
});
test("covers the general-agent linchpins and the can't-yet class", () => {
  var names = PROVIDERS.map(function (p) { return p.name; }).join(" ");
  assert.ok(/Kimi/.test(names) && /Claude/.test(names) && /Manus/.test(names));
  assert.ok(PROVIDERS.some(function (p) { return p.klass === "git-native"; }));
  assert.ok(PROVIDERS.some(function (p) { return p.tier === "cant"; }));
});
test("launch templates: each launch is an https URL with a {PROMPT} placeholder, and Claude/ChatGPT each have one", () => {
  PROVIDERS.forEach(function (p) {
    if (!("launch" in p)) return;
    assert.strictEqual(typeof p.launch, "string", "launch must be a string: " + p.name);
    assert.ok(p.launch.indexOf("https://") === 0, "launch must start with https://: " + p.launch);
    assert.ok(p.launch.indexOf("{PROMPT}") !== -1, "launch must contain {PROMPT}: " + p.launch);
  });
  var withLaunch = PROVIDERS.filter(function (p) { return p.launch; }).map(function (p) { return p.name; }).join(" ");
  assert.ok(/Claude/.test(withLaunch), "Claude must have a launch template");
  assert.ok(/ChatGPT/.test(withLaunch), "ChatGPT must have a launch template");
});

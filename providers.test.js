const test = require("node:test");
const assert = require("node:assert");
const { PROVIDERS } = require("./providers.js");

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
test("Phase-1 honesty: no surface claims 'works' before live-verify", () => {
  assert.strictEqual(PROVIDERS.filter(function (p) { return p.tier === "works"; }).length, 0);
});
test("covers the general-agent linchpins and the can't-yet class", () => {
  var names = PROVIDERS.map(function (p) { return p.name; }).join(" ");
  assert.ok(/Kimi/.test(names) && /Claude/.test(names) && /Manus/.test(names));
  assert.ok(PROVIDERS.some(function (p) { return p.klass === "git-native"; }));
  assert.ok(PROVIDERS.some(function (p) { return p.tier === "cant"; }));
});
test("launch templates: each launch is an https URL with a {PROMPT} placeholder, and Claude/ChatGPT/Manus each have one", () => {
  PROVIDERS.forEach(function (p) {
    if (!("launch" in p)) return;
    assert.strictEqual(typeof p.launch, "string", "launch must be a string: " + p.name);
    assert.ok(p.launch.indexOf("https://") === 0, "launch must start with https://: " + p.launch);
    assert.ok(p.launch.indexOf("{PROMPT}") !== -1, "launch must contain {PROMPT}: " + p.launch);
  });
  var withLaunch = PROVIDERS.filter(function (p) { return p.launch; }).map(function (p) { return p.name; }).join(" ");
  assert.ok(/Claude/.test(withLaunch), "Claude must have a launch template");
  assert.ok(/ChatGPT/.test(withLaunch), "ChatGPT must have a launch template");
  assert.ok(/Manus/.test(withLaunch), "Manus must have a launch template");
});

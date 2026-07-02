// index.test.js — byte-level must-NEVER guard on the SERVED files.
// config.test.js guards the config OBJECTS; it cannot catch a re-bake of an owner identifier
// into the static HTML / runbook bytes — the surfaces that historically carried the exposure.
// These tests read the actual files and fail the build if any forbidden residue returns.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");

// Owner operational IDs, the owner Client ID, the owner handle, and any install link.
const FORBIDDEN = /3913118|136750334|Iv23lijzJtw5tNZKkfNa|@Sundeepg98|settings\/installations\/\d/;

test("index.html served bytes carry ZERO forbidden owner residue", () => {
  const m = read("docs/index.html").match(FORBIDDEN);
  assert.strictEqual(m, null, m ? ("forbidden residue in index.html: " + m[0]) : "");
});

test("index.html keeps the generic placeholder + a REQUIRED OSS source link (genericize did not regress)", () => {
  const html = read("docs/index.html");
  assert.ok(html.includes("YOUR_CLIENT_ID"), "placeholder Client ID must be present in the static bytes");
  // Fork-parametric (red-team fix 12): the footer Source link is REQUIRED on every deployment — a
  // "read the source yourself" page must always link its own repo — but ANY github.com/<owner>/<repo>
  // satisfies it, so a fork that repointed it per README step 4 passes too. Do NOT weaken this to
  // optional: dropping the Source link entirely must stay a test failure.
  assert.ok(
    /<a[^>]*id="foot-view"[^>]*href="https:\/\/github\.com\/[^"\/]+\/[^"\/]+"/.test(html),
    "OSS 'Source' footer link (id=foot-view) must point at a github.com/<owner>/<repo> repo"
  );
});

test("index.html derives the runbook URL from location (fork-fix present; an absolute connect.md literal kept as no-JS fallback)", () => {
  const html = read("docs/index.html");
  assert.ok(/location\.origin\+dir\+'connect\.md'/.test(html), "runbook must derive from location");
  // Fork-parametric (red-team fix 12): any absolute https …/connect.md literal satisfies the
  // no-JS / raw-fetch fallback — the author's domain is not required, but SOME literal is.
  assert.ok(
    /https:\/\/[^"'\s<>]+\/connect\.md/.test(html),
    "an absolute https …/connect.md literal must remain as the no-JS / raw-fetch fallback"
  );
});

test("connect.md runbook carries no baked owner Client ID (the dual-baked locus)", () => {
  assert.ok(!/Iv23lijzJtw5tNZKkfNa/.test(read("docs/connect.md")), "owner Client ID must not be baked into connect.md");
});

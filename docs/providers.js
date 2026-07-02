// providers.js — which AI surfaces can run the device-flow connection. Honest tiers; breadth in coverage, no inflated claims.
// tier: "works" = live-verified end-to-end (device-flow→clone→push observed) — ONLY Kimi, operator-observed (n=1)
//       · "candidate" = plausible sandbox, untested by us (ordered strongest→weakest)
//       · "native" = git already native — cloud GitHub-App agents + local-creds CLI/IDE agents; repo-bridge not needed
//       · "cant" = sandbox has no usable outbound internet (or undocumented), so it can't run the device flow.
var PROVIDERS = [
  { name: "Kimi (OK Computer)", klass: "general", tier: "works", note: "Open shell with outbound git; device-flow→clone→push run end-to-end.", verified_on: "2026-06-30", evidence_grade: "operator-observed", evidence: "https://github.com/Sundeepg98/deepdive-rehearsal/commits/master" },

  { name: "Manus", klass: "general", tier: "candidate", note: "Documented Ubuntu shell + full internet — best-positioned untested target; may fall back to its managed GitHub connector rather than a from-scratch device flow." },
  { name: "Claude", klass: "general", tier: "candidate", note: "Network ON by default in the file-creation sandbox (Ubuntu) with github.com allowlisted; untested end-to-end, git-binary/api.github.com reachability unconfirmed — use the file-creation sandbox, not the analysis tool.", launch: "https://claude.ai/new?q={PROMPT}" },
  { name: "ChatGPT (Agent mode)", klass: "general", tier: "candidate", note: "Agent-mode VM has a terminal, but github.com egress may be blocked or silently routed via its connector; the deep-link opens default chat, so switch to Agent mode. Untested.", launch: "https://chatgpt.com/?q={PROMPT}" },
  { name: "MiniMax", klass: "general", tier: "candidate", note: "Code-exec + research sandbox; arbitrary github.com egress and git are unconfirmed — the most uncertain of the candidates." },

  { name: "Codex", klass: "git-native", tier: "native", note: "Install its GitHub App and select your repo — the device flow isn't needed." },
  { name: "Jules", klass: "git-native", tier: "native", note: "Use its own GitHub App; the device flow isn't needed." },
  { name: "Devin", klass: "git-native", tier: "native", note: "Use its own GitHub App; the device flow isn't needed." },
  { name: "GitHub Copilot", klass: "git-native", tier: "native", note: "GitHub-native coding agent — works on your repo directly (cloud + local sandboxes, configurable firewall); use its GitHub integration, not the device flow." },
  { name: "Cursor (background agents)", klass: "git-native", tier: "native", note: "Background/cloud agents clone + push via granted GitHub access in an isolated VM — use its GitHub integration, not the device flow." },
  { name: "Replit (Agent)", klass: "git-native", tier: "native", note: "First-class GitHub import/push + Agent checkpoints; its open shell could also run the device flow, but native GitHub is the simpler path." },
  { name: "Local CLI/IDE agents (Claude Code · Aider · Cline · Gemini CLI · Codex CLI · Grok Build · Windsurf · Goose)", klass: "git-native", tier: "native", note: "Run on your machine with your local git credentials — git is already native, so repo-bridge is redundant." },

  { name: "Gemini", klass: "isolated", tier: "cant", note: "Consumer code-execution sandbox has no network access — can't run the device flow." },
  { name: "Mistral (Le Chat)", klass: "isolated", tier: "cant", note: "Le Chat's Code Interpreter has no internet access — can't reach GitHub to run the device flow." },
  { name: "ChatGPT (Code Interpreter)", klass: "isolated", tier: "cant", note: "The Data-Analysis Python sandbox has no internet (≠ Agent mode) — can't run the device flow." },
  { name: "Perplexity", klass: "isolated", tier: "cant", note: "Sandboxes have no direct network access (egress only via proxy) — can't run the device flow." },
  { name: "Grok (consumer sandbox)", klass: "isolated", tier: "cant", note: "Consumer grok.com sandbox net status is undocumented (uncertain); xAI's real git path is the local Grok Build CLI." },
  { name: "DeepSeek", klass: "isolated", tier: "cant", note: "No internet-connected code sandbox is documented (status unknown)." }
];

function renderProviders(doc) {
  doc = doc || document;
  var box = doc.querySelector("#providers .prov-body");
  if (!box) return;
  var groups = [
    { tier: "works", lead: "Verified working (point-in-time — see dates):" },
    { tier: "candidate", lead: "Worth trying (general-agent sandboxes — untested by us yet):" },
    { tier: "native", lead: "Git-native agents — you don't need repo-bridge:" },
    { tier: "cant", lead: "Can't, or no sandbox internet documented:" }
  ];
  box.textContent = "";
  groups.forEach(function (g) {
    var items = PROVIDERS.filter(function (p) { return p.tier === g.tier; });
    if (!items.length) return;
    var lead = doc.createElement("p"); lead.className = "prov-lead"; lead.textContent = g.lead;
    box.appendChild(lead);
    var ul = doc.createElement("ul"); ul.className = "prov-list";
    items.forEach(function (p) {
      var li = doc.createElement("li");
      var b = doc.createElement("b"); b.textContent = p.name; li.appendChild(b);
      li.appendChild(doc.createTextNode(" — " + p.note));
      if (p.verified_on) {
        var when = doc.createElement("span");
        when.textContent = " · verified " + p.verified_on + (p.evidence_grade ? " (" + p.evidence_grade + ")" : "");
        li.appendChild(when);
        if (p.evidence) {
          li.appendChild(doc.createTextNode(" "));
          var a = doc.createElement("a");
          a.setAttribute("href", p.evidence);
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer");
          a.textContent = "evidence";
          li.appendChild(a);
        }
      }
      ul.appendChild(li);
    });
    box.appendChild(ul);
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  renderProviders(document);
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PROVIDERS: PROVIDERS, renderProviders: renderProviders };
}

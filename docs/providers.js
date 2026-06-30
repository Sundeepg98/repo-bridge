// providers.js — which AI surfaces can run the device-flow connection. Honest tiers.
// tier: "works" = live-verified (NONE until Phase 3) · "candidate" = plausible, untested
//       · "native" = git-native, use its own GitHub App · "cant" = network-isolated sandbox.
var PROVIDERS = [
  { name: "Claude", klass: "general", tier: "candidate", note: "Model fetches the runbook, sandbox reaches github.com; pending full-flow verify.", launch: "https://claude.ai/new?q={PROMPT}" },
  { name: "ChatGPT (Agent mode)", klass: "general", tier: "candidate", note: "Use Agent mode, not the default chat; pending verify.", launch: "https://chatgpt.com/?q={PROMPT}" },
  { name: "Manus", klass: "general", tier: "candidate", note: "Ubuntu shell + browser; from-scratch device flow pending verify.", launch: "https://manus.im/?q={PROMPT}" },
  { name: "Kimi (OK Computer)", klass: "general", tier: "candidate", note: "Open shell that syncs code; full device flow pending live-verify." },
  { name: "MiniMax", klass: "general", tier: "candidate", note: "Same shape as the others; unconfirmed." },
  { name: "Codex", klass: "git-native", tier: "native", note: "Install its GitHub App and select your repo — the device flow isn't needed." },
  { name: "Jules", klass: "git-native", tier: "native", note: "Use its own GitHub App; the device flow isn't needed." },
  { name: "Devin", klass: "git-native", tier: "native", note: "Use its own GitHub App; the device flow isn't needed." },
  { name: "Gemini · Copilot · Grok · Perplexity · Mistral · DeepSeek", klass: "isolated", tier: "cant", note: "Their code sandbox has no outbound internet, so it can't run the device flow." }
];

function renderProviders(doc) {
  doc = doc || document;
  var box = doc.querySelector("#providers .prov-body");
  if (!box) return;
  var groups = [
    { tier: "candidate", lead: "Worth trying (general-agent sandboxes — untested by us yet):" },
    { tier: "native", lead: "Git-native agents — you don't need repo-bridge:" },
    { tier: "cant", lead: "Can't (no internet in their sandbox):" }
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

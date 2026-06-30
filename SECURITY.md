# Security Policy

repo-bridge is a **pure-static page plus a fetchable runbook**. It has no backend, runs no
code on your behalf, and **never sees, stores, or transmits any token or secret** — everything
happens in your browser and in the AI sandbox you choose. This document states exactly what it
can and cannot vouch for, the risks that remain, and how to report a problem.

## The root of trust is GitHub, not this page

The only thing that actually grants access is **GitHub's device-flow consent screen** at
`github.com/login/device`. You authorize there, you pick which repositories to grant, and
GitHub — not repo-bridge — issues the credential. Whatever any copy of this page or its runbook
claims, **GitHub's screen is the authority**. Read it; it is the gate.

repo-bridge itself holds **no secret** (the Client ID it shows is public and opaque), runs
**no server** (nothing to breach, nothing logs you), and **vouches for no app** (see below).

## What "GitHub-attested identity" means — and what it does not

When you open a `?id=…&app=…` link, the page may label the app **identity-attested**. That means
exactly one thing: **GitHub's public API confirms the Client ID in the link is registered to the
named app and owner.** It is **not** a safety rating. Anyone can register a GitHub App in minutes,
so *real does not mean trustworthy*. The page can tell you *who* an app is; it cannot tell you
whether to trust them. You may see:

- **identity-attested** — GitHub confirms the app/owner behind this Client ID. Trust the *owner*,
  not the label.
- **unverified (community)** — the page can't confirm the owner (e.g. a private app). Continue
  only if you trust whoever sent you the link.
- **mismatch** — the link's app slug and Client ID disagree. Treat as possible impersonation;
  don't authorize.

## Two grants, not one — token vs installation

Connecting creates **two separate things**, and the difference matters:

1. **A user access token** — the short-lived credential (~8h) the sandbox uses to clone and push.
   Revoke it anytime under **Settings → Applications → Authorized GitHub Apps**.
2. **An app installation** — selecting your repositories **installs the app on them**. This is a
   *persistent* grant. While it stands, **whoever holds the app's private key (its owner) can mint
   installation tokens for those repositories at any time — without you, and regardless of the ~8h
   token.** It lasts until you **uninstall** the app under **Settings → Applications → Installed
   GitHub Apps**.

So "scoped, ~8h, revocable" describes the token, not the whole picture. To **fully** disconnect,
revoke the token **and** uninstall the app.

- If it's **your own app** (bring-your-own), you are the only key-holder — the installation is just
  yours to clean up.
- If you authorized **someone else's** link, that owner can reach your selected repos until you
  uninstall. Only authorize apps whose owner you trust.

## The token goes wherever you paste it

The connection hands a live, repo-scoped GitHub token to **the sandbox you paste the prompt into**.
A hostile sandbox can keep that token for its lifetime and ignore the runbook's "never print the
token" instruction. **Use only a sandbox you control, in a session you started**, and revoke the
token afterward if in doubt.

## Risks that cannot be closed

repo-bridge is a static, forkable, MIT-licensed page. By design it **cannot** close the following;
the best any version can do is inform you so you can consent — or decline — knowingly:

1. **A malicious sandbox keeping the token.** The device flow is *meant* to hand the token to the
   initiating device; if that device is hostile, it holds the scoped token until it expires.
   Mitigation: use a sandbox you trust; revoke after use.
2. **You authorizing a real-but-malicious app.** GitHub's consent screen is the only gate, and it
   depends on your judgment. repo-bridge can attest identity and refuse to launder credibility — it
   cannot stop a socially-engineered authorization. Mitigation: trust the *owner*; verify on
   GitHub's screen.
3. **The persistent installation.** A true property of GitHub Apps, not a repo-bridge bug.
   Mitigation: uninstall to cut access fully.
4. **Fork tampering and look-alikes.** Anyone may fork this page; a byte-identical clone with a
   tampered `connect.md` or a swapped Client ID is indistinguishable from the canonical one.
   Mitigation: prefer the canonical URL, and always confirm the app owner on **GitHub's** screen —
   never on the page.

These are not bugs to fix; they are the boundary of what a no-backend page can guarantee. Treat any
version of this page as **untrusted instructions you choose to follow**, with GitHub's consent
screen as the real checkpoint.

## Reporting

- **An abusive app or a phishing link using repo-bridge** is a **GitHub** matter, not a repo-bridge
  bug: revoke/uninstall it on your account, then report the app at
  `https://github.com/contact/report-abuse`.
- **A vulnerability in repo-bridge itself** (the page or the five-state engine): report it privately
  via **GitHub Security Advisories** on the canonical repo (Security → *Report a vulnerability*)
  rather than a public issue. If private reporting is unavailable, open an issue **without** exploit
  details and ask for a private channel.

Canonical source: <https://github.com/Sundeepg98/repo-bridge> · Canonical site:
<https://sundeepg98.github.io/repo-bridge/>

## No warranty

repo-bridge is provided under the MIT License, **as is and without warranty**. You are responsible
for the apps you authorize and the sandboxes you trust.

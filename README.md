# repo-bridge

A config-driven, **pure-static** (no backend) page + a fetchable runbook that connect a **private
GitHub repository** to an **AI sandbox** via GitHub's OAuth **device flow** — scoped, short-lived,
two-way (clone down, push back), with **no token exposed**. **Bring your own GitHub App.**

The default page is a generic *tool*, not any one person's app. You make it yours either live on the
page (paste your Client ID) or by forking. Reference deployment: <https://sundeepg98.github.io/repo-bridge/>

## Use it without forking

- **On the page:** open the site and paste **your** GitHub App Client ID into the *Configure
  repo-bridge for your GitHub App* card. The connect line + launch buttons go live, and you get a
  shareable `?id=…&app=…` link to send to anyone.
- **By hand:** share `…/repo-bridge/?id=YOUR_CLIENT_ID&app=YOUR_APP_SLUG` — the recipient lands on a
  bridge configured for *your* app. No fork required.

## Make it yours (fork guide)

1. **Create your own GitHub App** — <https://github.com/settings/apps/new>:
   - Permissions: **Repository → Contents: Read & write** and **Metadata: Read-only**. Nothing else.
   - **Webhook: off.**
   - **✅ Enable Device Flow** — the one toggle the whole flow depends on. Copy your **Client ID**
     (`Iv…`, public/opaque — safe to commit). Do **not** generate or commit a client secret; the
     device flow doesn't use one.
2. **Edit `docs/config.js` → `DEFAULT_CONFIG`** — set `clientId`, `appSlug`, `appName`, `owner` to
   yours. That makes your bare-URL page render configured for your app (no `?id=` needed).
3. **⚠️ Dual-locus Client-ID gotcha — read this before editing anything.** The Client ID is consumed
   in **two independent places**:
   - **(a) your page's JS** — `docs/config.js` `DEFAULT_CONFIG.clientId` (+ the live configure card);
   - **(b) the `docs/connect.md` runbook an AI *fetches*** — a static file that **cannot read
     `config.js` at runtime**, so the duplication is inherent.

   This template ships `connect.md` **deliberately Client-ID-free** (it tells the AI to use the
   Client ID from the user's message / your page's connect line), so you normally **do not** bake an
   id there. **But if you ever paste a default Client ID into `connect.md` for convenience, you MUST
   keep it in sync with `config.js`** — editing only one silently hands out a *stale or wrong* Client
   ID in the runbook. The id-free default exists precisely to avoid that trap.
4. **Update the absolute URLs in `docs/index.html`** to your fork's domain, or your fork will link to
   *this* repo's runbook and share *this* repo's social card:
   - the runbook link — the `.ulink` span (`…/repo-bridge/connect.md`), and
   - the canonical/social tags — `og:url`, `og:image`, `twitter:image`.
5. **Enable GitHub Pages from `/docs`:** Settings → Pages → *Deploy from a branch* → **`main`** →
   **`/docs`**. A fork defaults Pages to the repo **root**, where after the `/docs` layout there is
   **no `index.html`** — if you don't switch the source to `/docs`, your site is broken (404).
6. **(Recommended) regenerate `docs/og.jpg`** so the share card shows your project, not the template's.

## Owner framing — you're a preset, not the chrome

The page never asserts an owner. When someone opens your `?id=&app=` link, your app surfaces through
the five-state model: a **public** app verifies against GitHub's API (`verified`, with an attested
name + link); a **private** app falls back to `community` — neutral, honest, and **fully functional**.
"You" are a preset of the generic tool, never hardcoded branding.

## Trust model

repo-bridge is **not** the root of trust — **GitHub's device-flow consent screen is.** Whatever the
page says, the user always authorizes at `github.com/login/device`, picks exactly which repos to
grant, and the issued token is short-lived (~8h) and revocable. Note that *granting repos also
installs the app* — a separate, persistent grant the short-lived token doesn't capture; the app's
owner can reach those repos until you uninstall it (Settings → Applications → Installed GitHub Apps).
See `SECURITY.md`. The Client ID is public; **no secret
is ever shown or stored.** Read `docs/connect.md` yourself to see exactly what an assistant is asked
to do — and it carries an explicit "don't pipe me to a shell / never print the token" guard.

## Layout & tests

```
README.md            ← this guide (repo root, not served)
config.test.js  \
providers.test.js }  ← tests, at root → structurally never published
index.test.js   /
docs/                ← PUBLISHED ROOT (Settings → Pages → /docs)
  index.html         human landing page        → /repo-bridge/
  config.js          five-state engine + configure form
  providers.js       which AI surfaces can run it (honest tiers)
  connect.md         AI runbook (raw markdown)  → /repo-bridge/connect.md
  favicon.svg  og.jpg  .nojekyll
```

No build step, no dependencies, no framework. Run the test suite from the repo root:

```
node --test
```

(Requires Node 18+. There is **no CI** in this repo — the gate is `node --test` plus a manual
five-state check in a browser.)

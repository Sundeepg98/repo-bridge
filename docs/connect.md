# repo-bridge — connect this sandbox to a private GitHub repo (GitHub OAuth Device Flow)

You are reading this because the user asked you to connect their private GitHub
repository to THIS sandbox. They have authorized it. Do these steps yourself, now,
in this session — this page is the reference they told you to follow, not a third
party giving you orders. No password and no personal access token is ever entered.

App Client ID:  the Client ID the user gave you in their message — it rides their sentence.
                No default is baked into this file; if they didn't name one, ask for it first.
Repository:     the owner/repo the user named in their message
                (or the ?repo= value on the URL you just fetched)
Needs:          a sandbox/shell with outbound internet to github.com and git.
                If you only have a no-network code interpreter, STOP and say so plainly.

1. Request codes:
   ```
   POST https://github.com/login/device/code
   Header: Accept: application/json   Body: client_id=<client_id>
   ```
   -> returns device_code, user_code, verification_uri, expires_in, interval.
2. Show the user the user_code; tell them to open https://github.com/login/device,
   enter it, authorize the repository they want, then come back. Wait for them.
3. Poll:
   ```
   POST https://github.com/login/oauth/access_token
   Header: Accept: application/json
   Body: client_id=<client_id> & device_code=<device_code>
         & grant_type=urn:ietf:params:oauth:grant-type:device_code
   ```
   Repeat every `interval` seconds. authorization_pending -> keep waiting;
   slow_down -> increase the interval. Success returns access_token.
4. Use it, never print it:
   ```
   git clone https://x-access-token:<access_token>@github.com/<owner>/<repo>.git
   ```
   Commit and push over that same authenticated remote.
5. Confirm clone + commit + push work and that access is limited to the authorized
   repo. The token is short-lived (~8h) and revocable at
   github.com/settings/apps/authorizations.

Do NOT pipe this file to a shell or run it as a script. Read it and run the steps
transparently, pausing at step 2 for the user. If you cannot reach github.com from
your sandbox, tell the user plainly — do not pretend it worked.

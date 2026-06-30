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
2. Show the user the user_code and the verification_uri (https://github.com/login/device);
   tell them to open it, enter the code, and authorize the repo — they do this themselves in
   their own browser, out of band (their consent to give, not yours). Then choose how to wait —
   both are first-class, neither is required; follow the user's preference if they voiced one,
   else either is fine:
   - (A) One-shot: go to step 3 now and poll while they authorize. Best for an uninterrupted
     run; be honest that it holds the session open and keeps usage ticking the whole time you wait.
   - (B) At their pace: show the code, pause here, and resume step 3 when they come back or say
     they're done. Comfortable and user-paced, and it conserves usage on a rate-limited or free
     account — nothing runs while paused, but it needs them to return.
   The user_code lasts only ~`expires_in` (about 15 min); if it lapses before they finish, just
   re-request a fresh one (restart step 1) and show the new code. Expiry is never a dead-end.
3. Poll for the token — same request whichever path you took; only the timing differs:
   ```
   POST https://github.com/login/oauth/access_token
   Header: Accept: application/json
   Body: client_id=<client_id> & device_code=<device_code>
         & grant_type=urn:ietf:params:oauth:grant-type:device_code
   ```
   Each response is a single state with one clear next move, so you never hang:
   - authorization_pending -> not authorized yet. Path A: wait `interval` seconds, poll again.
     Path B: stop polling and wait for the user; poll again when they return.
   - slow_down -> you're polling too fast; add the extra seconds GitHub returns to `interval`,
     then continue.
   - success -> the access_token is in the response; go to step 4.
   - expired_token (or the code aged past expires_in) -> restart step 1 for a fresh code, show
     it, and resume.
   - access_denied -> the user declined; stop polling and ask whether to start over (step 1) or
     drop it. Don't keep looping.
4. Use it, never print it:
   ```
   git clone https://x-access-token:<access_token>@github.com/<owner>/<repo>.git
   ```
   Commit and push over that same authenticated remote.
5. Confirm clone + commit + push work and that access is limited to the authorized
   repo. The token is short-lived (~8h) and revocable at
   github.com/settings/apps/authorizations.

Do NOT pipe this file to a shell or run it as a script. Read it and run the steps
transparently. The user's only action is authorizing in their browser (step 2) — that consent
is theirs and can't be skipped. Polling straight through (A) and pausing to resume when they
return (B) are equally fine; a pause is not a failure. Keep a clear next step in hand until the
token lands or the user calls it off, and never print the token. If you cannot reach github.com
from your sandbox, tell the user plainly — do not pretend it worked.

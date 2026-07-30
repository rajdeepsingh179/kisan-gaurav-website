# Authentication Stabilization Report

Date: 2026-07-30  
Scope: Cloudflare Worker, Auth.js, D1, React authentication client, cookies,
email verification, password reset, Google OAuth, customer/admin authorization,
logging, and deployment configuration.

## Release status

The authentication release candidate passes local automated, migration, lint,
build, and Worker bundle checks. Production is **not cleared for deployment**
until migration `0017_authentication_reliability.sql` is backed up and applied,
the required secret names are confirmed, real email delivery is exercised, and
interactive Google OAuth is tested on production desktop and mobile browsers.

No production deployment or production D1 mutation was performed during this
audit.

## Issues found, root causes, and fixes

| Issue | Root cause | Fix applied |
|---|---|---|
| Valid legacy administrator passwords could fail during password change | The password-change route did not read `password_iterations`, so verification defaulted to 600,000 iterations even for older 100,000-iteration hashes | The route now loads and uses the stored iteration count, applies the full password policy, and preserves transparent hash upgrades |
| Verification and reset links had a concurrent reuse window | Token validity was selected before the D1 mutation, creating a time-of-check/time-of-use race | User mutation and conditional token consumption now run in one transactional D1 batch; affected-row counts must both equal one |
| Concurrent first-time Google sign-ins could collide on the unique email | OAuth user creation used a plain insert after an earlier lookup | User creation now uses `ON CONFLICT(email) DO NOTHING`, re-reads the canonical user, and links the verified Google subject to that single row |
| Signing out one browser revoked every device | The Auth.js sign-out event incremented the account-wide `session_version` | Ordinary logout now clears only the current Auth.js cookie and records a best-effort audit event. Password reset, password change, and role change still revoke every JWT as intended |
| A transient email-webhook failure permanently dropped verification/reset delivery | Failed notifications were marked `failed` and never selected again | Migration 0017 adds attempt tracking, retry scheduling, bounded retries, and delivery indexes. The cron retries with backoff up to five attempts |
| Authentication failures lacked consistent operational classification | Auth.js and account lifecycle routes emitted generic or unstructured errors | Structured logs now classify Auth.js, OAuth, session, registration, verification, password, and database failures with request IDs and safe metadata |
| Successfully delivered one-time URLs remained in notification payloads | Notification payloads were retained unchanged after delivery | Successful verification/reset deliveries replace the stored payload with a delivery marker |
| Verification/reset URLs could remain in browser history and same-origin referrers | Token pages retained their query string and used a permissive same-origin referrer policy | Token pages remove the query string after capturing it, and frontend/Worker responses now use `Referrer-Policy: strict-origin` |
| Authentication lookups could degrade as data grew | IP lockout, token expiry, reset-user, and account-user access paths lacked dedicated indexes | Migration 0017 adds the required authentication and notification delivery indexes |
| Unverified input could overwrite the display name of an existing Google-only account | Registration updated an existing user before control of the email was proven | Existing profile identity is preserved until verification; new accounts still receive the submitted name |

## Security controls verified

- PBKDF2-SHA-256 with unique salts, stored iteration counts, and transparent
  upgrades.
- Timing-resistant comparison for equal-length derived hashes and a dummy hash
  path for unknown accounts.
- Prepared D1 bindings for authentication queries.
- Verified-email requirement for credentials login and verified Google profile
  requirement for OAuth.
- Unique email and unique provider-subject constraints prevent duplicate
  identities.
- Auth.js CSRF tokens plus trusted `Origin`/`Referer` enforcement for
  state-changing API calls.
- Production cookies are `HttpOnly`, `Secure`, `SameSite=Lax`, scoped to `/`,
  and shared only across the canonical apex/`www` domain.
- OAuth PKCE, state, and nonce cookies have a 15-minute maximum age.
- Same-origin redirect allow-listing blocks external callback redirects.
- Account and IP throttling, ten-attempt temporary account lock, and general
  authentication endpoint rate limits.
- JWT session-version checks revoke all sessions after password reset, password
  change, account deletion, or role change.
- Authentication/account responses are `private, no-store`.
- Security headers include HSTS, CSP, frame denial, MIME sniffing protection,
  permissions policy, and a strict referrer policy.

## Automated coverage

The Worker suite contains 43 passing tests, including SQL-backed end-to-end
authentication flows using real SQLite semantics:

- Email registration and duplicate prevention
- Single-use email verification
- Valid and invalid credentials
- Account lock and rate-limit recovery
- Remember-me persistent versus browser-session cookies
- JWT session persistence after reload
- Current-browser logout
- Password reset, single-use reset token, lock clearing, and session revocation
- Google OAuth initiation, secure transient cookies, callback account linking,
  and duplicate prevention
- Anonymous protected-route rejection
- Customer and administrator claim separation
- Legacy administrator password verification and password change
- Cross-origin request rejection and redirect allow-listing

Validation completed:

- `npm run lint` — passed
- `npm test` — 43/43 passed
- `npm run build` — passed
- Fresh local D1 migration chain `0001` through `0017` — passed
- `wrangler deploy --dry-run` — passed
- `wrangler check startup` — passed
- `git diff --check` — passed

## Remaining risks and production-only checks

1. Cloudflare secret names and remote migration state could not be queried
   because this environment had no `CLOUDFLARE_API_TOKEN`.
2. A real Google authorization, consent, callback, and logout cycle requires a
   human-controlled Google identity and must be exercised in production.
3. The physical browser/device/network/geographic matrix cannot be proven by
   unit tests. At minimum, run the matrix below before clearing the blocker.
4. Actual verification and reset email receipt depends on
   `NOTIFICATION_WEBHOOK` and `NOTIFICATION_WEBHOOK_SECRET`; test both successful
   delivery and a transient-failure retry.
5. JWTs are stateless. A copied token remains usable until expiry unless an
   account-wide revocation event increments `session_version`. HttpOnly/Secure
   cookies reduce this risk, but do not replace device-bound sessions or MFA.
6. MFA/passkeys and a dedicated per-device session registry are not part of the
   current architecture and were intentionally not introduced.

## Required production deployment checklist

1. Put the site in a controlled release window and export a remote D1 backup.
2. Confirm Worker secrets exist: `AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `NOTIFICATION_WEBHOOK`, and
   `NOTIFICATION_WEBHOOK_SECRET`. Confirm `AUTH_SECRET` is high entropy and is
   not changed during a normal deployment.
3. Confirm `FRONTEND_URL=https://kisangaurav.com`.
4. Confirm the Google OAuth client allows exactly
   `https://kisangaurav.com/api/auth/callback/google`.
5. Apply D1 migration `0017_authentication_reliability.sql` **before** deploying
   the Worker.
6. Deploy the Worker, then deploy the frontend containing the token-URL cleanup
   and referrer-policy change.
7. Verify `/api/health`, `/api/auth/providers`, and `/api/auth/csrf` on both the
   apex and `www` host. Confirm the OAuth callback resolves to the apex host.
8. With isolated customer and administrator accounts, run: register, receive
   email, verify, credentials login, reload, protected route, logout, forgot
   password, reset, old-session rejection, new-password login, and duplicate
   signup.
9. Run Google sign-in and logout on desktop Chrome, Edge, Firefox, Safari,
   Brave, and Opera where available.
10. Run Google and credentials flows on Chrome Android, Samsung Internet,
    Safari iPhone, Firefox Mobile, and Edge Mobile. Include Wi-Fi, mobile data,
    and one VPN path.
11. Open two tabs and confirm logout clears both tabs in the same browser. Sign
    in on a second device and confirm ordinary logout does not revoke it; then
    reset the password and confirm both devices are revoked.
12. Force one notification-webhook failure, confirm a retry is scheduled, then
    restore the webhook and confirm delivery succeeds and the stored token URL
    is redacted.
13. Monitor Workers Logs for `authjs_error`,
    `authentication_request_failed`, `authentication_login_failed`,
    `authentication_session_invalid`, and
    `authentication_email_delivery_unconfigured`.
14. Keep the pre-deployment Worker version and D1 export available for rollback.
    Roll back the Worker first if application errors appear; use the supplied
    0017 rollback only after confirming no deployed Worker depends on its
    notification columns.

## Reference basis

- Cloudflare Workers Best Practices:
  <https://developers.cloudflare.com/workers/best-practices/workers-best-practices/>
- Cloudflare D1 index guidance:
  <https://developers.cloudflare.com/d1/best-practices/use-indexes/>
- Auth.js deployment guidance:
  <https://authjs.dev/getting-started/deployment>

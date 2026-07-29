# Production authentication

## Mobile Google root cause

Before this change, Auth.js trusted the incoming host. A request started on
`www.kisangaurav.com` therefore advertised
`https://www.kisangaurav.com/api/auth/callback/google`, while the canonical
production client uses the apex callback. Auth.js also issued host-only OAuth
state, CSRF, and callback cookies. A mobile browser or installed PWA that moved
between `www` and the apex host could consequently hit a Google
`redirect_uri_mismatch` or return without the state cookie.

The production endpoints were checked read-only before deployment: the apex
provider advertised the apex callback, the `www` provider advertised the `www`
callback, and each host issued its own host-only callback/CSRF cookies. This
confirms the host split rather than a popup blocker as the primary defect.

## Canonical OAuth configuration

The canonical public origin is `https://kisangaurav.com`.

Configure the Google OAuth client with:

- Authorized JavaScript origin: `https://kisangaurav.com`
- Authorized JavaScript origin: `https://www.kisangaurav.com`
- Authorized redirect URI: `https://kisangaurav.com/api/auth/callback/google`

Auth.js normalizes OAuth requests from both public hosts to the canonical origin.
Its CSRF, PKCE, state, callback, and session cookies are `Secure`, `HttpOnly`,
`SameSite=Lax`, scoped to `/`, and shared only across `.kisangaurav.com`.
Google authentication always uses a full-page redirect, which works in mobile
browsers and standalone PWA windows without depending on popup support.

Required Worker secrets:

- `AUTH_SECRET`
- `GOOGLE_CLIENT_ID` (or `AUTH_GOOGLE_ID`)
- `GOOGLE_CLIENT_SECRET` (or `AUTH_GOOGLE_SECRET`)
- `NOTIFICATION_WEBHOOK_SECRET` when the notification webhook is enabled

The Worker variable `FRONTEND_URL` must remain `https://kisangaurav.com`.

## Release order

1. Back up the production D1 database.
2. Apply D1 migrations `0015_production_authentication.sql` and
   `0016_password_hash_upgrade.sql`.
3. Confirm the Google OAuth client contains the exact callback URI above.
4. Confirm the notification webhook delivers the `email_verification` and
   `password_reset` templates.
5. Deploy the Worker, then deploy the website.
6. Run the device matrix below against production HTTPS.

Do not deploy the Worker before its D1 migrations. New password hashes use
PBKDF2-SHA-256 with 600,000 iterations. Existing 100,000-iteration hashes remain
valid and are transparently upgraded after a successful login.

## Device acceptance matrix

Run each row with a new email user, an existing Google-only user, and an existing
email user where applicable.

| Platform | Browser/mode | Google | Register + verify | Email login | Reset | Logout + persistence |
|---|---|---:|---:|---:|---:|---:|
| Desktop | Chrome | Pending device QA | Pending device QA | Pending device QA | Pending device QA | Pending device QA |
| Desktop | Edge | Pending device QA | Pending device QA | Pending device QA | Pending device QA | Pending device QA |
| Desktop | Firefox | Pending device QA | Pending device QA | Pending device QA | Pending device QA | Pending device QA |
| Desktop | Safari | Pending device QA | Pending device QA | Pending device QA | Pending device QA | Pending device QA |
| Android | Chrome | Pending device QA | Pending device QA | Pending device QA | Pending device QA | Pending device QA |
| Android | Samsung Internet | Pending device QA | Pending device QA | Pending device QA | Pending device QA | Pending device QA |
| Android | Installed PWA | Pending device QA | Pending device QA | Pending device QA | Pending device QA | Pending device QA |
| iPhone | Safari | Pending device QA | Pending device QA | Pending device QA | Pending device QA | Pending device QA |
| iPhone | Chrome | Pending device QA | Pending device QA | Pending device QA | Pending device QA | Pending device QA |
| iPhone | Installed PWA | Pending device QA | Pending device QA | Pending device QA | Pending device QA | Pending device QA |

For Google-only users adding email credentials, verify that registration sends a
mailbox-verification message and that the resulting login resolves to the same
user ID. Never accept a password on an existing account before that mailbox
verification completes.

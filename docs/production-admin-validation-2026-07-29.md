# Production administrator validation

Date: 2026-07-29 (Asia/Calcutta)

## Scope

Only administrator role data and database-level role safeguards were changed.
No Auth.js, provider, cookie, session, password, or frontend authentication code
was modified.

## Production result

| Account | Effective role | Google provider link |
| --- | --- | --- |
| `admin@kisangaurav.com` | `SUPER_ADMIN` | No |
| `rajdeepsingh179@gmail.com` | `SUPER_ADMIN` | Yes |
| `sonichaudhary903@gmail.com` | `SUPER_ADMIN` | Pending first Google sign-in |

The production Auth.js providers endpoint returned HTTP 200 and advertised both
the Google OIDC and credentials providers.

## Authorization validation

| Requirement | Result | Evidence |
| --- | --- | --- |
| Rajdeep receives `SUPER_ADMIN` authorization | Pass | Production `user_permissions` query |
| Soni receives `SUPER_ADMIN` authorization | Pass | Production `user_permissions` query |
| Access `/admin` | Authorization pass; interactive login pending | Both sessions will receive the effective D1 role; Rajdeep is already Google-linked, Soni has not completed a Google link |
| Manage users | Pass by authorization path | `SUPER_ADMIN` passes the `/api/admin/*` middleware and `/api/admin/customers` is available |
| Promote/demote `ADMIN` users | Pass | Isolated D1 transition `SUPER_ADMIN -> ADMIN -> SUPER_ADMIN` succeeded; production permission endpoint permits `SUPER_ADMIN` |
| Cannot remove final `SUPER_ADMIN` | Pass | Isolated demotion failed with `SQLITE_CONSTRAINT_TRIGGER`; both guard triggers are present in production |
| Existing service administrator retained | Pass | `admin@kisangaurav.com` remains `SUPER_ADMIN` |

Interactive Google authentication was not impersonated. Soni must sign in with
Google once to create and verify her `auth_accounts` link. Both administrators
should then independently open `/admin`, load the customer list, and perform a
controlled `ADMIN` promotion/demotion before the service administrator is
removed.

## Rollback

`worker/rollbacks/0010_production_super_admins.rollback.sql` was tested against
an isolated D1 database. It removed the two new permission rows, removed both
guard triggers, and restored `admin@kisangaurav.com` as the sole
`SUPER_ADMIN`.

## Recommendation

Retain `admin@kisangaurav.com` only until both Google administrators complete
the interactive checklist above. After that, remove the service account
entirely rather than keeping it as an emergency login. Two independently owned
Google `SUPER_ADMIN` accounts already provide recovery redundancy, while a
third non-Google service credential adds another credential that can be
attacked or forgotten.

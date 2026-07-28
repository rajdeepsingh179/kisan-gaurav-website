# Admin authentication

## Unified Kisan Gaurav identity

The website, installable PWA, and Admin panel all use the same Auth.js service
at `/api/auth/*`, the same `users` table in the `kisan-gaurav-commerce` D1
database, and the same session cookie. The Worker is routed through
`kisangaurav.com/api/*`, so authentication remains first-party and a session
created by either the website or PWA is immediately available to the other.

There is no separate admin user table or admin authentication implementation.
`user_permissions` only adds an administrator authorization role to an
existing `users` row. An administrator therefore keeps full customer access,
while a customer without `ADMIN` or `SUPER_ADMIN` permission cannot use
`/admin`.

## Initial Super Admin

The first production migration creates this account idempotently:

- Email: `admin@kisangaurav.com`
- Initial password: `ChangeMe@123`
- Role: `SUPER_ADMIN`

The password is not stored in plaintext. The migration contains a PBKDF2-SHA256
hash using 310,000 iterations and a separate salt. The account is marked as
requiring a password change.

Sign in at `/admin/login`, then use the security warning or open
`/admin/change-password` immediately. Successful administrator login redirects
to `/admin/dashboard`.

## Create the first local administrator

From the `worker` directory:

```sh
npm run admin:create
```

Custom local account:

```sh
npm run admin:create -- --email owner@example.com --password "A-Strong-Password@123" --name "Store Owner" --role SUPER_ADMIN
```

The command targets local D1 only, hashes the password before sending SQL to D1,
and is safe to run repeatedly.

## Change an administrator password

1. Sign in at `/admin/login`.
2. Open `/admin/change-password`.
3. Enter the current password and a new password of at least 12 characters.

The server verifies the current PBKDF2 hash, generates a new random salt, stores
the new PBKDF2 hash, and clears the initial-password warning.

## Add another administrator

Create the person as a normal customer through the website, then sign in as a
Super Admin:

1. Open **Customers** in the Admin dashboard.
2. Find the customer.
3. Choose `Admin` or `Super Admin` in the administrator-role selector.

Only a `SUPER_ADMIN` can change administrator roles. An `ADMIN` can operate the
store but cannot grant roles.

## Promote an existing customer with D1

Use the customer's existing user row; do not create a duplicate:

```sql
INSERT INTO user_permissions(user_id, role)
SELECT id, 'ADMIN' FROM users WHERE email = 'person@example.com'
ON CONFLICT(user_id) DO UPDATE
SET role = 'ADMIN', updated_at = CURRENT_TIMESTAMP;
```

Use `SUPER_ADMIN` only for trusted owners who need permission-management access.

## Google OAuth

Store the Google OAuth values as Worker secrets:

```sh
npx wrangler secret put AUTH_GOOGLE_ID
npx wrangler secret put AUTH_GOOGLE_SECRET
```

The Google OAuth application's authorized callback URL is:

```text
https://kisangaurav.com/api/auth/callback/google
```

Google sign-in creates or links the customer account by verified email. It does
not automatically grant administrator privileges. Promote the account using the
Customers screen or the D1 statement above.

The Worker also requires a strong `AUTH_SECRET`:

```sh
npx wrangler secret put AUTH_SECRET
```


## Authorization behavior

- `SUPER_ADMIN` and `ADMIN` may open `/admin`.
- Only `SUPER_ADMIN` may grant or change administrator roles.
- All other roles receive: “You do not have administrator permissions.”
- Unauthenticated visitors are redirected to `/admin/login`.
- `/admin/logout` destroys the Auth.js session and returns to the login page.

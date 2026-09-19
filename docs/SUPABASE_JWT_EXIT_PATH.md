# Supabase access model, and the exit path when the legacy JWT secret goes away

Written 2026-09-18. Read this before touching `lib/supabase.ts` or any RLS policy.

## How it works today

Every member-facing query runs through `getUserSupabase(email)`. It mints a five-minute JWT per request, signed HS256 with the project's legacy JWT secret, carrying `role: authenticated` and `email: <her user_id, lowercased>`. The RLS policies on `his_files`, `user_profiles`, `verity_wrapped` and `search_reminders` compare that claim to `user_id`:

```sql
using ((select current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_id)
```

`consume_search()` reads the same claim inside the function. Nothing member-facing takes a user id as a parameter.

Environment variables involved:

| Variable | Where used | Notes |
|---|---|---|
| `SUPABASE_JWT_SECRET` | `lib/supabase.ts` mintUserToken | The legacy HS256 secret from Project Settings, JWT Keys. Server only. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | scoped and anon clients | Sent as the apikey header; the minted JWT is the Authorization header. |
| `SUPABASE_SERVICE_ROLE_KEY` | `getServiceSupabase()` | Bypasses RLS. Call sites listed below. |
| `VERITY_MASTER_KEY` | `lib/crypto.ts` | 32 bytes, hex or base64. Wraps per-member data keys. Unrelated to Supabase auth but lives in the same secret store. |
| `VERITY_MASTER_KEY_PREVIOUS` | `lib/crypto.ts` | Set only during a rotation; see `scripts/rotate-master-key.ts`. |
| `LOOKUP_HASH_SECRET` | `lib/lookups.ts` | HMAC key for the audit log. |

## Service role call sites

These are every place the service role is used. Add to this list before adding a call.

| File | Why it needs to bypass RLS |
|---|---|
| `app/api/stripe/webhooks/route.ts` | Stripe is the caller; there is no member session. Creates or updates `user_profiles` billing columns. |
| `app/api/cron/reminders/route.ts` | Reads every member's due reminders. |
| `lib/lookups.ts` (all functions) | `lookup_audit` and `account_flags` are written about an account, never by it, and have no policies by design. `hasJournalRelationship` reads a plaintext count from `his_files` for the flag rule. `anonymizeAuditTrail`, called last by account deletion, re-keys those rows from her email to a `deleted:` hash. |
| `scripts/encrypt-journal.ts`, `scripts/rotate-master-key.ts` | Run locally, never on Vercel. Rewrite every member's rows, and call `his_files_snapshot()`. |

Everything else runs as the member: `lib/hisfile.ts`, `lib/quota.ts` (via `consume_search()` and `founding_count()`), the reminder, profile, hisfile, wrapped, report and account-delete routes.

## What breaks when the legacy HS256 secret is retired

Supabase is moving projects to asymmetric JWT signing keys. Once this project's HS256 secret is revoked, PostgREST rejects every token we mint. Symptoms:

- Every scoped query returns 401 with a JWS or "invalid signature" error. His Files, profile, quota, reminders, Wrapped, account deletion and `consume_search()` all fail. The search route fails at its quota read, before spending anything.
- Service-role paths keep working: the webhook, the cron job, the audit log and flags.
- Nothing is lost. Data and policies are untouched; only the way we prove who is asking stops working.

Watch for: the dashboard banner about signing keys, and 401s from PostgREST in Vercel logs that mention the JWT.

## First thing to check

The new signing-key system may let a project keep an HS256 shared secret as one of its keys. If it does, the migration is: create the key, put its secret in `SUPABASE_JWT_SECRET`, redeploy. Nothing else changes. Verify this in the Supabase dashboard before planning the larger move below. I have not confirmed it.

## The larger move: real Supabase Auth users

If the only option is asymmetric keys, we cannot sign tokens ourselves and must let Supabase Auth issue them. The policies are already written against the `email` claim, which Supabase Auth tokens carry, so the policies do not change. What changes:

1. **Create an auth user per member.** In the `checkout.session.completed` webhook, call `auth.admin.createUser({ email, email_confirm: true })`, and backfill existing members with a one-off script. The auth user's email must equal `user_id` exactly (both lowercased by `normalizeEmail`).
2. **Get a Supabase session at sign-in.** After our own magic-link token verifies in `app/api/auth/verify/route.ts`, call `auth.admin.generateLink({ type: 'magiclink', email })` server-side and immediately exchange its `token_hash` with `auth.verifyOtp({ token_hash, type: 'magiclink' })`. That yields an access token and a refresh token without sending the member a second email.
3. **Store the refresh token server-side**, keyed to our session, or in a separate httpOnly cookie. Do not put it in the JWT we already issue.
4. **Replace `mintUserToken`** with "get a fresh access token": use the stored refresh token to obtain one via `auth.refreshSession` when the cached access token is within a minute of expiry. `getUserSupabase(email)` keeps its signature; only its body changes.
5. **Logout** should also call `auth.admin.signOut` for the member's refresh token.
6. **Account deletion** should call `auth.admin.deleteUser`.
7. **Policies:** none change. Optionally tighten them to also require `auth.uid() is not null`, since Supabase Auth tokens carry `sub`.
8. **`consume_search()` and `founding_count()`:** none change.

Estimated size: one webhook change, one auth route change, a small token cache, a backfill script, and a day of testing. The reason it is not done now is that it adds a second identity system, a refresh-token store and an email-uniqueness constraint we do not currently need.

## Rollback of the RLS change itself

`supabase/rls_owner_policies.sql` ends with the rollback statements. Reverting `lib/supabase.ts` to the service-role-everywhere version is a git revert. The old `app.user_id` policies are not worth restoring: nothing ever set that setting, so they never protected a row.

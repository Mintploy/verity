# Verity pre-launch audit

Date: 2026-09-17. Scope: full code review of this repo plus a read-only check of the live Supabase project (schema, RLS policies, security advisors). No paid third-party API calls were made. Nothing was fixed; this is the findings list.

Severity key: **P0** blocks launch or taking money. **P1** fix in the first week. **P2** fix soon. **P3** hygiene.

## P0: blocks launch

| # | Finding | Where | Why it matters |
|---|---------|-------|----------------|
| 1 | **The $19 single-report plan is unusable after payment.** Checkout runs in `payment` mode, so Stripe creates no Customer and the webhook skips profile creation and the welcome email. Even if a customer existed, both `send-magic-link` and `auth/verify` require an *active subscription*, which a one-time payment never has. | `lib/stripe.ts` createCheckoutSession, `app/api/stripe/webhooks/route.ts`, `app/api/auth/send-magic-link/route.ts`, `app/api/auth/verify/route.ts` | Every $19 buyer pays and gets nothing. Guaranteed chargebacks. Verify with one test-mode purchase before trusting this. |
| 2 | **"Verified women only" is not enforced anywhere.** Stripe Identity confirms the ID is real and the selfie matches. The code never reads sex from `verified_outputs`, so any person with a valid government ID passes. Privacy policy, help page and terms all claim you "receive your confirmed gender". | `app/api/stripe/verify-status/[sessionId]/route.ts`, `lib/stripe.ts` hasVerifiedIdentity | The core product promise is false. The men being searched can join. I believe Stripe Identity exposes `verified_outputs.sex` (values female / male / redacted) on document sessions; verify in the Stripe dashboard for your account and gate on it. |
| 3 | **Member enumeration via the login form.** `send-magic-link` returns 404 "No account found" vs 403 "No active membership" vs 200 "sent". No rate limit. | `app/api/auth/send-magic-link/route.ts` | An abuser can type a woman's email and learn she is a Verity member. For a safety product this is a real-world danger. Return the same "If that address has an account, a link is on its way" for every case, and rate limit by IP and email. |
| 4 | **Fabricated press logos.** "As featured in Vogue, The Cut, Refinery29, Goop, New York Times, Bustle" on the landing page. | `components/landing/PressStrip.tsx` | FTC deceptive advertising unless you actually have that coverage. Remove before taking money. |
| 5 | **Account deletion does not cancel billing or stop emails.** Deletes `his_files`, `verity_wrapped`, `user_profiles` only. Leaves `search_reminders` (his name, his phone, her email) so the cron keeps emailing her, leaves the Stripe subscription running, leaves the Identity session and customer in Stripe. Privacy policy says deletion is "immediate and irreversible" and covers "all associated data". | `app/api/account/delete/route.ts` | She "deletes" and is billed $297 next year with no profile to log into. CCPA deletion claim is false. Cancel the subscription, redact the VerificationSession, delete reminders, delete or anonymise the Stripe customer. |
| 6 | **No way to cancel a subscription.** Terms and help say "cancel any time", but there is no billing portal link, no cancel endpoint, and no instructions beyond an email address. The welcome email says "Renews only if you choose" while the subscription auto-renews and founding members are put on a schedule that steps up to $297. | `app/settings/page.tsx`, `lib/email.ts` sendWelcomeEmail, `lib/stripe.ts` scheduleFoundingStepUp | California's Automatic Renewal Law requires online cancellation for online signups plus clear renewal disclosure. Add a Stripe Customer Portal link in Settings and fix the email copy. Verify the current federal negative-option rule status with counsel; it changed in 2025. |
| 7 | **Logout is broken.** The nav links to `/api/auth/logout` with a plain `<Link>` (GET). The route only exports POST, so users get a 405. | `components/nav/Nav.tsx` line 212, `app/api/auth/logout/route.ts` | On a shared or borrowed device she cannot sign out. Session cookie lives 30 days on disk. |
| 8 | **Stalking enablement is unmitigated.** Search accepts name, email, or street address, not just phone. Reports show full address history with a current address, property, relatives with one-tap pivot to their reports. Combined with #2, anyone with an ID can locate anyone, including women. | `app/search/page.tsx`, `app/api/search/route.ts`, `app/report/[id]/page.tsx` RelativeSearch | This is the reputational and legal exposure that kills people-search products. Minimum: gate on sex (#2), restrict subjects to men where the data source reports sex, show current address at city level only, add a subject opt-out page and an abuse contact, log searches for abuse investigation (see #16 on how). |

## P1: first week

| # | Finding | Where | Detail |
|---|---------|-------|--------|
| 9 | **Identity check silently breaks past 100 verifications.** First login relies on scanning the 100 most recent VerificationSessions for a matching email because the Customer does not exist at verification time and the webhook never writes the flag. | `lib/stripe.ts` hasVerifiedIdentity | A woman who verified, paid, and logs in a week later gets bounced to "identity-required" and asked to verify again. Write `identity_verified` on the customer inside the `checkout.session.completed` webhook, or gate checkout on a signed "verified" cookie. |
| 10 | **Sessions expire after 2 hours; the cookie lives 30 days.** No refresh. Middleware then deletes the cookie and redirects to login. | `lib/auth.ts` createSessionToken, `app/api/auth/verify/route.ts` | She is logged out mid-afternoon and has to request a new magic link. Pick one: a 30-day session, or a short session with a rolling refresh in middleware. |
| 11 | **Unmetered paid lookups.** `/api/matches` bills Enformion up to three calls per hit and is not counted against quota. Its rate limit is an in-memory map, which on Vercel is per instance and effectively absent. | `app/api/matches/route.ts` | One $19 member can run thousands of billed picker calls. Count picker calls against quota, or rate limit in a shared store (Upstash / Vercel KV). |
| 12 | **Payment is taken before identity is checked.** `/api/stripe/checkout` is public and never confirms an identity session succeeded. The checkout page trusts a client-set `verity-pending-email` cookie. | `app/api/stripe/checkout/route.ts`, `app/checkout/page.tsx` | Anyone can skip `/verify`, pay, then be refused at login. Refund friction. Issue a signed cookie from `verify-status` when verified and require it at checkout. |
| 13 | **Privacy policy and help page are inaccurate.** Claims: "we receive your confirmed gender" (false, #2); "we do not store your searches, your reports, or the phone numbers you look up" (false: `his_files.report_data` stores the full report, `search_reminders` stores his phone and name); "the raw query is not retained" (false: request bodies with phone and name are logged, see #16). Does not name Anthropic (report narrative), Supabase, Vercel, CourtListener, or the FEC as recipients. Does not mention the 30-day reminder emails. | `app/privacy/page.tsx`, `app/help/page.tsx` | Rewrite to match what the code does. CCPA and FTC both treat privacy policy misstatements as deception. |
| 14 | **No public rate limiting on cost-bearing endpoints.** `/api/stripe/identity` (creates a Stripe Identity session per call), `/api/stripe/checkout`, `/api/auth/send-magic-link` (sends an email per call). | those routes | Email-bombing a member and running up Stripe Identity fees are both trivial. Stripe Identity pricing is per verification; I am not certain whether unstarted sessions are billed, verify. Add rate limiting at the edge (Vercel WAF rules or a KV counter). |
| 15 | **Data broker and data-source compliance.** Verity sells reports about people it has no relationship with. Under California's Delete Act that likely makes Mintploy a registrable data broker. Enformion contracts typically restrict permissible use and consumer-facing resale. | business | Confirm with counsel: CA data broker registration, Enformion's permitted-use terms for a consumer dating product, and whether DPPA or GLBA data is in the feed you display. Not verified here. |
| 16 | **Subject and searcher PII in server logs.** `ENFORMION_TRY` logs the full request body (phone, name). `ENFORMION_NO_RESULTS` and `ENFORMION_CANDIDATES` log the phone. `ENFORMION_CENSUS`, `ENFORMION_EMPTY` and `ENFORMION_SHAPE` log record contents. The webhook logs the member's email. | `lib/apis/enformion.ts` lines 342 to 1987, `app/api/stripe/webhooks/route.ts` | Vercel retains logs; anyone with dashboard access can see who searched whom. Strip PII from logs, keep call counts and status codes. If you want an abuse-investigation audit trail, write it to a restricted table instead, on purpose. |
| 17 | **Emails are not discreet.** Sender is `verity@mintploy.com` while the site is verityprive.com. Reminder subject line is "Time to re-run {his first name}". Welcome email footer says "FOR VERIFIED WOMEN ONLY". | `lib/email.ts` | A partner who sees her inbox or lock screen learns she is researching him. Use a neutral subject and sender name. Sender-domain mismatch also hurts deliverability and looks like phishing; put SPF, DKIM and DMARC on the sending domain in Resend and align it with the site. |
| 18 | **No inline accuracy disclaimer on the report.** Only the property section has one. A red score from a criminal record the matcher "corroborated" is shown as his with no "may not be the same person" language. | `app/report/[id]/page.tsx` | Misidentification plus a red score is a defamation claim. Put the FCRA / accuracy notice on the report itself, next to the score and next to criminal findings. |
| 19 | **`ALLOW_LIVE_LOOKUPS` must be `true` in production.** Otherwise every paying member gets sample data with a "Demo mode" banner. | env | Add to the launch checklist and to a startup config check alongside the existing `configErrorResponse`. |

## P2: soon after

| # | Finding | Where | Detail |
|---|---------|-------|--------|
| 20 | No security headers. No CSP, X-Frame-Options, Referrer-Policy, or Permissions-Policy. `poweredByHeader` on. | `next.config.ts` | Add a `headers()` block. Referrer-Policy matters because `/matches?phone=…` puts his number in the URL. |
| 21 | Magic-link tokens are reusable for 15 minutes; no single-use nonce. Token appears in the URL. | `lib/auth.ts` | Acceptable for now. Store a `jti` and reject reuse when you next touch auth. |
| 22 | `verifySessionToken` does not check a `purpose` claim. If `SESSION_SECRET` and `MAGIC_LINK_SECRET` were ever set to the same value, a magic-link or candidate token would work as a session cookie. No fail-fast if either secret is unset. | `lib/auth.ts`, `middleware.ts` | Add `purpose: 'session'` and assert both secrets exist and differ at startup. |
| 23 | Quota increment is read-then-write, not atomic. Concurrent requests can exceed the monthly limit; each one is a billed lookup. | `lib/quota.ts` consumeSearch | Use a single `update … where searches_this_month < limit returning` statement or a Postgres function. |
| 24 | Webhook is not idempotent. Stripe retries resend the welcome email, and a new checkout by an existing member resets the quota and overwrites the plan (an annual member buying a $19 single is downgraded to `single`). | `app/api/stripe/webhooks/route.ts` | Record processed event IDs; never lower a plan on upsert. |
| 25 | Founding step-up failure only logs. Nobody is alerted; she renews at $199 forever. | `lib/stripe.ts` scheduleFoundingStepUp | Send an alert (email or Slack) on failure, and reconcile weekly. |
| 26 | Route errors return `err.message` to the browser (search, hisfile, checkout, identity, verify-status). | several `app/api` routes | Return generic messages; log detail server-side. |
| 27 | Terms require 18+, Identity returns DOB, nothing checks it. | `app/api/stripe/verify-status` | Gate on `verified_outputs.dob`. |
| 28 | Supabase project has leftover tables and functions from another product (`subscriptions`, `payments`, `newsletter_subscribers`, `is_admin`, `count_owner_active_listings`, `archive_expired_timeboxed_listings`). The last is SECURITY DEFINER and executable by `anon`. Postgres has outstanding security patches. | Supabase advisors | Drop what Verity does not use, revoke anon execute, apply the Postgres upgrade. RLS on Verity's own tables is fine: policies key on `app.user_id`, which the anon key never sets, so anon reads are denied; only the service role is used server-side. |
| 29 | Subject phone stored in a non-httpOnly cookie for an hour (`verity-pending-phone`); `verity-pending-email` is set without `Secure`. | `lib/pending.ts`, `app/verify/page.tsx` | Low. Add `Secure`, or move to sessionStorage plus a query param on the email link. |

## P3: hygiene

- `Verity Site.zip` (3 MB design handoff) is committed at the repo root. Remove it.
- `README.md` is create-next-app boilerplate; `.replit` targets Cloud Run while `vercel.json` targets Vercel.
- `supabase/create_user_profiles.sql` does not match the live table (live has `id`, `plan`, `searches_*`, nullable email). Keep migrations in sync or delete the stale file.
- `share_token` for Wrapped uses `Math.random`. Nothing reads it today, but use `crypto.randomUUID()` before you ship sharing.
- The `identityVerified` flag in the session payload is never read.

## What is in good shape

- All data-touching API routes verify the session JWT themselves; the narrow middleware matcher is not a hole.
- Candidate and relative TahoeIds are signed server-side so the client cannot request arbitrary paid lookups.
- Stripe webhook signature is verified. Cron route is guarded by `CRON_SECRET`.
- Supabase RLS is enabled everywhere and the anon key is not shipped to the browser.
- No secrets in the repo or git history. No `dangerouslySetInnerHTML`.
- Emails ship a plain-text part. Cookies are httpOnly, SameSite=Lax, Secure in production.

## Suggested order of work

1. Fix or remove the single-report plan (#1). Fastest path: remove it from checkout until the login model supports one-time buyers.
2. Gate on sex and age from Stripe Identity, write the verified flag in the webhook, require it at checkout (#2, #9, #12, #27).
3. Uniform magic-link response plus rate limiting on the three public endpoints (#3, #14).
4. Remove the press strip (#4).
5. Customer Portal link, fixed renewal copy, full account deletion (#5, #6).
6. Logout as a POST button (#7).
7. Rewrite privacy policy and help page to match the code; add report disclaimers (#13, #18).
8. Address-level and relative-pivot mitigations, subject opt-out, abuse contact (#8).
9. Strip PII from logs, make emails discreet, align sending domain (#16, #17).
10. Session lifetime, picker metering, security headers (#10, #11, #20).

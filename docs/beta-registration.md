# Beta registration gate

The browser submits `data.beta_code` only for password signup. There is no
client-side secret or allow/deny decision. Existing login, recovery and local
tasks do not depend on the gate. OTP login keeps `create_user: false`.

## Deploy

1. Run `supabase-beta-registration.sql` as the project database administrator.
2. Separately set the private singleton row's `code_sha256` to the SHA-256 hex
   verifier of the exact, trimmed operator-provided code. Do not commit the code,
   verifier or configuration query to Git. Missing/disabled configuration fails
   closed, not open.
3. Publish the signup input and verify the live page contains `authBetaCode`.
4. In Authentication > Auth Hooks, enable Before User Created with the Postgres
   function `public.check_beta_signup`. Do not change any existing auth hooks.
5. Verify missing/wrong codes are denied by the real signup API. Verify the
   correct code passes the hook, and test a controlled signup/email flow when a
   test mailbox is available. Existing login and sync must still succeed.

The private schema is not exposed through the Data API. Only the existing
Supabase Auth role may read the verifier or execute the hook. The INSERT/UPDATE
triggers remove the transient input from both stored user metadata and identity
data, so later login/confirmation does not return it in the account or tokens.
The initial signup response may echo caller-supplied identity metadata; never
persist that unconfirmed response. Validation must remain in the Before User
Created hook, not in the cleanup triggers. Do not log signup request bodies.

## Tests and rollback

Run the existing auth smoke/regression flows and `tests/beta-signup.js` against
an isolated local browser. Its mocked code is not the production code.
Use a transaction with a temporary verifier to test the SQL hook's accept,
reject, disabled/missing configuration, role permissions and cleanup behavior;
roll back without creating permanent accounts or sending emails.

If deployment fails, keep the gate fail-closed and keep the local-use path
available. Disabling the hook reopens public registration and requires a
separate explicit decision. A shared code limits entry, not the total number
of users; it can be forwarded by anyone who knows it.

## Validation record (2026-10-16)

- Local browser: beta-signup, auth-smoke and auth-flow-regression passed with
  mocked APIs, including local task persistence and 360/390/430px signup bounds.
- Live browser: beta-live-smoke passed against the deployed site and real Auth
  API; missing input is caught in the form and invalid input receives HTTP 403.
- Direct live API: missing, wrong, missing punctuation and changed-case codes
  all returned the gate's HTTP 403 response. OTP auto-signup without a code also
  returned HTTP 403. Anonymous gate RPC/table reads were denied.
- Database: transaction-based hook/permission/cleanup tests passed and rolled
  back. Production verifier accepted the operator-provided code. Persisted
  user/identity metadata was checked for transient-code removal.
- The operator completed a real controlled-mailbox signup/confirmation and
  reported success. Password and mailbox verification were user-operated; no
  password, verification token, test mailbox or production verifier is recorded
  here. This is user-confirmed email testing, not automated inbox inspection.

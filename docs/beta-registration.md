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
trigger removes the transient input from stored auth metadata before issuance
of tokens; validation must remain in the Before User Created hook, not in this
cleanup trigger. Do not log signup request bodies.

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

# Account recovery release checklist

## Current production blocker

On 2026-09-18 an unauthenticated diagnostic request using an intentionally invalid recovery token and the production redirect returned HTTP 303 with a Location beginning `http://localhost:3000`. No real token or account was used. Production redirect configuration must be corrected before declaring mail flows working.

## Supabase dashboard changes

- Project: `dnmszveczfcrbtzdehoj`.
- Authentication > URL Configuration: set Site URL to `https://dre645494896.github.io/-/`.
- Add that exact URL to allowed Redirect URLs. Preserve the existing native `jijiandaiban://auth/callback` entry. Do not add broad wildcard origins or disable email confirmation.
- Authentication > Email Templates > Magic Link: include the server-issued `{{ .Token }}` for numeric email sign-in. Do not substitute a recovery template for this template.
- Reset Password: retain `{{ .ConfirmationURL }}` so Supabase verifies the recovery token before returning to the application.
- Verify that the email provider permits delivery to the test recipients. Do not purchase SMTP service or change credentials without approval.

Suggested Magic Link body:

```html
<h2>极简待办登录验证码</h2>
<p>请回到极简待办，在邮箱验证码登录页面输入：</p>
<p style="font-size:28px;font-weight:bold">{{ .Token }}</p>
<p>验证码仅供本人登录使用，请勿转发。请使用最新邮件中的验证码。</p>
<p>如果不是你本人操作，请忽略本邮件。</p>
```

Suggested Reset Password body:

```html
<h2>重置极简待办密码</h2>
<p>点击下方链接验证邮箱，然后在网页中设置新密码。</p>
<p><a href="{{ .ConfirmationURL }}">设置新密码</a></p>
<p>如果不是你本人操作，请忽略本邮件。请勿转发此链接。</p>
```

## Required real-world acceptance (not yet completed)

- Recheck the invalid-token redirect; Location must begin with the production HTTPS URL, not localhost.
- Use a user-designated mailbox; do not collect passwords, OTPs or full confirmation links in the conversation.
- Request email OTP from local and production pages. Verify numeric code delivery and sign-in after reload.
- Request recovery, open the newest message on a phone, verify the new-password form, refresh it, and have the user enter and submit a new password themselves.
- Verify new-password login, old-password rejection, used/expired link feedback and rate-limit errors.
- Confirm original tasks, images, notes and settings remain intact.
- Test Safari and the mail client's embedded browser on a real phone. Desktop mobile emulation does not count as this acceptance.
- Publish only the account fix, not the Liquid Glass branch. Complete the same checks on the released version.

## Local regression evidence

Playwright CLI regression snippets (API responses mocked) cover local-to-production redirect values, recovery refresh, callback token cleanup, same-tab hash callback, no uploads before identity verification/data hydration, preservation of guest snapshots, empty cloud accounts, failed read retry, OTP verification without client send-state, registration, error feedback and mobile button bounds. These do not establish real email delivery.

References: https://supabase.com/docs/guides/auth/redirect-urls and https://supabase.com/docs/guides/auth/auth-email-templates

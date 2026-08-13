# Deployment environments

Use separate Supabase projects and provider accounts for development, staging,
and production. Never point a local build at production by default.

The canonical production Supabase project is `sznafsdzdwiwhcgrfzcb` at
`https://sznafsdzdwiwhcgrfzcb.supabase.co`. Production frontend variables,
migrations, and Edge Function deployments must all be verified against that
project before release.

## Frontend variables

Copy `.env.example` to an ignored `.env` and configure the environment's
publishable Supabase URL and key. No service-role or provider secret may use a
`VITE_` prefix.

## Edge Function secrets

Configure only the providers enabled for that environment:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `ALLOWED_CALLBACK_ORIGINS` as a comma-separated exact origin allowlist
- `SMS_PROVIDER` (`termii` or `twilio`)
- `TERMII_API_KEY`, `TERMII_SENDER_ID`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`,
  `TWILIO_WHATSAPP_FROM`
- `CRON_SECRET` and `ALERT_CRON_SECRET`

## Release sequence

1. Create a pull request from a feature branch.
2. Require formatting, lint, strict and project TypeScript, unit coverage, and
   production build checks.
3. Apply migrations to staging and run `supabase db lint`.
4. Deploy staging Edge Functions and exercise incident reporting, alert
   dispatch, payment initialization, payment verification, and webhook retry.
5. Review logs using correlation IDs and verify no sensitive payloads appear.
6. Back up production, apply migrations, deploy functions, then deploy the UI.
7. Smoke-test production with non-sensitive test records and monitor failures.

## Branch protection

Protect `main`; require pull requests, at least one approval, resolved review
conversations, the `Quality / verify` check, and the Paystack E2E check when its
paths change. Disable administrator bypass for routine releases.

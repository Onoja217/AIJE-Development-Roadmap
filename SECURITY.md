# Security operations

## Credential rotation required

An environment file was previously committed. Removing it from the current
branch does not remove it from Git history. Secret values are intentionally not
reproduced here.

Before the next production release, a project owner must:

1. Rotate the Supabase publishable/anon key and update deployment environments.
2. Review Supabase authentication logs for unexpected use of the old key.
3. Rotate any Paystack, Twilio, Termii, cron, or integration secret that was
   ever stored in a committed environment file.
4. Update secrets independently in development, staging, and production.
5. Redeploy Edge Functions and the frontend, verify payments and alerts, then
   revoke the old credentials.

History rewriting is disruptive because every contributor must re-clone or
carefully rebase. Coordinate it with all maintainers, use `git filter-repo` to
remove `.env` from every ref, force-push only after backups and approval, and
rotate credentials regardless—the old objects may already have been copied.

## Secret handling

- Browser code may contain only `VITE_` publishable values.
- Service-role, payment-provider, messaging, and cron secrets belong only in
  Supabase Edge Function secrets.
- Never log bearer tokens, provider signatures, raw payment payloads, contact
  phone numbers, face descriptors, or incident media URLs.
- Correlation IDs may be logged and returned for support diagnostics.

## Data protection baseline

- Camera media uses private storage and short-lived signed URLs.
- Face processing remains on-device; raw face images must not be persisted.
- Incident, contact, and location data must be retained only for an approved
  operational period and removed through an audited administrative process.
- Production access should require least-privilege roles and MFA for operators.

## Reporting a vulnerability

Do not open a public issue containing exploit details or personal data. Contact
the repository owner privately with reproduction steps and a correlation ID if
one was returned by the application.

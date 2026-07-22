# Community Alert System

## What is included

The protected `/community-alerts` screen manages watch groups, group members,
emergency contacts, localized alert composition, bulk SMS/WhatsApp dispatch and
an offline browser outbox. Supabase stores alerts, targets, delivery attempts and
escalation history. An unresolved alert is raised one priority level and sent to
contacts at the next authority level whenever its escalation deadline expires.

SMS is supported through Termii or Twilio. WhatsApp uses the Twilio WhatsApp API.
Media metadata is stored with an alert and the first image/map URL is included in
WhatsApp messages, leaving the delivery model ready for richer templates later.

## Local development

Requirements: Node.js 20+, npm, Docker Desktop and Supabase CLI.

```bash
npm install
supabase start
supabase db reset
```

Copy the local API URL and anon key printed by `supabase status` into `.env.local`:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your-local-anon-key
```

Serve the edge functions in separate terminals:

```bash
supabase functions serve dispatch-community-alert --env-file supabase/.env.local
supabase functions serve escalate-community-alerts --env-file supabase/.env.local --no-verify-jwt
npm run dev
```

Open `http://localhost:8080`, sign in, and use **Community Alerts** in the header.

## Provider secrets

Create `supabase/.env.local` for local use. Do not commit it.

Termii SMS:

```dotenv
SMS_PROVIDER=termii
TERMII_API_KEY=...
TERMII_SENDER_ID=AIJE
ALERT_CRON_SECRET=use-a-long-random-value
```

Twilio SMS and WhatsApp:

```dotenv
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_SMS_FROM=+1...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ALERT_CRON_SECRET=use-a-long-random-value
```

Twilio WhatsApp recipients must have opted in and production message templates
must be approved where required by WhatsApp's business messaging rules.

## Production deployment

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set --env-file supabase/.env.production
supabase functions deploy dispatch-community-alert
supabase functions deploy escalate-community-alerts --no-verify-jwt
npm run build
```

Schedule a POST request every minute to:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/escalate-community-alerts
```

Include `x-cron-secret: <ALERT_CRON_SECRET>`. Supabase Cron, GitHub Actions or any
reliable scheduler can perform this request. The function is idempotent per alert
deadline: after processing, it advances `next_escalation_at`.

To resolve an incident, update its `community_alerts.status` to `resolved`, set
`resolved_at`, and clear `next_escalation_at`. The RLS policy permits only the
alert owner to do this.

## Verification

```bash
npm run lint
npm run test
npm run build
supabase functions serve dispatch-community-alert --env-file supabase/.env.local
```

Use provider sandbox/test numbers before activating real community recipients.
The Idoma emergency glossary in `src/lib/communityAlertI18n.ts` must receive a
final safety review from a qualified native Idoma translator before public use;
emergency terminology should never rely on unreviewed machine translation.

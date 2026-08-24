# Production launch gate

Do not mark an item complete without the date, environment, operator, result,
and a link to durable evidence.

## Owner-controlled prerequisites

- [ ] Rotate every credential listed in `SECURITY.md`, redeploy, test, revoke
  old values, and review authentication/provider logs.
- [ ] Require `Quality / verify` and `Incident Lifecycle E2E / lifecycle` in
  `main` branch protection.
- [ ] Set `VITE_DEPLOYMENT_ENV=production` and
  `VITE_COMMUNITY_SYNC_MODE=live` in production.

## Staging database and RLS

1. Back up staging and record its recovery point.
2. Run `supabase migration list --linked` and confirm local/remote parity.
3. Run `supabase db lint --linked --level warning`.
4. Dispatch Incident Lifecycle E2E and preserve its run URL.
5. Test every role plus a user from another organization; confirm unauthorized
   reads and mutations fail.

## Failure drills

- Provider: exercise 401, 429, 503, malformed JSON, and timeout responses.
  Confirm bounded retries, degraded UI, no synthetic live records, and alerts.
- Offline: submit offline, restart, reconnect, and verify exactly-once sync.
  Fill the queue and confirm clear recovery instructions without data loss.
- Messaging/payment: disable each staging provider and verify retries,
  dead-letter visibility, idempotency, and operator escalation.

## Monitoring and recovery

- [ ] Alert on Edge Function errors, failed webhooks, delivery failures, stale
  integrations, queue exhaustion, and database/storage capacity.
- [ ] Route alerts to staffed primary and backup responders and test paging.
- [ ] Enable point-in-time recovery or scheduled backups.
- [ ] Restore a backup into an isolated project and record achieved RTO/RPO.
- [ ] Verify logs contain correlation IDs but no sensitive payloads.

## Supervised field pilot

- [ ] Approve geography, participants, privacy notice, escalation contacts, and
  a non-app fallback channel.
- [ ] Train operators/responders and exercise good, poor, and no connectivity.
- [ ] Record latency, duplicates/loss, false data, usability failures, and
  responder acknowledgement time.
- [ ] Obtain named safety and operational approval before expanding scope or
  treating the application as the sole emergency channel.

// src/components/EmergencyReportContainer.tsx
//
// The integration point that actually connects everything built so far:
//   - EmergencyReportForm (existing component) gets its onSubmitReport
//     prop wired to saveReport() from the offline repository — this is
//     the exact hookup EmergencyReportForm.tsx's header comment describes.
//   - OfflineBanner and SyncStatusPanel are mounted alongside it so the
//     required UI (offline indicator, pending count, sync progress, last
//     sync time) is always visible on the same screen a user submits a
//     report from, not on some separate page they'd have to navigate to.
//
// This component intentionally contains almost no logic of its own —
// everything it renders is a self-contained module (the form, the
// banner, the panel) that already knows how to do its own job. This
// component's only responsibility is composition and the one prop wire-up.

import { useCallback } from "react";
import { EmergencyReportForm } from "./EmergencyReportForm";
import { OfflineBanner } from "./OfflineBanner";
import { SyncStatusPanel } from "./SyncStatusPanel";
import { saveReport } from "../lib/offline/db/reportsRepository";
import type { EmergencyReport } from "../types/report";

export function EmergencyReportContainer() {
  // saveReport's own contract (see reportsRepository.ts) already matches
  // onSubmitReport's signature exactly — validate, persist to IndexedDB,
  // return quickly without waiting on any network call. This wrapper
  // exists only so a thrown ValidationFailedError (defense-in-depth
  // re-validation — see lib/offline/validation.ts) or a
  // StorageQuotaExceededError surfaces to the form as a plain rejected
  // Promise, which is exactly what onSubmitReport already expects and
  // handles via its own try/catch (see EmergencyReportForm's onSubmit,
  // which sets submitState to "error" on any thrown error).
  const handleSubmitReport = useCallback(async (report: EmergencyReport) => {
    await saveReport(report);
    // Deliberately not awaiting a sync attempt here — useSyncEngine
    // (mounted inside SyncStatusPanel, via its own hook) already reacts
    // to the "report saved" event and triggers a sync pass on its own.
    // Blocking the form's "Saved" confirmation on an actual network round
    // trip would defeat the entire point of offline-first: the user
    // should see "saved" the instant it's durably on their device,
    // regardless of whether a network exists to send it onward yet.
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      <div className="px-4 py-6 space-y-6">
        <EmergencyReportForm onSubmitReport={handleSubmitReport} />
        <SyncStatusPanel />
      </div>
    </div>
  );
}
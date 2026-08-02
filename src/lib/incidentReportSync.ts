// Offline-safe submission path for citizen incident reports.
//
// Reports are queued in IndexedDB (see lib/syncEngine.ts) and pushed to the
// backend as soon as connectivity and an authenticated session are available.

import { supabase } from "@/integrations/supabase/client";
import { enqueue, registerSyncHandler } from "./syncEngine";
import type { EmergencyReport } from "@/types/report";

export const INCIDENT_REPORT_COLLECTION = "incident_reports";

let registered = false;

export function registerIncidentReportSync() {
  if (registered) return;
  registered = true;

  registerSyncHandler<EmergencyReport>(
    INCIDENT_REPORT_COLLECTION,
    async (report) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Sign in required to submit incident reports");
      }

      const { error } = await supabase.from("incident_reports").upsert(
        {
          reporter_id: user.id,
          client_id: report.id,
          title: report.title,
          category: report.category,
          description: report.description,
          contact: report.contact ?? null,
          address: report.location?.address ?? null,
          latitude: report.location?.lat ?? null,
          longitude: report.location?.lng ?? null,
          manual_location: report.location?.manualEntry ?? null,
          image_count: report.images?.length ?? 0,
          occurred_at: report.timestamp,
        },
        { onConflict: "reporter_id,client_id" }
      );

      if (error) throw error;
    }
  );
}

/** Queue a citizen report; resolves once it is stored locally. */
export async function submitIncidentReport(report: EmergencyReport) {
  registerIncidentReportSync();
  // Image data URLs stay on the device: only metadata is synchronised.
  const { images, ...rest } = report;
  await enqueue(INCIDENT_REPORT_COLLECTION, {
    ...rest,
    images: (images ?? []).map((img) => ({ ...img, dataUrl: "" })),
  } as EmergencyReport);
}

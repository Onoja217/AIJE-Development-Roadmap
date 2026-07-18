// src/lib/offline/sync/syncClient.ts
//
// The only module that talks to the network on behalf of the sync engine.
// Two responsibilities, in order, per report:
//   1. Upload any not-yet-uploaded images to Supabase Storage.
//   2. Call the emergency-report-sync Edge Function with the report body
//      (referencing uploaded image paths, not raw image data) so the
//      server-side row stays small and image bytes never touch Postgres.
//
// WHY STORAGE + EDGE FUNCTION RATHER THAN A DIRECT TABLE UPSERT: business
// logic like conflict detection (comparing clientVersion vs the server's
// current version) belongs server-side, where it can be trusted — a
// direct client upsert would let a malicious or buggy client claim any
// version number it likes. Routing through an Edge Function also matches
// the existing house pattern seen in paystack-webhook (Deno.serve,
// service-role admin client, structured logging).

import { supabase } from "../../../integrations/supabase/client";
import type { StoredEmergencyReport, SyncStatus } from "../../../types/report";

const STORAGE_BUCKET = "emergency-report-images";
const SYNC_FUNCTION_NAME = "emergency-report-sync";

export interface SyncSuccessResult {
  kind: "success";
  serverVersion: number;
  syncedAt: string;
}

export interface SyncConflictResult {
  kind: "conflict";
  serverVersion: number;
  serverRecord: unknown;
}

export interface SyncErrorResult {
  kind: "error";
  message: string;
  /** Whether it's worth retrying (network blip, 5xx) vs not (validation rejected, 4xx client error). */
  retryable: boolean;
}

export type SyncOutcome = SyncSuccessResult | SyncConflictResult | SyncErrorResult;

/**
 * Uploads any images in `report.images` that aren't yet reflected in
 * `report.uploadedImagePaths`. Idempotent by construction: images already
 * present in uploadedImagePaths are skipped, so re-running this after a
 * partial failure (some images uploaded, then connection dropped) only
 * uploads what's still missing rather than re-uploading everything.
 *
 * Returns the updated path map; does not mutate the input report (the
 * caller — syncQueue — is responsible for persisting the returned map via
 * updateReport, keeping this function free of storage side effects).
 *
 * Time complexity: O(m) in number of images (m <= 5), sequential to keep
 * memory bounded — uploading all 5 concurrently would hold every
 * compressed Blob in memory and in flight simultaneously, which is
 * unnecessary given the low image count and matters more on constrained
 * mobile devices/connections.
 */
async function uploadPendingImages(
  report: StoredEmergencyReport
): Promise<{ paths: Record<string, string>; failed: boolean; error?: string }> {
  const paths = { ...report.uploadedImagePaths };

  if (report.images.length === 0) {
    return { paths, failed: false };
  }

  // Storage RLS scopes objects by the uploader's user id as the FIRST path
  // segment (see the migration's storage.objects INSERT policy) — this is
  // required precisely because the emergency_reports row doesn't exist
  // yet at upload time, so RLS can't check ownership via a table join and
  // must check the authenticated caller directly instead.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { paths, failed: true, error: "Not authenticated — cannot upload images." };
  }

  for (const image of report.images) {
    if (paths[image.id]) continue; // already uploaded

    const ext = image.mimeType.split("/")[1] || "jpg";
    const path = `${user.id}/${report.id}/${image.id}.${ext}`;

    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, image.blob, {
      contentType: image.mimeType,
      upsert: true, // safe to overwrite: same report id + image id = same logical image, retried upload
    });

    if (error) {
      return { paths, failed: true, error: error.message };
    }

    paths[image.id] = path;
  }

  return { paths, failed: false };
}

/**
 * Attempts to sync a single report: uploads outstanding images, then
 * calls the sync Edge Function with the report body + uploaded image
 * paths. The report's own `id` is sent as the idempotency key — see the
 * Edge Function for how duplicate calls with the same id are handled
 * without creating duplicate rows.
 */
export async function syncReport(report: StoredEmergencyReport): Promise<SyncOutcome & { uploadedImagePaths?: Record<string, string> }> {
  const imageResult = await uploadPendingImages(report);

  if (imageResult.failed) {
    return {
      kind: "error",
      message: `Image upload failed: ${imageResult.error}`,
      retryable: true,
      uploadedImagePaths: imageResult.paths, // partial progress is still worth persisting
    };
  }

  const payload = {
    id: report.id,
    title: report.title,
    category: report.category,
    description: report.description,
    timestamp: report.timestamp,
    location: report.location,
    contact: report.contact ?? null,
    clientVersion: report.clientVersion,
    imagePaths: imageResult.paths,
  };

  try {
    const { data, error } = await supabase.functions.invoke(SYNC_FUNCTION_NAME, {
      body: payload,
      headers: { "Idempotency-Key": report.id },
    });

    if (error) {
      // supabase-js surfaces non-2xx responses as `error`; the actual
      // status/body needed to distinguish retryable vs terminal failures
      // lives on error.context when available (FunctionsHttpError).
      const status = (error as { context?: { status?: number } }).context?.status;
      const retryable = !status || status >= 500;
      return {
        kind: "error",
        message: error.message ?? "Sync request failed",
        retryable,
        uploadedImagePaths: imageResult.paths,
      };
    }

    if (data?.conflict) {
      return {
        kind: "conflict",
        serverVersion: data.serverVersion,
        serverRecord: data.serverRecord,
        uploadedImagePaths: imageResult.paths,
      };
    }

    return {
      kind: "success",
      serverVersion: data.serverVersion,
      syncedAt: data.syncedAt,
      uploadedImagePaths: imageResult.paths,
    };
  } catch (err) {
    // Network-level failure (fetch threw — DNS, connection reset,
    // timeout). Always retryable, since it's indistinguishable from a
    // transient connectivity issue rather than the server actively
    // rejecting the request.
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Unknown network error",
      retryable: true,
      uploadedImagePaths: imageResult.paths,
    };
  }
}

/** Maps a SyncOutcome to the SyncStatus that should be persisted locally. */
export function outcomeToSyncStatus(outcome: SyncOutcome): SyncStatus {
  switch (outcome.kind) {
    case "success":
      return "synced";
    case "conflict":
      return "conflict";
    case "error":
      return "failed";
  }
}
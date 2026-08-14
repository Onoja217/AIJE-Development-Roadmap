import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extract a human-readable message from an unknown thrown value. */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

/** Extract the JSON error returned by a Supabase Edge Function invocation. */
export async function getFunctionErrorMessage(
  error: unknown,
  fallback = "The service request failed",
): Promise<string> {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const payload = (await context.clone().json()) as {
          error?: unknown;
          message?: unknown;
        };
        if (typeof payload.error === "string" && payload.error) {
          return payload.error;
        }
        if (typeof payload.message === "string" && payload.message) {
          return payload.message;
        }
      } catch {
        // Fall through to the SDK error message when the response is not JSON.
      }
    }
  }
  return getErrorMessage(error, fallback);
}

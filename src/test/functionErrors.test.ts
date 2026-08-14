import { describe, expect, it } from "vitest";
import { getFunctionErrorMessage } from "@/lib/utils";

describe("getFunctionErrorMessage", () => {
  it("surfaces the JSON error returned by an Edge Function", async () => {
    const error = {
      message: "Edge Function returned a non-2xx status code",
      context: new Response(
        JSON.stringify({ error: "callback_url origin is not allowed" }),
        { status: 422, headers: { "content-type": "application/json" } },
      ),
    };

    await expect(getFunctionErrorMessage(error)).resolves.toBe(
      "callback_url origin is not allowed",
    );
  });

  it("falls back to the original SDK error message", async () => {
    await expect(
      getFunctionErrorMessage(new Error("Network request failed")),
    ).resolves.toBe("Network request failed");
  });
});

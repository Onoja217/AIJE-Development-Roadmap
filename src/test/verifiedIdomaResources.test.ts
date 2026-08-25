import { describe, expect, it } from "vitest";

import { VERIFIED_IDOMA_RESOURCES } from "@/data/verifiedIdomaResources";
import { isIdomaLandResource } from "@/lib/idomaLand";

describe("verified Idoma-land resources", () => {
  it("publishes only provenance-backed, geocoded, verified records", () => {
    expect(VERIFIED_IDOMA_RESOURCES.length).toBeGreaterThanOrEqual(2);

    for (const resource of VERIFIED_IDOMA_RESOURCES) {
      expect(resource.verificationStatus).toBe("verified");
      expect(resource.verificationSourceUrl).toMatch(/^https:\/\//);
      expect(resource.verificationSourceRecordId).toBeTruthy();
      expect(resource.lastVerifiedAt).toBeTruthy();
      expect(Number.isFinite(resource.lat)).toBe(true);
      expect(Number.isFinite(resource.lng)).toBe(true);
      expect(isIdomaLandResource(resource)).toBe(true);
    }
  });

  it("does not claim live availability or capacity without live evidence", () => {
    for (const resource of VERIFIED_IDOMA_RESOURCES) {
      expect(resource.status).toBeUndefined();
      expect(resource.availableCapacity).toBeUndefined();
      expect(resource.maximumCapacity).toBeUndefined();
    }
  });
});

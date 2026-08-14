import { describe, expect, it } from "vitest";
import { osirisDemoPayload } from "@/integrations/osiris/demoData";
import {
  countExpiredAssessments,
  osirisPercentage,
  sortOsirisAssessments,
} from "@/lib/osirisUtils";

describe("Osiris intelligence utilities", () => {
  it("normalizes decimal and whole-number confidence values", () => {
    expect(osirisPercentage(0.76)).toBe(76);
    expect(osirisPercentage(83)).toBe(83);
  });

  it("prioritizes assessments by severity and then threat score", () => {
    const sorted = sortOsirisAssessments(osirisDemoPayload.assessments);
    expect(sorted[0].threatLevel).toBe("critical");
  });

  it("identifies expired assessments against a supplied audit time", () => {
    const assessments = osirisDemoPayload.assessments.map((item, index) => ({
      ...item,
      expiresAt: index === 0 ? "2026-01-01T00:00:00.000Z" : undefined,
    }));
    expect(countExpiredAssessments(assessments, new Date("2026-01-02"))).toBe(
      1,
    );
  });
});

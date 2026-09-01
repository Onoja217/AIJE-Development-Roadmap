import { describe, expect, it } from "vitest";
import {
  buildAlertAnalytics,
  filterAlertEvents,
  seedAlertEvents,
  type AlertEvent,
} from "@/lib/alertDashboard";

describe("alert dashboard utilities", () => {
  it("filters alerts across camera, date, severity, and detection toggles", () => {
    const filtered = filterAlertEvents(seedAlertEvents, {
      camera: "Gatehouse",
      date: "2026-09-01",
      severity: "High",
      status: "Resolved",
      personDetection: true,
      motionDetection: true,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].cameraName).toBe("Gatehouse");
    expect(filtered[0].status).toBe("Resolved");
  });

  it("aggregates analytics for charts", () => {
    const analytics = buildAlertAnalytics(seedAlertEvents);

    expect(analytics.alertsPerDay.length).toBeGreaterThan(0);
    expect(analytics.byCamera.some((entry) => entry.camera === "Gatehouse")).toBe(true);
    expect(analytics.threatLevels.some((entry) => entry.level === "High")).toBe(true);
    expect(analytics.mostActiveHours.length).toBeGreaterThan(0);
  });

  it("preserves the alert event shape expected by the dashboard", () => {
    const event = seedAlertEvents[0] as AlertEvent;
    expect(event).toMatchObject({
      id: expect.any(String),
      cameraName: expect.any(String),
      timestamp: expect.any(String),
      threatScore: expect.any(Number),
      severity: expect.any(String),
      detectionType: expect.any(String),
      status: expect.any(String),
    });
  });
});

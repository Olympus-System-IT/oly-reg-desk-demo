import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/hms/seed";
import {
  getDashboardSummary,
  getCollectionsTrend,
  getAppointmentVolume,
  getRevenueByCategory,
  getOperationalPanels,
} from "@/features/dashboard/services/dashboard";
import type { DashboardFilters } from "@/features/dashboard/types";

describe("Dashboard Selectors & Data Aggregation", () => {
  const db = buildSeed();
  const filters: DashboardFilters = {
    preset: "30d",
    dateFrom: "2026-09-10",
    dateTo: "2026-10-10",
  };

  it("calculates exactly 5 summary KPIs and enforces role boundaries", () => {
    // Admin / Manager / Receptionist
    const adminKpis = getDashboardSummary(db, filters, "admin");
    expect(adminKpis.length).toBe(5);
    expect(adminKpis.map((k) => k.id)).toEqual([
      "today-appts",
      "cancelled-today",
      "doctors-available",
      "net-collections",
      "outstanding-balance",
    ]);

    // Nurse
    const nurseKpis = getDashboardSummary(db, filters, "nurse");
    expect(nurseKpis.length).toBe(3); // Excludes financial metrics
    expect(nurseKpis.some((k) => k.id === "net-collections")).toBe(false);
    expect(nurseKpis.some((k) => k.id === "outstanding-balance")).toBe(false);
    expect(nurseKpis.every((k) => !k.formattedValue.includes("LKR"))).toBe(true);
  });

  it("generates collections trend with netCollections, billed, collected, and refunds", () => {
    const trend = getCollectionsTrend(db, filters);
    expect(trend.length).toBe(31); // 10 Sep to 10 Oct inclusive
    expect(trend.every((p) => typeof p.netCollections === "number")).toBe(true);
    expect(trend.every((p) => typeof p.billed === "number")).toBe(true);
    expect(trend.every((p) => typeof p.collected === "number")).toBe(true);
    expect(trend.every((p) => typeof p.refunds === "number")).toBe(true);
  });

  it("breaks down appointment volume by status accurately", () => {
    const volume = getAppointmentVolume(db, filters);
    expect(volume.length).toBe(31);
    for (const v of volume) {
      expect(v.completed + v.waiting + v.cancelled + v.noShow).toBe(v.total);
    }
  });

  it("calculates category revenue percentages totaling 100%", () => {
    const cats = getRevenueByCategory(db, filters);
    if (cats.length > 0) {
      const sumPct = cats.reduce((s, c) => s + c.percentage, 0);
      expect(sumPct).toBeGreaterThanOrEqual(98);
      expect(sumPct).toBeLessThanOrEqual(102); // Allow small rounding deviation
    }
  });

  it("returns exactly 4 operational panels with at most 5 items each", () => {
    const panels = getOperationalPanels(db, "admin");
    expect(panels.todaySessions.length).toBeLessThanOrEqual(5);
    expect(panels.upcomingSessions.length).toBeLessThanOrEqual(5);
    expect(panels.recentPayments.length).toBeLessThanOrEqual(5);
    expect(panels.failedMessages.length).toBeLessThanOrEqual(5);
  });
});

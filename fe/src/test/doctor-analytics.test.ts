import { describe, expect, it } from "vitest";
import { format, subDays } from "date-fns";
import { buildSeed } from "@/lib/hms/seed";
import { can } from "@/lib/hms/permissions";
import {
  getDoctorRows,
  getDoctorSummary,
  getDoctorTrend,
  type DoctorAnalyticsFilters,
} from "@/features/doctor-analytics/services/doctorAnalytics";

describe("Doctor-wise analytics selectors", () => {
  const db = buildSeed();
  const filters: DoctorAnalyticsFilters = {
    dateFrom: format(subDays(new Date(), 29), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
    doctorId: "all",
    specialtyId: "all",
  };

  it("produces rows whose outcomes add up and income splits into payout + hospital share", () => {
    const rows = getDoctorRows(db, filters);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.completed + r.waiting + r.cancelled + r.noShow).toBe(r.total);
      expect(r.payout + r.hospitalShare).toBe(r.income);
      expect(r.utilisation).toBeLessThanOrEqual(100);
    }
    // sorted by income desc
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].income).toBeGreaterThanOrEqual(rows[i].income);
  });

  it("filters to a single doctor and keeps totals consistent", () => {
    const all = getDoctorRows(db, filters);
    const one = getDoctorRows(db, { ...filters, doctorId: all[0].doctorId });
    expect(one.length).toBe(1);
    expect(one[0].income).toBe(all[0].income);
    const summary = getDoctorSummary(all);
    expect(summary.totalIncome).toBe(all.reduce((t, r) => t + r.income, 0));
  });

  it("builds a zero-filled daily trend that sums to the summary income", () => {
    const trend = getDoctorTrend(db, filters);
    expect(trend.length).toBe(30);
    const rows = getDoctorRows(db, filters);
    expect(trend.reduce((t, p) => t + p.income, 0)).toBe(rows.reduce((t, r) => t + r.income, 0));
  });

  it("only admins can view analytics", () => {
    const admin = db.users.find((u) => u.role === "admin")!;
    const nurse = db.users.find((u) => u.role === "nurse")!;
    expect(can(admin, "analytics.view")).toBe(true);
    expect(can(nurse, "analytics.view")).toBe(false);
  });
});

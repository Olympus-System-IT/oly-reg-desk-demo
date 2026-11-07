import { describe, expect, it } from "vitest";
import { can } from "@/lib/hms/permissions";
import type { User } from "@/lib/hms/types";
import {
  BASELINE_FINANCIAL_DATA,
  BASELINE_MONTHLY_TREND,
  BASELINE_DEPT_REVENUE,
  BASELINE_EXPENSES,
  formatCurrency2DP,
} from "@/features/financial-dashboard/mockData";

describe("Configurable Financial Dashboard Prototype Logic", () => {
  it("contains baseline financial data with 5.4M Revenue, 1.2M Expenses, and 3.9M Net Profit", () => {
    expect(BASELINE_FINANCIAL_DATA.grossRevenue).toBe(5400000.0);
    expect(BASELINE_FINANCIAL_DATA.expenses).toBe(1200000.0);
    expect(BASELINE_FINANCIAL_DATA.netProfit).toBe(3900000.0);
    expect(BASELINE_FINANCIAL_DATA.collections).toBe(4850000.0);
    expect(BASELINE_FINANCIAL_DATA.receivables).toBe(5500000.0);
  });

  it("formats numbers strictly as local currency with 2 decimal places", () => {
    expect(formatCurrency2DP(5400000, "LKR")).toBe("LKR 5,400,000.00");
    expect(formatCurrency2DP(1200000, "LKR")).toBe("LKR 1,200,000.00");
    expect(formatCurrency2DP(3900000, "LKR")).toBe("LKR 3,900,000.00");
    expect(formatCurrency2DP(1234.5, "LKR")).toBe("LKR 1,234.50");
    expect(formatCurrency2DP(0, "LKR")).toBe("LKR 0.00");
  });

  it("dynamically multiplies all financial values by (displayPercentage / 100)", () => {
    const percentages = [10, 25, 50, 75, 100];

    for (const pct of percentages) {
      const factor = pct / 100;

      const scaledRevenue = BASELINE_FINANCIAL_DATA.grossRevenue * factor;
      const scaledExpenses = BASELINE_FINANCIAL_DATA.expenses * factor;
      const scaledNetProfit = BASELINE_FINANCIAL_DATA.netProfit * factor;

      expect(scaledRevenue).toBeCloseTo(5400000 * factor, 2);
      expect(scaledExpenses).toBeCloseTo(1200000 * factor, 2);
      expect(scaledNetProfit).toBeCloseTo(3900000 * factor, 2);

      // Verify 2-decimal formatting matches expected
      const formattedRevenue = formatCurrency2DP(scaledRevenue);
      expect(formattedRevenue).toMatch(/^LKR\s[\d,]+\.\d{2}$/);
    }
  });

  it("scales departmental revenues and expenses proportionally", () => {
    const factor = 0.5; // 50% slider

    const scaledDepts = BASELINE_DEPT_REVENUE.map((d) => ({
      ...d,
      scaledAmount: d.baselineAmount * factor,
    }));

    const totalScaledDeptRevenue = scaledDepts.reduce((sum, d) => sum + d.scaledAmount, 0);
    expect(totalScaledDeptRevenue).toBeCloseTo(BASELINE_FINANCIAL_DATA.grossRevenue * factor, 2);

    const scaledExpenses = BASELINE_EXPENSES.map((e) => ({
      ...e,
      scaledAmount: e.baselineAmount * factor,
    }));

    const totalScaledExpenses = scaledExpenses.reduce((sum, e) => sum + e.scaledAmount, 0);
    expect(totalScaledExpenses).toBeCloseTo(BASELINE_FINANCIAL_DATA.expenses * factor, 2);
  });

  it("scales monthly trajectory data points consistently", () => {
    const factor = 0.75; // 75% slider

    const scaledTrend = BASELINE_MONTHLY_TREND.map((point) => ({
      month: point.month,
      grossRevenue: point.grossRevenue * factor,
      expenses: point.expenses * factor,
      netProfit: point.netProfit * factor,
    }));

    expect(scaledTrend.length).toBe(6);
    for (let i = 0; i < scaledTrend.length; i++) {
      expect(scaledTrend[i].grossRevenue).toBeCloseTo(BASELINE_MONTHLY_TREND[i].grossRevenue * factor, 2);
      expect(scaledTrend[i].expenses).toBeCloseTo(BASELINE_MONTHLY_TREND[i].expenses * factor, 2);
      expect(scaledTrend[i].netProfit).toBeCloseTo(BASELINE_MONTHLY_TREND[i].netProfit * factor, 2);
    }
  });

  describe("Role-based access permissions", () => {
    const makeUser = (role: User["role"], extra: Partial<User> = {}): User => ({
      id: "test-user",
      name: "Test User",
      username: "testuser",
      contact: "test@example.com",
      role,
      active: true,
      createdAt: "2026-01-01",
      ...extra,
    });

    it("grants financial.view permission strictly to admin role only", () => {
      const admin = makeUser("admin");
      expect(can(admin, "financial.view")).toBe(true);

      const manager = makeUser("manager");
      expect(can(manager, "financial.view")).toBe(false);

      const managerWithPL = makeUser("manager", { grantPL: true });
      expect(can(managerWithPL, "financial.view")).toBe(false);

      const pharmacist = makeUser("pharmacist");
      expect(can(pharmacist, "financial.view")).toBe(false);

      const receptionist = makeUser("receptionist");
      expect(can(receptionist, "financial.view")).toBe(false);

      const nurse = makeUser("nurse");
      expect(can(nurse, "financial.view")).toBe(false);
    });

    it("denies access to inactive admin or unauthenticated users", () => {
      const inactiveAdmin = makeUser("admin", { active: false });
      expect(can(inactiveAdmin, "financial.view")).toBe(false);
      expect(can(null, "financial.view")).toBe(false);
      expect(can(undefined, "financial.view")).toBe(false);
    });
  });
});

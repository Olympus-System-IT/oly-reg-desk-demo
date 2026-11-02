export interface FinancialBaseline {
  grossRevenue: number;
  expenses: number;
  taxAndStatutory: number;
  netProfit: number;
  collections: number;
  receivables: number;
  currency: string;
}

export interface MonthlyFinancialPoint {
  month: string;
  grossRevenue: number;
  expenses: number;
  netProfit: number;
}

export interface DepartmentRevenueItem {
  id: string;
  department: string;
  code: string;
  baselineAmount: number;
  color: string;
}

export interface ExpenseItem {
  id: string;
  category: string;
  code: string;
  baselineAmount: number;
  color: string;
}

export const BASELINE_FINANCIAL_DATA: FinancialBaseline = {
  grossRevenue: 5400000.0,
  expenses: 1200000.0,
  taxAndStatutory: 300000.0,
  netProfit: 3900000.0,
  collections: 4850000.0,
  receivables: 5500000.0,
  currency: "LKR",
};

export const BASELINE_MONTHLY_TREND: MonthlyFinancialPoint[] = [
  { month: "May", grossRevenue: 4650000.0, expenses: 1080000.0, netProfit: 3320000.0 },
  { month: "Jun", grossRevenue: 4800000.0, expenses: 1120000.0, netProfit: 3430000.0 },
  { month: "Jul", grossRevenue: 5050000.0, expenses: 1150000.0, netProfit: 3620000.0 },
  { month: "Aug", grossRevenue: 5200000.0, expenses: 1180000.0, netProfit: 3740000.0 },
  { month: "Sep", grossRevenue: 5320000.0, expenses: 1190000.0, netProfit: 3840000.0 },
  { month: "Oct", grossRevenue: 5400000.0, expenses: 1200000.0, netProfit: 3900000.0 },
];

export const BASELINE_DEPT_REVENUE: DepartmentRevenueItem[] = [
  { id: "dept-1", department: "OPD & Doctor Consultations", code: "REV-OPD", baselineAmount: 2160000.0, color: "var(--primary)" },
  { id: "dept-2", department: "Laboratory & Diagnostics", code: "REV-LAB", baselineAmount: 1620000.0, color: "oklch(0.65 0.2 145)" },
  { id: "dept-3", department: "Pharmacy & Dispensary", code: "REV-PHARM", baselineAmount: 1080000.0, color: "oklch(0.6 0.18 210)" },
  { id: "dept-4", department: "Radiology & Ultrasound", code: "REV-RAD", baselineAmount: 540000.0, color: "oklch(0.68 0.16 50)" },
];

export const BASELINE_EXPENSES: ExpenseItem[] = [
  { id: "exp-1", category: "Physician & Specialist Payouts", code: "EXP-PAY", baselineAmount: 580000.0, color: "oklch(0.56 0.225 28)" },
  { id: "exp-2", category: "Medical Supplies & Consumables", code: "EXP-SUP", baselineAmount: 290000.0, color: "oklch(0.65 0.18 45)" },
  { id: "exp-3", category: "Facilities, Power & Bio-Waste", code: "EXP-FAC", baselineAmount: 180000.0, color: "oklch(0.6 0.14 260)" },
  { id: "exp-4", category: "Hospital Admin & Cloud Systems", code: "EXP-ADM", baselineAmount: 150000.0, color: "oklch(0.5 0.08 260)" },
];

/**
 * Format currency strictly as local currency with 2 decimal places
 */
export function formatCurrency2DP(amount: number, currency = "LKR"): string {
  return `${currency} ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export type DatePreset = "today" | "7d" | "30d" | "90d" | "custom";

export interface DashboardFilters {
  preset: DatePreset;
  dateFrom: string;
  dateTo: string;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  deltaPercent?: number;
  deltaText?: string;
  isPositiveDeltaGood?: boolean;
  href?: string;
  basisTooltip?: string;
  subText?: string;
  tone?: "blue" | "green" | "amber" | "red" | "gray";
}

export interface CollectionsTrendPoint {
  date: string;
  netCollections: number;
  billed: number;
  collected: number;
  refunds: number;
}

export interface AppointmentVolumePoint {
  date: string;
  completed: number;
  waiting: number;
  cancelled: number;
  noShow: number;
  total: number;
}

export interface CategoryRevenuePoint {
  name: string;
  amount: number;
  percentage: number;
}

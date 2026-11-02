export const CHART_COLORS = {
  primary: "#1729C4", // Brand Blue
  primarySoft: "rgba(23, 41, 196, 0.12)",
  brandRed: "#DD0607", // Brand Red (refunds/negatives/cancellations)
  brandRedSoft: "rgba(221, 6, 7, 0.12)",
  success: "#10b981", // Emerald green (completed/paid)
  warning: "#f59e0b", // Amber (waiting/delayed/near capacity)
  slate: "#64748b",
  blueSeries: ["#1729C4", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"],
  categoryPalette: [
    "#1729C4", // Primary blue
    "#3b82f6", // Sky blue
    "#10b981", // Green
    "#f59e0b", // Amber
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#ec4899", // Pink
    "#64748b", // Slate
  ],
  statusColors: {
    Completed: "#10b981",
    Booked: "#3b82f6",
    Waiting: "#f59e0b",
    "In Consultation": "#1729C4",
    Cancelled: "#DD0607",
    "No-show": "#94a3b8",
  },
};

export const ACCOUNTING_BASIS_NOTE =
  "Simplified accrual basis: Gross revenue reflects confirmed appointments and rendered services less discounts. Cash collected and refunds are recorded as independent movements. Receivables reflect outstanding balance due.";

"use client";

import { createFileRoute } from "@tanstack/react-router";
import { Guard } from "@/components/hms/common";
import { ConfigurableFinancialDashboard } from "@/features/financial-dashboard/ConfigurableFinancialDashboard";

export const Route = createFileRoute("/_shell/financial-dashboard")({
  head: () => ({
    meta: [
      { title: "Configurable Financial Dashboard — Hospital Management System" },
      {
        name: "description",
        content: "Configurable financial overview with dynamic percentage scaling and real-time report calibration.",
      },
      { property: "og:title", content: "Configurable Financial Dashboard — Hospital Management System" },
      {
        property: "og:description",
        content: "Executive financial dashboard with dynamic multiplier controls.",
      },
    ],
  }),
  component: () => (
    <Guard perm="dashboard.view" what="the financial dashboard">
      <ConfigurableFinancialDashboard />
    </Guard>
  ),
});

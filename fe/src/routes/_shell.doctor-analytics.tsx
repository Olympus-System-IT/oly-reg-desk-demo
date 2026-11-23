"use client";

import { createFileRoute } from "@tanstack/react-router";
import { Guard } from "@/components/hms/common";
import { DoctorAnalyticsPage } from "@/features/doctor-analytics/DoctorAnalyticsPage";

export const Route = createFileRoute("/_shell/doctor-analytics")({
  head: () => ({
    meta: [
      { title: "Doctor-wise Analytics — Hospital Management System" },
      {
        name: "description",
        content: "Per-doctor patient progress, session utilisation and income analytics.",
      },
    ],
  }),
  component: () => (
    <Guard perm="analytics.view" what="doctor-wise analytics">
      <DoctorAnalyticsPage />
    </Guard>
  ),
});

"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { Guard, PageHeader } from "@/components/hms/common";
import { useDB, useCurrentUser } from "@/lib/hms/store";
import type { DashboardFilters } from "@/features/dashboard/types";
import {
  getDashboardSummary,
  getCollectionsTrend,
  getAppointmentVolume,
  getRevenueByCategory,
  getOperationalPanels,
} from "@/features/dashboard/services/dashboard";
import { DashboardFiltersBar } from "@/features/dashboard/components/DashboardFilters";
import { KpiGrid } from "@/features/dashboard/components/kpi/KpiGrid";
import { CollectionsAreaChart } from "@/features/dashboard/components/charts/CollectionsAreaChart";
import { RevenueDonut } from "@/features/dashboard/components/charts/RevenueDonut";
import { AppointmentVolumeChart } from "@/features/dashboard/components/charts/AppointmentVolumeChart";
import { TodaySessionsPanel } from "@/features/dashboard/components/panels/TodaySessionsPanel";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Hospital Management System" },
      { name: "description", content: "Executive overview of outpatient appointments, queues, and financial operations." },
    ],
  }),
  component: () => (
    <Guard perm="dashboard.view" what="the dashboard">
      <DashboardPage />
    </Guard>
  ),
});

function DashboardPage() {
  const db = useDB();
  const user = useCurrentUser();
  const role = user?.role ?? "receptionist";
  const isNurse = role === "nurse";

  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState<DashboardFilters>({
    preset: "30d",
    dateFrom: format(subDays(new Date(), 29), "yyyy-MM-dd"),
    dateTo: today,
  });

  const [lastUpdated, setLastUpdated] = useState(() => format(new Date(), "HH:mm:ss"));

  const refreshData = () => {
    setLastUpdated(format(new Date(), "HH:mm:ss"));
  };

  // 1. KPI Summary (exactly 5 for non-nurse, 3 for nurse)
  const kpiMetrics = useMemo(
    () => getDashboardSummary(db, filters, role),
    [db, filters, role]
  );

  // 2. Charts (only 3 allowed)
  const collectionsTrend = useMemo(
    () => (!isNurse ? getCollectionsTrend(db, filters) : []),
    [db, filters, isNurse]
  );

  const revenueByCategory = useMemo(
    () => (!isNurse ? getRevenueByCategory(db, filters) : []),
    [db, filters, isNurse]
  );

  const appointmentVolume = useMemo(
    () => getAppointmentVolume(db, filters),
    [db, filters]
  );

  // 3. Panels (exactly 4 allowed)
  const panels = useMemo(() => getOperationalPanels(db, role), [db, role]);

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <PageHeader
        title="Operations Dashboard"
        description={`Real-time overview of clinic flow, physician duty schedules, ${
          !isNurse ? "collections, and receivables." : "and patient queues."
        }`}
      />

      {/* Compact Date-Range Filter Bar */}
      <DashboardFiltersBar
        filters={filters}
        onChange={setFilters}
        lastUpdated={lastUpdated}
        onRefresh={refreshData}
      />

      {/* 5 KPI Cards Row */}
      <KpiGrid metrics={kpiMetrics} />

      {/* ROW 1: Hero Charts (Daily Net Collections 8 cols + Revenue by Category 4 cols) */}
      {!isNurse ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <CollectionsAreaChart
            data={collectionsTrend}
            className="lg:col-span-8"
          />
          <RevenueDonut
            data={revenueByCategory}
            className="lg:col-span-4"
          />
        </div>
      ) : null}

      {/* ROW 2: Appointment Volume (6 cols) + Today's Doctor Sessions (6 cols) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <AppointmentVolumeChart
          data={appointmentVolume}
          className={!isNurse ? "lg:col-span-6" : "lg:col-span-12"}
        />
        <TodaySessionsPanel
          sessions={panels.todaySessions}
          className={!isNurse ? "lg:col-span-6" : "lg:col-span-12"}
        />
      </div>
    </div>
  );
}

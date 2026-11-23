"use client";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area, LineChart, Line,
} from "recharts";
import { PageHeader } from "@/components/hms/common";
import { ChartCard } from "@/components/shared/charts/ChartCard";
import { ChartTooltip } from "@/components/shared/charts/ChartTooltip";
import { useDB } from "@/lib/hms/store";
import { money } from "@/lib/hms/logic";
import { cn } from "@/lib/utils";
import { CHART_COLORS } from "@/features/dashboard/constants";
import { DashboardFiltersBar } from "@/features/dashboard/components/DashboardFilters";
import type { DashboardFilters } from "@/features/dashboard/types";
import {
  getDoctorRows, getDoctorSummary, getDoctorTrend, type DoctorAnalyticsFilters,
} from "./services/doctorAnalytics";

const selectCls =
  "h-8 rounded-md border bg-background px-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary";

const compact = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));
const shortName = (n: string) => n.replace(/^Dr\.?\s*/i, "");

function Stat({ label, value, sub, tone = "blue" }: { label: string; value: string; sub?: string; tone?: "blue" | "green" | "amber" }) {
  const bar = { blue: "bg-primary", green: "bg-success", amber: "bg-warning" }[tone];
  return (
    <div className="relative overflow-hidden rounded-lg border bg-card p-4 shadow-xs animate-in fade-in slide-in-from-bottom-1 fill-mode-both min-h-[110px]">
      <span className={cn("absolute inset-y-0 left-0 w-1", bar)} />
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular text-foreground truncate" title={value}>{value}</div>
      {sub && <div className="mt-2 text-[11px] font-medium text-muted-foreground truncate" title={sub}>{sub}</div>}
    </div>
  );
}

export function DoctorAnalyticsPage() {
  const db = useDB();
  const today = format(new Date(), "yyyy-MM-dd");
  const [filters, setFilters] = useState<DoctorAnalyticsFilters & { preset: DashboardFilters["preset"] }>({
    preset: "30d",
    dateFrom: format(subDays(new Date(), 29), "yyyy-MM-dd"),
    dateTo: today,
    doctorId: "all",
    specialtyId: "all",
  });
  const [lastUpdated, setLastUpdated] = useState(() => format(new Date(), "HH:mm:ss"));

  const rows = useMemo(() => getDoctorRows(db, filters), [db, filters]);
  const summary = useMemo(() => getDoctorSummary(rows), [rows]);
  const trend = useMemo(() => getDoctorTrend(db, filters), [db, filters]);

  const doctorOptions = db.doctors.filter((d) => filters.specialtyId === "all" || d.specialtyId === filters.specialtyId);
  const chartRows = rows.map((r) => ({ ...r, label: shortName(r.name) }));
  const barHeight = Math.max(260, chartRows.length * 38 + 60);
  const focus = (id: string) => setFilters((f) => ({ ...f, doctorId: f.doctorId === id ? "all" : id }));

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Doctor-wise Analytics"
        description="Track each doctor's patient progress, session utilisation and income to see how things are going."
      />

      <div>
        <DashboardFiltersBar
          filters={filters}
          onChange={(next) => setFilters((f) => ({ ...f, ...next }))}
          lastUpdated={lastUpdated}
          onRefresh={() => setLastUpdated(format(new Date(), "HH:mm:ss"))}
        />
        <div className="-mt-3 mb-6 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 text-xs shadow-xs">
          <label className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            Consultant type
            <select
              className={selectCls}
              value={filters.specialtyId}
              onChange={(e) => setFilters((f) => ({ ...f, specialtyId: e.target.value, doctorId: "all" }))}
            >
              <option value="all">All types</option>
              {db.specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            Doctor
            <select
              className={selectCls}
              value={filters.doctorId}
              onChange={(e) => setFilters((f) => ({ ...f, doctorId: e.target.value }))}
            >
              <option value="all">All doctors</option>
              {doctorOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          {filters.doctorId !== "all" && (
            <button type="button" className="text-primary font-semibold hover:underline" onClick={() => focus(filters.doctorId)}>
              Clear doctor filter
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Total Income" value={money(summary.totalIncome)} sub={summary.topDoctor ? `Top: ${summary.topDoctor}` : "No income in period"} tone="green" />
        <Stat label="Patients Seen" value={summary.patientsSeen.toLocaleString()} sub="Unique, completed consultations" />
        <Stat label="Avg Income / Patient" value={money(summary.avgIncomePerPatient)} sub="Income ÷ completed visits" tone="green" />
        <Stat label="Completion Rate" value={`${summary.completionRate}%`} sub="Completed of all appointments" tone={summary.completionRate >= 70 ? "green" : "amber"} />
        <Stat label="Session Utilisation" value={`${summary.utilisation}%`} sub="Booked vs session capacity" tone={summary.utilisation >= 60 ? "green" : "amber"} />
      </div>

      {/* Row 1: income by doctor + patient progress */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard
          className="lg:col-span-6"
          title="Income by Doctor"
          subtitle="Doctor payout vs hospital share (net of refunds)"
          description="Stacked horizontal bar chart of income per doctor"
          isEmpty={chartRows.length === 0}
          tableData={{
            columns: ["Doctor", "Income", "Payout", "Hospital share"],
            rows: rows.map((r) => [r.name, r.income, r.payout, r.hospitalShare]),
          }}
        >
          <div style={{ height: barHeight }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} />
                <YAxis type="category" dataKey="label" width={110} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="top" align="right" iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                <Bar dataKey="payout" name="Doctor payout" stackId="inc" fill={CHART_COLORS.warning} onClick={(d) => focus((d as { doctorId: string }).doctorId)} cursor="pointer" />
                <Bar dataKey="hospitalShare" name="Hospital share" stackId="inc" fill={CHART_COLORS.primary} radius={[0, 3, 3, 0]} onClick={(d) => focus((d as { doctorId: string }).doctorId)} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          className="lg:col-span-6"
          title="Patient Progress by Doctor"
          subtitle="Completed, still in progress, cancelled and no-show appointments"
          description="Stacked horizontal bar chart of appointment outcomes per doctor"
          isEmpty={chartRows.length === 0}
          tableData={{
            columns: ["Doctor", "Completed", "In progress", "Cancelled", "No-show", "Total"],
            rows: rows.map((r) => [r.name, r.completed, r.waiting, r.cancelled, r.noShow, r.total]),
          }}
        >
          <div style={{ height: barHeight }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={110} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="top" align="right" iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                <Bar dataKey="completed" name="Completed" stackId="s" fill={CHART_COLORS.statusColors.Completed} />
                <Bar dataKey="waiting" name="In progress / Booked" stackId="s" fill={CHART_COLORS.primary} />
                <Bar dataKey="cancelled" name="Cancelled" stackId="s" fill={CHART_COLORS.brandRed} />
                <Bar dataKey="noShow" name="No-show" stackId="s" fill={CHART_COLORS.slate} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Row 2: trends */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard
          className="lg:col-span-7"
          title="Income Trend"
          subtitle={filters.doctorId === "all" ? "Daily income, all selected doctors" : "Daily income for the selected doctor"}
          description="Area chart of daily doctor income"
          isEmpty={trend.length === 0}
          tableData={{ columns: ["Date", "Income"], rows: trend.map((d) => [d.date, d.income]) }}
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="da-income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="income" name="Income (LKR)" stroke={CHART_COLORS.success} strokeWidth={2} fill="url(#da-income)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          className="lg:col-span-5"
          title="Patients Seen Over Time"
          subtitle="Completed consultations per day"
          description="Line chart of patients seen per day"
          isEmpty={trend.length === 0}
          tableData={{ columns: ["Date", "Patients"], rows: trend.map((d) => [d.date, d.patients]) }}
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="patients" name="Patients seen" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Row 3: utilisation */}
      <ChartCard
        title="Session Utilisation"
        subtitle="Booked appointments against session capacity"
        description="Clustered bar chart of booked versus capacity per doctor"
        isEmpty={chartRows.length === 0}
        tableData={{
          columns: ["Doctor", "Sessions", "Capacity", "Booked", "Utilisation %"],
          rows: rows.map((r) => [r.name, r.sessions, r.capacity, r.booked, r.utilisation]),
        }}
      >
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} interval={0} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend verticalAlign="top" align="right" iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
              <Bar dataKey="capacity" name="Capacity" fill={CHART_COLORS.blueSeries[4]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="booked" name="Booked" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Leaderboard */}
      <section className="rounded-lg border bg-card shadow-xs overflow-hidden" aria-label="Doctor leaderboard">
        <header className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">Doctor Leaderboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Click a row to focus the whole screen on that doctor</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {["Doctor", "Type", "Sessions", "Seen", "Completion", "Cancelled", "No-show", "Utilisation", "Income", "Payout", "Hospital share"].map((h, i) => (
                  <th key={h} className={cn("px-3 py-2 font-semibold whitespace-nowrap", i < 2 ? "text-left" : "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">No doctor activity in this period.</td></tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.doctorId}
                  onClick={() => focus(r.doctorId)}
                  className={cn("cursor-pointer border-t hover:bg-muted/40", filters.doctorId === r.doctorId && "bg-primary/5")}
                >
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{r.name}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.specialty}</td>
                  <td className="px-3 py-2 text-right tabular">{r.sessions}</td>
                  <td className="px-3 py-2 text-right tabular">{r.patientsSeen}</td>
                  <td className="px-3 py-2 text-right tabular">{r.completionRate}%</td>
                  <td className="px-3 py-2 text-right tabular text-destructive">{r.cancelled}</td>
                  <td className="px-3 py-2 text-right tabular">{r.noShow}</td>
                  <td className="px-3 py-2 text-right tabular">{r.utilisation}%</td>
                  <td className="px-3 py-2 text-right tabular font-semibold whitespace-nowrap">{money(r.income)}</td>
                  <td className="px-3 py-2 text-right tabular whitespace-nowrap">{money(r.payout)}</td>
                  <td className="px-3 py-2 text-right tabular whitespace-nowrap">{money(r.hospitalShare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

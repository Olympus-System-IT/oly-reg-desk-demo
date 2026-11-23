"use client";
import { useMemo } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { ChartCard } from "@/components/shared/charts/ChartCard";
import { ChartTooltip } from "@/components/shared/charts/ChartTooltip";
import { useDB } from "@/lib/hms/store";
import { money } from "@/lib/hms/logic";
import { getNetCollectionBreakdown, SECTION_HINT, SECTION_LABEL, type CollectionSection } from "./services/netCollection";

const SECTIONS: CollectionSection[] = ["opd", "channeling", "modality"];
const COLORS: Record<CollectionSection, string> = {
  opd: "#f59e0b",
  channeling: "#1729C4",
  modality: "#10b981",
};
const compact = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

export function NetCollectionBreakdown({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const db = useDB();
  const data = useMemo(() => getNetCollectionBreakdown(db, dateFrom, dateTo), [db, dateFrom, dateTo]);
  const pct = (v: number) => (data.total > 0 ? Math.round((v / data.total) * 100) : 0);
  const pie = SECTIONS.map((s) => ({ key: s, name: SECTION_LABEL[s], amount: Math.max(0, data[s]) }));

  return (
    <section className="space-y-4" aria-label="Net collection breakdown">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Net Collection Breakdown</h2>
        <p className="text-xs text-muted-foreground">
          How OPD, Channeling and Modality contribute to Net Collection (cash collected less refunds, including pharmacy sales).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Collection (incl. pharmacy)</div>
          <div className="mt-1 text-2xl font-bold tabular">{money(data.total)}</div>
          <div className="mt-2 text-[11px] text-muted-foreground">OPD + Channeling + Modality</div>
        </div>
        {SECTIONS.map((s) => (
          <div key={s} className="relative overflow-hidden rounded-lg border bg-card p-4 shadow-xs">
            <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: COLORS[s] }} />
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{SECTION_LABEL[s]}</div>
            <div className="mt-1 text-2xl font-bold tabular">{money(data[s])}</div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="truncate" title={SECTION_HINT[s]}>{SECTION_HINT[s]}</span>
              <span className="shrink-0 font-semibold text-foreground">{pct(data[s])}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard
          className="lg:col-span-5"
          title="Contribution to Net Collection"
          subtitle="Share of each section in the selected period"
          description="Donut chart of OPD, Channeling and Modality share of net collection"
          isEmpty={data.total <= 0}
          tableData={{
            columns: ["Section", "Amount (LKR)", "Share (%)"],
            rows: SECTIONS.map((s) => [SECTION_LABEL[s], data[s].toLocaleString(), `${pct(data[s])}%`]),
          }}
        >
          <div className="relative h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={105} paddingAngle={2}>
                  {pie.map((p) => <Cell key={p.key} fill={COLORS[p.key]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip isCurrency />} />
                <Legend verticalAlign="bottom" iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Net Collection</span>
              <span className="text-sm font-bold tabular">{money(data.total)}</span>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          className="lg:col-span-7"
          title="Daily Net Collection by Section"
          subtitle="OPD, Channeling and Modality stacked per day"
          description="Stacked bar chart of daily net collection split by section"
          isEmpty={data.daily.length === 0}
          tableData={{
            columns: ["Date", "OPD", "Channeling", "Modality", "Total"],
            rows: data.daily.map((d) => [d.date, d.opd, d.channeling, d.modality, d.total]),
          }}
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.daily} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} />
                <Tooltip content={<ChartTooltip isCurrency />} />
                <Legend verticalAlign="top" align="right" iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                <Bar dataKey="channeling" name="Channeling" stackId="c" fill={COLORS.channeling} />
                <Bar dataKey="modality" name="Modality" stackId="c" fill={COLORS.modality} />
                <Bar dataKey="opd" name="OPD" stackId="c" fill={COLORS.opd} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </section>
  );
}

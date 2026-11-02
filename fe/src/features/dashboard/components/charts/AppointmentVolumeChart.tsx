"use client";
import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ChartCard } from "@/components/shared/charts/ChartCard";
import { ChartTooltip } from "@/components/shared/charts/ChartTooltip";
import { useInView } from "../../hooks/useInView";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { CHART_COLORS } from "../../constants";
import type { AppointmentVolumePoint } from "../../types";

export function AppointmentVolumeChart({
  data,
  className,
}: {
  data: AppointmentVolumePoint[];
  className?: string;
}) {
  const [containerRef, inView] = useInView();
  const reducedMotion = useReducedMotion();
  const [interval, setInterval] = useState<"daily" | "weekly">("daily");

  // Aggregate weekly if interval === "weekly"
  const chartData = useMemo(() => {
    if (interval === "daily" || data.length <= 7) return data;
    const weeklyMap = new Map<string, AppointmentVolumePoint>();
    data.forEach((d, idx) => {
      const weekIndex = Math.floor(idx / 7);
      const weekLabel = `W${weekIndex + 1} (${d.date})`;
      if (!weeklyMap.has(weekLabel)) {
        weeklyMap.set(weekLabel, {
          date: weekLabel,
          completed: 0,
          waiting: 0,
          cancelled: 0,
          noShow: 0,
          total: 0,
        });
      }
      const w = weeklyMap.get(weekLabel)!;
      w.completed += d.completed;
      w.waiting += d.waiting;
      w.cancelled += d.cancelled;
      w.noShow += d.noShow;
      w.total += d.total;
    });
    return Array.from(weeklyMap.values());
  }, [data, interval]);

  const tableData = {
    columns: ["Date", "Completed", "Waiting/Booked", "Cancelled", "No-show", "Total"],
    rows: chartData.map((d) => [d.date, d.completed, d.waiting, d.cancelled, d.noShow, d.total]),
  };

  const filterSlot = (
    <div role="group" aria-label="Interval toggle" className="flex rounded-md border p-0.5 bg-muted/30">
      <button
        type="button"
        onClick={() => setInterval("daily")}
        className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
          interval === "daily" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Daily
      </button>
      <button
        type="button"
        onClick={() => setInterval("weekly")}
        className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
          interval === "weekly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Weekly
      </button>
    </div>
  );

  return (
    <div ref={containerRef} className={className}>
      <ChartCard
        title="Appointment Volume over Time"
        subtitle="Completed consultations, active waiting queue, and drop-offs"
        description="Stacked bar chart showing appointment volumes over time"
        filterSlot={filterSlot}
        tableData={tableData}
        isEmpty={chartData.length === 0}
      >
        <div className="h-[270px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
              />
              <Bar
                dataKey="completed"
                name="Completed"
                stackId="status"
                fill={CHART_COLORS.statusColors.Completed}
                isAnimationActive={inView && !reducedMotion}
                animationDuration={800}
              />
              <Bar
                dataKey="waiting"
                name="Waiting/Booked"
                stackId="status"
                fill={CHART_COLORS.primary}
                isAnimationActive={inView && !reducedMotion}
                animationDuration={850}
              />
              <Bar
                dataKey="cancelled"
                name="Cancelled"
                stackId="status"
                fill={CHART_COLORS.brandRed}
                isAnimationActive={inView && !reducedMotion}
                animationDuration={900}
              />
              <Bar
                dataKey="noShow"
                name="No-show"
                stackId="status"
                fill={CHART_COLORS.slate}
                radius={[3, 3, 0, 0]}
                isAnimationActive={inView && !reducedMotion}
                animationDuration={950}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

"use client";
import { useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartCard } from "@/components/shared/charts/ChartCard";
import { useInView } from "../../hooks/useInView";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { CHART_COLORS } from "../../constants";
import { money } from "@/lib/hms/logic";
import type { CollectionsTrendPoint } from "../../types";

export function CollectionsAreaChart({
  data,
  className,
}: {
  data: CollectionsTrendPoint[];
  className?: string;
}) {
  const [containerRef, inView] = useInView();
  const reducedMotion = useReducedMotion();
  const gradientId = useId();

  const tableData = {
    columns: ["Date", "Net Collections (LKR)", "Billed (LKR)", "Collected (LKR)", "Refunds (LKR)"],
    rows: data.map((d) => [
      d.date,
      d.netCollections.toLocaleString(),
      d.billed.toLocaleString(),
      d.collected.toLocaleString(),
      d.refunds.toLocaleString(),
    ]),
  };

  return (
    <div ref={containerRef} className={className}>
      <ChartCard
        title="Daily Net Collections"
        subtitle="Cash collected less refunds (hover to see billed vs refunds breakdown)"
        description="Area chart of daily net collections with cash receipts and refund adjustments"
        tableData={tableData}
        isEmpty={data.length === 0}
      >
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as CollectionsTrendPoint;
                  return (
                    <div className="rounded-md border bg-card/95 px-3 py-2 text-xs shadow-md backdrop-blur-xs min-w-[170px] space-y-1.5 z-50">
                      <p className="font-semibold text-foreground border-b pb-1">{label}</p>
                      <div className="flex justify-between items-center text-foreground font-bold">
                        <span>Net Collections:</span>
                        <span className="tabular">{money(item.netCollections)}</span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                        <span>Billed Revenue:</span>
                        <span className="tabular">{money(item.billed)}</span>
                      </div>
                      <div className="flex justify-between items-center text-success text-[11px]">
                        <span>Cash Collected:</span>
                        <span className="tabular">+{money(item.collected)}</span>
                      </div>
                      {item.refunds > 0 && (
                        <div className="flex justify-between items-center text-[#DD0607] font-semibold text-[11px]">
                          <span>Refunds:</span>
                          <span className="tabular">-{money(item.refunds)}</span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="netCollections"
                name="Net Collections"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                dot={{ r: 2.5, fill: CHART_COLORS.primary }}
                activeDot={{ r: 5 }}
                isAnimationActive={inView && !reducedMotion}
                animationDuration={850}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

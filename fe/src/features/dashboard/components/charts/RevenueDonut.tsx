"use client";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChartCard } from "@/components/shared/charts/ChartCard";
import { ChartTooltip } from "@/components/shared/charts/ChartTooltip";
import { Button } from "@/components/ui/button";
import { useInView } from "../../hooks/useInView";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { CHART_COLORS } from "../../constants";
import { money } from "@/lib/hms/logic";
import type { CategoryRevenuePoint } from "../../types";

export function RevenueDonut({
  data,
  className,
}: {
  data: CategoryRevenuePoint[];
  className?: string;
}) {
  const [containerRef, inView] = useInView();
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalRevenue = data.reduce((s, d) => s + d.amount, 0);

  const tableData = {
    columns: ["Category", "Amount (LKR)", "Share (%)"],
    rows: data.map((d) => [d.name, d.amount.toLocaleString(), `${d.percentage}%`]),
  };

  const filterSlot = (
    <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
      <Link to="/reports">
        Report <ArrowRight className="ml-1 size-3" />
      </Link>
    </Button>
  );

  return (
    <div ref={containerRef} className={className}>
      <ChartCard
        title="Revenue by Service Category"
        subtitle="Distribution across outpatient clinical services"
        description="Donut breakdown of billed outpatient revenue by service category"
        filterSlot={filterSlot}
        tableData={tableData}
        isEmpty={data.length === 0}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-[280px]">
          {/* Donut with center text */}
          <div className="relative h-56 w-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  isAnimationActive={inView && !reducedMotion}
                  animationDuration={850}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS.categoryPalette[index % CHART_COLORS.categoryPalette.length]}
                      stroke={activeIndex === index ? "#000" : "transparent"}
                      strokeWidth={activeIndex === index ? 1.5 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip isCurrency />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total</span>
              <span className="text-sm font-bold tabular text-foreground">
                {money(totalRevenue)}
              </span>
            </div>
          </div>

          {/* Interactive Legend with click-through */}
          <div className="w-full flex-1 space-y-1.5 overflow-y-auto max-h-56 pr-1 text-xs">
            {data.map((item, idx) => (
              <Link
                key={item.name}
                to="/reports"
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 transition-colors block ${
                  activeIndex === idx ? "bg-muted font-medium" : "hover:bg-muted/50"
                }`}
                title={`View ${item.name} in reports`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_COLORS.categoryPalette[idx % CHART_COLORS.categoryPalette.length] }}
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="tabular text-muted-foreground shrink-0">
                  <span className="font-semibold text-foreground">{item.percentage}%</span> · {money(item.amount)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

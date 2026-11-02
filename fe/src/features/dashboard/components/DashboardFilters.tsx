"use client";
import { format, subDays } from "date-fns";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DashboardFilters, DatePreset } from "../types";

interface DashboardFiltersBarProps {
  filters: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  lastUpdated: string;
  onRefresh: () => void;
}

export function DashboardFiltersBar({
  filters,
  onChange,
  lastUpdated,
  onRefresh,
}: DashboardFiltersBarProps) {
  const today = new Date().toISOString().slice(0, 10);

  const setPreset = (preset: DatePreset) => {
    let dateFrom = today;
    let dateTo = today;

    if (preset === "7d") {
      dateFrom = format(subDays(new Date(), 6), "yyyy-MM-dd");
    } else if (preset === "30d") {
      dateFrom = format(subDays(new Date(), 29), "yyyy-MM-dd");
    } else if (preset === "90d") {
      dateFrom = format(subDays(new Date(), 89), "yyyy-MM-dd");
    }

    onChange({
      ...filters,
      preset,
      dateFrom,
      dateTo,
    });
  };

  return (
    <div className="rounded-lg border bg-card p-3 shadow-xs mb-6 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-muted-foreground mr-1">Timeframe:</span>
          {(["today", "7d", "30d", "90d"] as DatePreset[]).map((p) => {
            const active = filters.preset === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p === "today" ? "Today" : p.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Custom date range inputs */}
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              onChange({ ...filters, preset: "custom", dateFrom: e.target.value })
            }
            className="h-8 w-34 text-xs"
            aria-label="Start date"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) =>
              onChange({ ...filters, preset: "custom", dateTo: e.target.value })
            }
            className="h-8 w-34 text-xs"
            aria-label="End date"
          />
        </div>

        {/* Refresh button */}
        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs ml-auto" onClick={onRefresh}>
          <RefreshCw className="size-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Synchronized status text */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-2">
        <span>
          Period: <strong className="text-foreground">{filters.dateFrom}</strong> to{" "}
          <strong className="text-foreground">{filters.dateTo}</strong>
        </span>
        <span>Data as of {lastUpdated}</span>
      </div>
    </div>
  );
}

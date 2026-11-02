import { Link } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { KpiMetric } from "../../types";
import { useCountUp } from "../../hooks/useCountUp";

export function KpiCard({ metric, index = 0 }: { metric: KpiMetric; index?: number }) {
  const isCurrency = metric.formattedValue.startsWith("LKR") || metric.formattedValue.startsWith("$");
  const countUpText = useCountUp(metric.value, 800, (v) =>
    isCurrency
      ? `LKR ${v.toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : v.toLocaleString()
  );

  const delta = metric.deltaPercent;
  const isPositive = delta !== undefined && delta > 0;

  const content = (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className={cn(
        "group relative flex flex-col justify-between rounded-lg border bg-card p-4 shadow-xs transition-all duration-200 hover:border-primary/50 hover:shadow-sm",
        "animate-in fade-in slide-in-from-bottom-1 fill-mode-both min-h-[110px]"
      )}
    >
      {/* Top row: Label & Info Tooltip */}
      <div className="flex items-start justify-between gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {metric.label}
        </span>
        {metric.basisTooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/60 hover:text-foreground shrink-0"
                  aria-label="Accounting basis details"
                >
                  <HelpCircle className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-relaxed">
                {metric.basisTooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Middle row: Big Value */}
      <div className="mt-1">
        <span className="text-2xl font-bold tracking-tight tabular text-foreground">
          {countUpText}
        </span>
      </div>

      {/* Bottom row: Delta badge & subtext */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        {delta !== undefined && delta !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular",
              isPositive
                ? metric.isPositiveDeltaGood
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-destructive"
                : metric.isPositiveDeltaGood
                ? "bg-danger-soft text-destructive"
                : "bg-success-soft text-success"
            )}
          >
            {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {isPositive ? "+" : ""}
            {delta}%
          </span>
        )}
        {metric.deltaText && (
          <span className="truncate text-muted-foreground text-[11px] font-medium" title={metric.deltaText}>
            {metric.deltaText}
          </span>
        )}
        {metric.subText && !metric.deltaText && (
          <span className="truncate text-muted-foreground text-[11px]" title={metric.subText}>
            {metric.subText}
          </span>
        )}
      </div>
    </div>
  );

  if (metric.href) {
    return (
      <Link to={metric.href} className="block outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}

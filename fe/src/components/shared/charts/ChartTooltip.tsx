import type { TooltipProps } from "recharts";
import { money } from "@/lib/hms/logic";

interface CustomTooltipProps extends TooltipProps<number, string> {
  isCurrency?: boolean;
  valueFormatter?: (val: number) => string;
}

export function ChartTooltip({ active, payload, label, isCurrency = false, valueFormatter }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const format = (v: number) => {
    if (valueFormatter) return valueFormatter(v);
    if (isCurrency) return money(v);
    return v.toLocaleString();
  };

  return (
    <div className="rounded-md border bg-card/95 px-3 py-2 text-xs shadow-md backdrop-blur-xs min-w-[140px] z-50">
      {label && <p className="font-semibold text-foreground mb-1 border-b pb-1">{label}</p>}
      <div className="space-y-1">
        {payload.map((item, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground truncate">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color || "#1729C4" }} />
              {item.name}:
            </span>
            <span className="font-semibold tabular text-foreground">
              {typeof item.value === "number" ? format(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { KpiMetric } from "../../types";
import { KpiCard } from "./KpiCard";

export function KpiGrid({ metrics }: { metrics: KpiMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 mb-6">
      {metrics.map((metric, idx) => (
        <KpiCard key={metric.id} metric={metric} index={idx} />
      ))}
    </div>
  );
}

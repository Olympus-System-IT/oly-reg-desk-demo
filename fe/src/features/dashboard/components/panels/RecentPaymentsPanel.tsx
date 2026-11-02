import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Panel, StatusBadge } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { money, fmtDateTime } from "@/lib/hms/logic";

interface PaymentItem {
  id: string;
  receiptNo: string;
  invoiceNo: string;
  amount: number;
  method: string;
  date: string;
  by: string;
}

export function RecentPaymentsPanel({
  payments,
  className,
}: {
  payments: PaymentItem[];
  className?: string;
}) {
  return (
    <Panel
      title="Recent Payments"
      actions={
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link to="/invoices">
            Invoices <ArrowRight className="ml-1 size-3" />
          </Link>
        </Button>
      }
      className={className}
    >
      <div className="divide-y max-h-72 overflow-y-auto">
        {payments.slice(0, 5).map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-muted/30">
            <div className="space-y-0.5 truncate pr-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-foreground">{p.receiptNo}</span>
                <span className="text-[10px] text-muted-foreground">({p.invoiceNo})</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {p.method} · {p.by} · {fmtDateTime(p.date)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-bold tabular text-success text-sm">{money(p.amount)}</span>
            </div>
          </div>
        ))}
        {payments.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No payments recorded recently.
          </div>
        )}
      </div>
    </Panel>
  );
}

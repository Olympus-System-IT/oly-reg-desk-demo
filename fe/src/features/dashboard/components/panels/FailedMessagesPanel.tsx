import { Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusBadge } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { mutate } from "@/lib/hms/store";
import { fmtDateTime } from "@/lib/hms/logic";

interface FailedMsg {
  id: string;
  recipient: string;
  mobile: string;
  type: string;
  ts: string;
}

export function FailedMessagesPanel({
  messages,
  className,
}: {
  messages: FailedMsg[];
  className?: string;
}) {
  const handleRetry = (msgId: string) => {
    mutate((d) => {
      const target = d.messages.find((m) => m.id === msgId);
      if (target) {
        target.status = "Pending";
        target.simulatedNote = "Retrying dispatch via simulated gateway…";
      }
      setTimeout(() => {
        mutate((inner) => {
          const m = inner.messages.find((x) => x.id === msgId);
          if (m) {
            m.status = "Delivered";
            m.simulatedNote = "Delivery simulated successfully.";
          }
        });
      }, 900);
    });
    toast.success("Retry initiated. Gateway status updating.");
  };

  return (
    <Panel
      title="Failed Messages & Delivery Alerts"
      actions={
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link to="/messages">
            SMS Centre <ArrowRight className="ml-1 size-3" />
          </Link>
        </Button>
      }
      className={className}
    >
      <div className="divide-y max-h-72 overflow-y-auto">
        {messages.slice(0, 5).map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 p-3 text-xs hover:bg-muted/30">
            <div className="space-y-0.5 truncate pr-2">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="truncate">{m.recipient}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{m.mobile}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {m.type.replace("_", " ")} · {fmtDateTime(m.ts)}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status="Failed" tone="red" />
              <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => handleRetry(m.id)}>
                <RefreshCw className="mr-1 size-3" /> Retry
              </Button>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No failed outbound messages. All cellular transmissions healthy.
          </div>
        )}
      </div>
    </Panel>
  );
}

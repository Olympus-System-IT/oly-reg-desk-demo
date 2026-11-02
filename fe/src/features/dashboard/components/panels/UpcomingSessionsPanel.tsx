import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import { Panel } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/hms/logic";

interface UpcomingSession {
  id: string;
  date: string;
  doctor: string;
  room: string;
  time: string;
  booked: number;
  max: number;
}

export function UpcomingSessionsPanel({
  sessions,
  className,
}: {
  sessions: UpcomingSession[];
  className?: string;
}) {
  return (
    <Panel
      title="Upcoming Sessions (Next 48h)"
      actions={
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link to="/sessions">
            Calendar <ArrowRight className="ml-1 size-3" />
          </Link>
        </Button>
      }
      className={className}
    >
      <div className="divide-y max-h-72 overflow-y-auto">
        {sessions.map((ses) => (
          <Link
            key={ses.id}
            to="/sessions/$id"
            params={{ id: ses.id }}
            className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-muted/30 transition-colors block"
          >
            <div className="space-y-1 truncate pr-2">
              <div className="font-semibold text-foreground truncate">{ses.doctor}</div>
              <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                <span>{fmtDate(ses.date)}</span>
                <span>·</span>
                <span>{ses.time}</span>
                <span>·</span>
                <span>{ses.room}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="rounded bg-muted px-2 py-0.5 font-medium tabular text-foreground text-[11px]">
                {ses.booked}/{ses.max} slots
              </span>
            </div>
          </Link>
        ))}
        {sessions.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No upcoming sessions in the next 48 hours.
          </div>
        )}
      </div>
    </Panel>
  );
}

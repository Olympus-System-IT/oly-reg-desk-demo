import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, MapPin, Users } from "lucide-react";
import { Panel, StatusBadge } from "@/components/hms/common";
import { Button } from "@/components/ui/button";

interface SessionItem {
  id: string;
  doctor: string;
  room: string;
  time: string;
  booked: number;
  max: number;
  status: string;
}

export function TodaySessionsPanel({
  sessions,
  className,
}: {
  sessions: SessionItem[];
  className?: string;
}) {
  return (
    <Panel
      title="Today's Doctor Sessions"
      actions={
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link to="/sessions">
            View all <ArrowRight className="ml-1 size-3" />
          </Link>
        </Button>
      }
      className={className}
    >
      <div className="divide-y max-h-72 overflow-y-auto">
        {sessions.slice(0, 5).map((ses) => {
          const capPercent = Math.round((ses.booked / ses.max) * 100);
          return (
            <Link
              key={ses.id}
              to="/sessions/$id"
              params={{ id: ses.id }}
              className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-muted/30 transition-colors block"
            >
              <div className="space-y-1 truncate pr-2">
                <div className="font-semibold text-foreground truncate">{ses.doctor}</div>
                <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" /> {ses.room}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {ses.time}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <StatusBadge status={ses.status} />
                <div className="text-[11px] text-muted-foreground font-medium">
                  {ses.booked} / {ses.max} booked ({capPercent}%)
                </div>
              </div>
            </Link>
          );
        })}
        {sessions.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No doctor sessions scheduled for today.
          </div>
        )}
      </div>
    </Panel>
  );
}

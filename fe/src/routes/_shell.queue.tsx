import { createFileRoute } from "@tanstack/react-router";
import { Guard, PageHeader, Panel, StatusBadge } from "@/components/hms/common";
import { mutate, useDB } from "@/lib/hms/store";
import { todayStr } from "@/lib/hms/logic";
import type { ApptStatus } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/queue")({
  head: () => ({ meta: [{ title: "Queue — Hospital Management System" }, { name: "description", content: "Today's patient queues by doctor session." }, { property: "og:title", content: "Queue — Hospital Management System" }, { property: "og:description", content: "Today's patient queues by doctor session." }] }),
  component: () => <Guard perm="queue.update" what="the queue"><Queue /></Guard>,
});

const STATUSES: ApptStatus[] = ["Booked", "Checked In", "Waiting", "In Consultation", "Completed", "No-show"];

function Queue() {
  const db = useDB();
  const sessions = db.sessions.filter((s) => s.date === todayStr());
  return (
    <>
      <PageHeader title="Queue" description="Update attendance and queue status for today's sessions." />
      <div className="grid gap-4 lg:grid-cols-2">
        {sessions.map((s) => {
          const doc = db.doctors.find((d) => d.id === s.doctorId);
          const list = db.appointments.filter((a) => a.sessionId === s.id).sort((a, b) => a.queueNo - b.queueNo);
          return (
            <Panel key={s.id} title={`${doc?.name} · ${s.start}–${s.end} · ${s.room}`} actions={<StatusBadge status={s.status} />}>
              <ul className="divide-y">
                {list.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="w-8 font-semibold tabular text-primary">#{a.queueNo}</span>
                    <span className="flex-1 truncate">{db.patients.find((p) => p.id === a.patientId)?.name}</span>
                    {a.status === "Cancelled" ? <StatusBadge status="Cancelled" /> : (
                      <select aria-label="Queue status" className="h-8 rounded-md border border-input bg-card px-2 text-xs" value={a.status}
                        onChange={(e) => mutate((d) => { const x = d.appointments.find((y) => y.id === a.id); if (x) x.status = e.target.value as ApptStatus; })}>
                        {STATUSES.map((st) => <option key={st}>{st}</option>)}
                      </select>
                    )}
                  </li>
                ))}
                {!list.length && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No bookings</li>}
              </ul>
            </Panel>
          );
        })}
      </div>
    </>
  );
}

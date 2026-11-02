"use client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Clock, Calendar, MapPin, Users, CheckCircle2, AlertTriangle, XCircle, Bell } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, TableWrap, Empty, Panel, ConfirmDialog } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { mutate, useDB, useCurrentUser } from "@/lib/hms/store";
import { sessionBooked, fmtDate, sessionLabel, money } from "@/lib/hms/logic";
import { can } from "@/lib/hms/permissions";
import type { ApptStatus, SessionStatus } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/sessions/$id")({
  head: () => ({ meta: [{ title: "Session Details — Hospital Management System" }] }),
  component: () => <Guard perm="sessions.view" what="session details"><SessionDetail /></Guard>,
});

function SessionDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const user = useCurrentUser();

  const [cancelOpen, setCancelOpen] = useState(false);

  const ses = db.sessions.find((s) => s.id === id);
  if (!ses) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Session not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/sessions">
            <ArrowLeft className="mr-2 size-4" /> Back to Sessions
          </Link>
        </Button>
      </div>
    );
  }

  const doc = db.doctors.find((d) => d.id === ses.doctorId);
  const spec = db.specialties.find((s) => s.id === doc?.specialtyId);
  const appts = db.appointments
    .filter((a) => a.sessionId === ses.id)
    .sort((a, b) => a.queueNo - b.queueNo);

  const bookedCount = sessionBooked(db, ses.id);
  const canManageQueue = can(user, "queue.update");
  const canManageSetup = can(user, "setup.manage");

  const updateApptStatus = (apptId: string, status: ApptStatus) => {
    mutate((d) => {
      const a = d.appointments.find((x) => x.id === apptId);
      if (a) {
        a.status = status;
        const byName = d.users.find((u) => u.id === d.auth.userId)?.name ?? "Staff";
        d.auditLog.unshift({
          id: `audit${Date.now()}`,
          ts: new Date().toISOString(),
          userId: d.auth.userId!,
          userName: byName,
          action: "update",
          entity: "appointment",
          entityId: a.ref,
          detail: `Appointment ${a.ref} status changed to ${status}`,
        });
      }
    });
    toast.success(`Patient marked as ${status}`);
  };

  const updateSessionStatus = (status: SessionStatus) => {
    mutate((d) => {
      const s = d.sessions.find((x) => x.id === ses.id);
      if (s) {
        s.status = status;
        const byName = d.users.find((u) => u.id === d.auth.userId)?.name ?? "Staff";
        d.auditLog.unshift({
          id: `audit${Date.now()}`,
          ts: new Date().toISOString(),
          userId: d.auth.userId!,
          userName: byName,
          action: "update",
          entity: "session",
          entityId: s.id,
          detail: `Session on ${s.date} with ${doc?.name} set to ${status}`,
        });
      }
    });
    toast.success(`Session status changed to ${status}`);
  };

  const handleCancelSession = (reason: string) => {
    mutate((d) => {
      const s = d.sessions.find((x) => x.id === ses.id);
      if (s) {
        s.status = "Cancelled";
        s.notes = `Cancelled: ${reason}`;
      }

      // Mark appointments as Cancelled and simulate notifications
      for (const a of d.appointments) {
        if (a.sessionId === ses.id && a.status !== "Cancelled") {
          a.status = "Cancelled";
          a.cancelReason = `Session cancelled: ${reason}`;
          const pt = d.patients.find((p) => p.id === a.patientId);
          if (pt?.smsConsent) {
            d.messages.unshift({
              id: `msg${Date.now()}_${a.id}`,
              ts: new Date().toISOString(),
              patientId: pt.id,
              appointmentId: a.id,
              type: "session_cancel",
              text: `Dear ${pt.name.split(" ")[0]}, your appointment with ${doc?.name} on ${ses.date} was cancelled. Reason: ${reason}. Please contact reception. [DEMO]`,
              status: "Sent",
              simulatedNote: "Simulated — cancellation broadcast",
            });
          }
        }
      }

      const byName = d.users.find((u) => u.id === d.auth.userId)?.name ?? "Staff";
      d.auditLog.unshift({
        id: `audit${Date.now()}`,
        ts: new Date().toISOString(),
        userId: d.auth.userId!,
        userName: byName,
        action: "update",
        entity: "session",
        entityId: ses.id,
        detail: `Session cancelled. Reason: ${reason}. ${bookedCount} affected bookings notified.`,
      });
    });

    toast.success(`Session cancelled. ${bookedCount} affected bookings updated.`);
    setCancelOpen(false);
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
        <Link to="/sessions">
          <ArrowLeft className="mr-1 size-4" /> Back to Sessions
        </Link>
      </Button>

      <PageHeader
        title={doc ? `${doc.name} — Consultation Session` : "Session Details"}
        description={`${spec?.name ?? "General"} · ${fmtDate(ses.date)} · ${ses.start}–${ses.end}`}
        actions={
          <div className="flex items-center gap-2">
            {canManageSetup && ses.status !== "Cancelled" && (
              <>
                {ses.status === "Scheduled" && (
                  <Button size="sm" onClick={() => updateSessionStatus("Open")}>
                    Open Session
                  </Button>
                )}
                {ses.status === "Open" && (
                  <Button size="sm" variant="outline" onClick={() => updateSessionStatus("Completed")}>
                    Mark Completed
                  </Button>
                )}
                {ses.status !== "Delayed" && ses.status !== "Completed" && (
                  <Button size="sm" variant="outline" onClick={() => updateSessionStatus("Delayed")}>
                    Mark Delayed
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                  Cancel Session
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3 mb-6">
        <Panel title="Session Details">
          <div className="space-y-3 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={ses.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Doctor</span>
              <span className="font-medium">{doc?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consultant Type</span>
              <span>{spec?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room</span>
              <span className="font-medium">{ses.room}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timing</span>
              <span>{ses.start} – {ses.end}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacity</span>
              <span>{bookedCount} / {ses.max} booked</span>
            </div>
            {ses.notes && (
              <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Notes:</span> {ses.notes}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Live Queue Status" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 text-center">
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground font-medium">Booked</div>
              <div className="text-2xl font-bold mt-1 tabular">{appts.filter((a) => a.status === "Booked").length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground font-medium">Waiting</div>
              <div className="text-2xl font-bold mt-1 text-amber-600 tabular">{appts.filter((a) => a.status === "Waiting" || a.status === "Checked In").length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground font-medium">In Consult</div>
              <div className="text-2xl font-bold mt-1 text-primary tabular">{appts.filter((a) => a.status === "In Consultation").length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground font-medium">Completed</div>
              <div className="text-2xl font-bold mt-1 text-success tabular">{appts.filter((a) => a.status === "Completed").length}</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Bookings Queue */}
      <Panel title={`Registered Patients (${appts.length})`}>
        <TableWrap>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Queue #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Ref #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                {canManageQueue && (
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Advance Queue</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {appts.map((a) => {
                const pt = db.patients.find((p) => p.id === a.patientId);
                return (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-bold tabular text-base text-primary">#{a.queueNo}</td>
                    <td className="px-4 py-2 font-mono text-xs">{a.ref}</td>
                    <td className="px-4 py-2">
                      {pt ? (
                        <Link to="/patients/$id" params={{ id: pt.id }} className="font-medium hover:underline">
                          {pt.name}
                        </Link>
                      ) : (
                        <span>Unknown</span>
                      )}
                      <div className="text-xs text-muted-foreground">{pt?.code}</div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{pt?.mobile || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{a.source}</td>
                    <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                    {canManageQueue && (
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1.5">
                          {a.status === "Booked" && (
                            <Button size="sm" variant="outline" onClick={() => updateApptStatus(a.id, "Waiting")}>
                              Check In
                            </Button>
                          )}
                          {a.status === "Waiting" && (
                            <Button size="sm" onClick={() => updateApptStatus(a.id, "In Consultation")}>
                              Call In
                            </Button>
                          )}
                          {a.status === "In Consultation" && (
                            <Button size="sm" variant="outline" className="text-success border-success/30" onClick={() => updateApptStatus(a.id, "Completed")}>
                              Complete
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        {appts.length === 0 && <Empty title="No bookings registered for this session" />}
      </Panel>

      {/* Cancel Session Dialog */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Entire Doctor Session?"
        description={`This will cancel the session and all ${bookedCount} existing bookings. Booked patients with SMS consent will receive automated cancellation notifications.`}
        requireReason
        reasonLabel="Cancellation Reason"
        confirmLabel="Cancel Session & Notify"
        destructive
        onConfirm={handleCancelSession}
      />
    </>
  );
}

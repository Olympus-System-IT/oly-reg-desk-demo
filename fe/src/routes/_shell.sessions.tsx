"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, CalendarDays, List } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, startOfWeek } from "date-fns";
import { Guard, PageHeader, StatusBadge, ConfirmDialog, Empty, TableWrap, NativeSelect } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { mutate, useDB } from "@/lib/hms/store";
import { findConflict, sessionBooked, fmtDate } from "@/lib/hms/logic";
import type { Session, SessionStatus } from "@/lib/hms/types";
import { can } from "@/lib/hms/permissions";
import { useCurrentUser } from "@/lib/hms/store";

export const Route = createFileRoute("/_shell/sessions")({
  head: () => ({ meta: [{ title: "Doctor Sessions — Hospital Management System" }] }),
  component: () => <Guard perm="sessions.view" what="doctor sessions"><Sessions /></Guard>,
});

const schema = z.object({
  doctorId: z.string().min(1, "Select a doctor"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Enter valid time"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Enter valid time"),
  room: z.string().trim().min(1, "Room required"),
  max: z.coerce.number().int().min(1, "Min 1").max(100, "Max 100"),
  notes: z.string().trim().max(200).optional(),
}).refine(d => d.start < d.end, { message: "End time must be after start time", path: ["end"] });
type Form = z.infer<typeof schema>;

const STATUS_OPTS: SessionStatus[] = ["Scheduled", "Open", "Delayed", "Completed", "Cancelled"];

function Sessions() {
  const db = useDB();
  const user = useCurrentUser();
  const canManage = can(user, "setup.manage");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [filterDoc, setFilterDoc] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterTo, setFilterTo] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null);
  const [calWeek, setCalWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const activeDoctors = db.doctors.filter(d => d.active);

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const filtered = db.sessions.filter(s => {
    const matchDoc = !filterDoc || s.doctorId === filterDoc;
    const matchStatus = !filterStatus || s.status === filterStatus;
    const inRange = s.date >= filterFrom && s.date <= filterTo;
    return matchDoc && matchStatus && inRange;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  const openAdd = () => {
    setEditing(null);
    reset({ doctorId: activeDoctors[0]?.id ?? "", date: format(new Date(), "yyyy-MM-dd"), start: "08:30", end: "11:30", room: "OPD-1", max: 20, notes: "" });
    setOpen(true);
  };

  const openEdit = (s: Session) => {
    setEditing(s);
    reset({ doctorId: s.doctorId, date: s.date, start: s.start, end: s.end, room: s.room, max: s.max, notes: s.notes ?? "" });
    setOpen(true);
  };

  const onSubmit = (v: Form) => {
    const candidate = { ...v, id: editing?.id, seriesId: editing?.seriesId };
    const conflict = findConflict(db, candidate);
    if (conflict) {
      const conflictDoc = db.doctors.find(d => d.id === conflict.doctorId);
      const msg = conflict.doctorId === v.doctorId
        ? `Dr. ${conflictDoc?.name} already has a session at this time`
        : `Room ${v.room} is occupied (${conflictDoc?.name}: ${conflict.start}–${conflict.end})`;
      setError("room", { message: msg });
      setError("start", { message: msg });
      return;
    }

    mutate((d) => {
      if (editing) {
        const ses = d.sessions.find(x => x.id === editing.id);
        if (ses) {
          const affected = d.appointments.filter(a => a.sessionId === ses.id && a.status !== "Cancelled" && a.status !== "Completed");
          if (affected.length > 0 && (ses.date !== v.date || ses.start !== v.start)) {
            // In a real app: show notification dialog here
            // For demo: update status to reflect change
          }
          Object.assign(ses, { doctorId: v.doctorId, date: v.date, start: v.start, end: v.end, room: v.room, max: v.max, notes: v.notes ?? undefined });
        }
      } else {
        d.sessions.push({ id: `s${Date.now()}`, doctorId: v.doctorId, date: v.date, start: v.start, end: v.end, room: v.room, max: v.max, status: "Scheduled", nextQueue: 1, notes: v.notes ?? undefined });
      }
    });
    toast.success(editing ? "Session updated" : "Session created");
    setOpen(false);
  };

  const updateStatus = (ses: Session, status: SessionStatus) => {
    if (status === "Cancelled") { setCancelTarget(ses); return; }
    mutate((d) => { const x = d.sessions.find(s => s.id === ses.id); if (x) x.status = status; });
    toast.success(`Session status set to ${status}`);
  };

  // Calendar view: 7-day week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(calWeek, i));

  return (
    <>
      <PageHeader
        title="Doctor Sessions"
        description="Schedule and manage doctor session slots."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setView(v => v === "list" ? "calendar" : "list")}>
              {view === "list" ? <><CalendarDays className="mr-2 size-4" />Calendar</> : <><List className="mr-2 size-4" />List</>}
            </Button>
            {canManage && <Button onClick={openAdd}><Plus className="mr-2 size-4" />Add session</Button>}
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <NativeSelect value={filterDoc} onChange={e => setFilterDoc(e.target.value)} aria-label="Filter by doctor" className="w-48">
          <option value="">All doctors</option>
          {db.doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </NativeSelect>
        <NativeSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status" className="w-36">
          <option value="">All statuses</option>
          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
        </NativeSelect>
        <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} aria-label="From date" className="w-40" />
        <span className="flex items-center text-muted-foreground text-sm">to</span>
        <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} aria-label="To date" className="w-40" />
      </div>

      {view === "list" ? (
        <div className="rounded-lg border bg-card shadow-xs">
          <TableWrap>
            <table className="w-full text-sm">
              <thead><tr className="border-b">{["Date","Doctor","Time","Room","Booked/Max","Status",""].map(h => <th key={h} className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${h === "" ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {filtered.map(ses => {
                  const doc = db.doctors.find(d => d.id === ses.doctorId);
                  const booked = sessionBooked(db, ses.id);
                  return (
                    <tr key={ses.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2">{fmtDate(ses.date)}</td>
                      <td className="px-4 py-2 font-medium">{doc?.name ?? "—"}</td>
                      <td className="px-4 py-2 tabular">{ses.start}–{ses.end}</td>
                      <td className="px-4 py-2">{ses.room}</td>
                      <td className="px-4 py-2 tabular">
                        <span className={booked >= ses.max ? "text-destructive font-medium" : ""}>{booked}/{ses.max}</span>
                      </td>
                      <td className="px-4 py-2">
                        {canManage ? (
                          <NativeSelect
                            value={ses.status}
                            onChange={e => updateStatus(ses, e.target.value as SessionStatus)}
                            className="w-32 h-7 text-xs"
                            aria-label="Session status"
                          >
                            {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                          </NativeSelect>
                        ) : <StatusBadge status={ses.status} />}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {canManage && <Button variant="ghost" size="sm" onClick={() => openEdit(ses)} aria-label="Edit session"><Pencil className="size-4" /></Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
          {filtered.length === 0 && <Empty title="No sessions found">Adjust filters or add a new session.</Empty>}
        </div>
      ) : (
        /* Calendar view */
        <div className="rounded-lg border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <Button variant="outline" size="sm" onClick={() => setCalWeek(w => addDays(w, -7))}>← Prev week</Button>
            <span className="text-sm font-medium">{format(calWeek, "d MMM")} – {format(addDays(calWeek, 6), "d MMM yyyy")}</span>
            <Button variant="outline" size="sm" onClick={() => setCalWeek(w => addDays(w, 7))}>Next week →</Button>
          </div>
          <div className="grid grid-cols-7 divide-x">
            {weekDays.map(d => {
              const ds = format(d, "yyyy-MM-dd");
              const daySessions = db.sessions.filter(s => s.date === ds && (!filterDoc || s.doctorId === filterDoc));
              const isToday = ds === format(new Date(), "yyyy-MM-dd");
              return (
                <div key={ds} className={`min-h-[120px] p-2 ${isToday ? "bg-info-soft/30" : ""}`}>
                  <div className={`mb-1 text-center text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {format(d, "EEE")}<br /><span className={isToday ? "font-semibold text-primary" : ""}>{format(d, "d")}</span>
                  </div>
                  <div className="space-y-1">
                    {daySessions.map(ses => {
                      const doc = db.doctors.find(x => x.id === ses.doctorId);
                      return (
                        <div
                          key={ses.id}
                          onClick={() => canManage && openEdit(ses)}
                          className={`rounded p-1 text-xs cursor-pointer ${ses.status === "Cancelled" ? "bg-danger-soft text-destructive" : ses.status === "Completed" ? "bg-muted text-muted-foreground" : ses.status === "Delayed" ? "bg-warning-soft text-warning" : "bg-info-soft text-primary"}`}
                          title={`${doc?.name} · ${ses.start}–${ses.end} · ${ses.room}`}
                        >
                          <div className="truncate font-medium">{doc?.name.split(" ").slice(1).join(" ")}</div>
                          <div>{ses.start}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit session" : "New session"}</DialogTitle>
            <DialogDescription>Conflicts with the same doctor or room are automatically detected.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Doctor <span className="text-destructive">*</span></Label>
                <NativeSelect {...register("doctorId")}>
                  {activeDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </NativeSelect>
                {errors.doctorId && <p role="alert" className="text-xs text-destructive">{errors.doctorId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Date <span className="text-destructive">*</span></Label>
                <Input type="date" {...register("date")} />
                {errors.date && <p role="alert" className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Room <span className="text-destructive">*</span></Label>
                <Input {...register("room")} placeholder="OPD-1" />
                {errors.room && <p role="alert" className="text-xs text-destructive">{errors.room.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Start time <span className="text-destructive">*</span></Label>
                <Input type="time" {...register("start")} />
                {errors.start && <p role="alert" className="text-xs text-destructive">{errors.start.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>End time <span className="text-destructive">*</span></Label>
                <Input type="time" {...register("end")} />
                {errors.end && <p role="alert" className="text-xs text-destructive">{errors.end.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Max bookings <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} max={100} {...register("max")} />
                {errors.max && <p role="alert" className="text-xs text-destructive">{errors.max.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input {...register("notes")} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{editing ? "Save changes" : "Create session"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={v => { if (!v) setCancelTarget(null); }}
        title="Cancel this session?"
        description={cancelTarget ? `${db.appointments.filter(a => a.sessionId === cancelTarget.id && a.status !== "Cancelled").length} active bookings will need to be notified.` : ""}
        requireReason
        reasonLabel="Reason for cancellation"
        confirmLabel="Cancel session"
        destructive
        onConfirm={(reason) => {
          if (!cancelTarget) return;
          mutate((d) => {
            const ses = d.sessions.find(s => s.id === cancelTarget.id);
            if (ses) {
              ses.status = "Cancelled";
              // In production: trigger notifications for affected bookings
              const userId = d.auth.userId!;
              const userName = d.users.find(u => u.id === userId)?.name ?? "";
              d.auditLog.unshift({ id: `audit${Date.now()}`, ts: new Date().toISOString(), userId, userName, action: "update", entity: "session", entityId: ses.id, detail: `Session cancelled: ${ses.date} ${ses.start}–${ses.end} · Reason: ${reason}` });
            }
          });
          toast.success("Session cancelled");
          setCancelTarget(null);
        }}
      />
    </>
  );
}

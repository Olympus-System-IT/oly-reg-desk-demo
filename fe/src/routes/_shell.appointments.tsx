"use client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format, addDays } from "date-fns";
import { Guard, PageHeader, StatusBadge, Empty, TableWrap, NativeSelect, ConfirmDialog } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mutate, useDB } from "@/lib/hms/store";
import { fmtDate, fmtDateTime, invoiceTotals, money } from "@/lib/hms/logic";
import type { ApptStatus } from "@/lib/hms/types";
import { toast } from "sonner";
import { can } from "@/lib/hms/permissions";
import { useCurrentUser } from "@/lib/hms/store";

export const Route = createFileRoute("/_shell/appointments")({
  head: () => ({ meta: [{ title: "Appointments — Hospital Management System" }] }),
  component: () => <Guard perm="patients.view" what="appointments"><Appointments /></Guard>,
});

const STATUSES: ApptStatus[] = ["Booked", "Checked In", "Waiting", "In Consultation", "Completed", "No-show", "Cancelled"];

function Appointments() {
  const db = useDB();
  const user = useCurrentUser();
  const canManage = can(user, "bookings.manage");
  const canSeeFinancials = can(user, "billing.view");

  const [search, setSearch] = useState("");
  const [filterDoc, setFilterDoc] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPayStatus, setFilterPayStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState(format(addDays(new Date(), -7), "yyyy-MM-dd"));
  const [filterTo, setFilterTo] = useState(format(addDays(new Date(), 14), "yyyy-MM-dd"));
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const filtered = db.appointments.filter(a => {
    const ses = db.sessions.find(s => s.id === a.sessionId);
    if (!ses) return false;
    if (ses.date < filterFrom || ses.date > filterTo) return false;
    if (filterDoc && ses.doctorId !== filterDoc) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    const patient = db.patients.find(p => p.id === a.patientId);
    if (search) {
      const q = search.toLowerCase();
      if (!a.ref.toLowerCase().includes(q) && !patient?.name.toLowerCase().includes(q) && !patient?.code.includes(q) && !patient?.mobile.includes(q)) return false;
    }
    if (filterPayStatus && canSeeFinancials) {
      const inv = a.invoiceId ? db.invoices.find(i => i.id === a.invoiceId) : undefined;
      const status = inv ? invoiceTotals(inv).status : "Unpaid";
      if (status !== filterPayStatus) return false;
    }
    return true;
  }).sort((a, b) => {
    const sa = db.sessions.find(s => s.id === a.sessionId);
    const sb = db.sessions.find(s => s.id === b.sessionId);
    return (sb?.date ?? "").localeCompare(sa?.date ?? "") || (sb?.start ?? "").localeCompare(sa?.start ?? "");
  });

  return (
    <>
      <PageHeader
        title="Appointments"
        description="All appointments across sessions. Use filters to narrow down."
        actions={<Button asChild><Link to="/book">New booking</Link></Button>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ref, patient name, ID, mobile…"
          className="flex-1 min-w-[200px]"
          aria-label="Search appointments"
        />
        <NativeSelect value={filterDoc} onChange={e => setFilterDoc(e.target.value)} aria-label="Filter by doctor" className="w-48">
          <option value="">All doctors</option>
          {db.doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </NativeSelect>
        <NativeSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by appointment status" className="w-44">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </NativeSelect>
        {canSeeFinancials && (
          <NativeSelect value={filterPayStatus} onChange={e => setFilterPayStatus(e.target.value)} aria-label="Filter by payment status" className="w-44">
            <option value="">All payment statuses</option>
            {["Unpaid", "Partially Paid", "Paid", "Voided", "Refunded"].map(s => <option key={s}>{s}</option>)}
          </NativeSelect>
        )}
        <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} aria-label="From date" className="w-40" />
        <span className="flex items-center text-muted-foreground text-sm">to</span>
        <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} aria-label="To date" className="w-40" />
      </div>

      <div className="mb-3 text-xs text-muted-foreground">{filtered.length} appointments found</div>

      <div className="rounded-lg border bg-card shadow-xs">
        <TableWrap>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["Ref", "Date", "Patient", "Doctor", "Queue", "Source", "Status", ...(canSeeFinancials ? ["Payment"] : []), ""].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.slice(0, 100).map(a => {
                const ses = db.sessions.find(s => s.id === a.sessionId)!;
                const doc = db.doctors.find(d => d.id === ses?.doctorId);
                const patient = db.patients.find(p => p.id === a.patientId);
                const inv = a.invoiceId ? db.invoices.find(i => i.id === a.invoiceId) : undefined;
                const tot = inv ? invoiceTotals(inv, db.settings.taxRate) : null;

                return (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs">{a.ref}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{ses ? fmtDate(ses.date) : "—"}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{patient?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{patient?.code}</div>
                    </td>
                    <td className="px-4 py-2">{doc?.name ?? "—"}</td>
                    <td className="px-4 py-2 tabular font-semibold text-primary">#{a.queueNo}</td>
                    <td className="px-4 py-2 text-muted-foreground">{a.source}</td>
                    <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                    {canSeeFinancials && (
                      <td className="px-4 py-2">
                        {tot ? <StatusBadge status={tot.status} /> : <span className="text-muted-foreground text-xs">No invoice</span>}
                      </td>
                    )}
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {canSeeFinancials && inv && (
                          <Button asChild variant="ghost" size="sm">
                            <Link to="/invoices/$id" params={{ id: inv.id }}>Invoice</Link>
                          </Button>
                        )}
                        {canManage && a.status !== "Cancelled" && a.status !== "Completed" && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setCancelTarget(a.id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && <Empty title="No appointments found">Adjust your filters or date range.</Empty>}
        {filtered.length > 100 && <p className="border-t px-4 py-2 text-center text-xs text-muted-foreground">Showing first 100. Narrow your filters to see more.</p>}
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={v => { if (!v) setCancelTarget(null); }}
        title="Cancel this appointment?"
        description="The queue number will not be reassigned."
        requireReason
        reasonLabel="Reason for cancellation"
        confirmLabel="Cancel appointment"
        destructive
        onConfirm={(reason) => {
          if (!cancelTarget) return;
          mutate((d) => {
            const a = d.appointments.find(x => x.id === cancelTarget);
            if (a) { a.status = "Cancelled"; a.cancelReason = reason; }
          });
          toast.success("Appointment cancelled");
          setCancelTarget(null);
        }}
      />
    </>
  );
}

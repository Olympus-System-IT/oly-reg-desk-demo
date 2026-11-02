"use client";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Guard, PageHeader, StatusBadge, TableWrap, Empty, Panel } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getDB } from "@/lib/hms/store";
import { useDB } from "@/lib/hms/store";
import { invoiceTotals, money, sessionLabel, fmtDate } from "@/lib/hms/logic";

export const Route = createFileRoute("/_shell/doctors/$id")({
  head: () => ({ meta: [{ title: "Doctor — Hospital Management System" }] }),
  component: () => <Guard perm="setup.manage" what="doctor details"><DoctorDetail /></Guard>,
});

function DoctorDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const doc = db.doctors.find(d => d.id === id);
  if (!doc) return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">Doctor not found.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/doctors"><ArrowLeft className="mr-2 size-4" />Back</Link></Button>
    </div>
  );

  const sp = db.specialties.find(s => s.id === doc.specialtyId);
  const docSessions = db.sessions.filter(s => s.doctorId === doc.id).sort((a, b) => b.date.localeCompare(a.date));
  const docAppts = db.appointments.filter(a => {
    const ses = db.sessions.find(s => s.id === a.sessionId);
    return ses?.doctorId === doc.id;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const payoutLabel = doc.payout.type === "none" ? "No hospital charge rule"
    : doc.payout.type === "fixed" ? `Fixed LKR ${doc.payout.value.toLocaleString()} per consultation`
    : `${doc.payout.value}% of consultation fee`;

  return (
    <>
      <div className="mb-5">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
          <Link to="/doctors"><ArrowLeft className="mr-1 size-4" />Back to Doctors</Link>
        </Button>
        <PageHeader
          title={doc.name}
          description={`${doc.code} · ${sp?.name ?? "Unknown consultant type"} · ${doc.active ? "Active" : "Inactive"}`}
          actions={<StatusBadge status={doc.active ? "Active" : "Inactive"} />}
        />
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({docSessions.length})</TabsTrigger>
          <TabsTrigger value="appointments">Appointments ({docAppts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Panel title="Contact">
              <dl className="divide-y px-4 py-2 text-sm">
                {[
                  ["Mobile", doc.mobile],
                  ["Email", doc.email ?? "—"],
                  ["SLMC Reg. No.", doc.regNo ?? "—"],
                  ["Qualifications", doc.qualifications ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2 py-2">
                    <dt className="w-36 shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel title="Fees & Hospital Charge">
              <dl className="divide-y px-4 py-2 text-sm">
                {[
                  ["Consultation fee", money(doc.fee)],
                  ["Hospital charge rule", payoutLabel],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2 py-2">
                    <dt className="w-36 shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel title="Stats">
              <dl className="divide-y px-4 py-2 text-sm">
                {[
                  ["Total sessions", docSessions.length],
                  ["Total appointments", docAppts.length],
                  ["Completed", docAppts.filter(a => a.status === "Completed").length],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2 py-2">
                    <dt className="w-36 shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="font-semibold tabular">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="sessions">
          <div className="rounded-lg border bg-card shadow-xs">
            <TableWrap>
              <table className="w-full text-sm">
                <thead><tr className="border-b">{["Date","Time","Room","Max","Booked","Status"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {docSessions.slice(0, 50).map(ses => {
                    const booked = db.appointments.filter(a => a.sessionId === ses.id && a.status !== "Cancelled").length;
                    return (
                      <tr key={ses.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2">{fmtDate(ses.date)}</td>
                        <td className="px-4 py-2 tabular">{ses.start}–{ses.end}</td>
                        <td className="px-4 py-2">{ses.room}</td>
                        <td className="px-4 py-2 tabular">{ses.max}</td>
                        <td className="px-4 py-2 tabular">{booked}</td>
                        <td className="px-4 py-2"><StatusBadge status={ses.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
            {docSessions.length === 0 && <Empty title="No sessions for this doctor" />}
          </div>
        </TabsContent>

        <TabsContent value="appointments">
          <div className="rounded-lg border bg-card shadow-xs">
            <TableWrap>
              <table className="w-full text-sm">
                <thead><tr className="border-b">{["Ref","Patient","Date","Queue","Status","Invoice"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {docAppts.slice(0, 50).map(a => {
                    const ses = db.sessions.find(s => s.id === a.sessionId);
                    const patient = db.patients.find(p => p.id === a.patientId);
                    const inv = a.invoiceId ? db.invoices.find(i => i.id === a.invoiceId) : undefined;
                    const tot = inv ? invoiceTotals(inv) : null;
                    return (
                      <tr key={a.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs">{a.ref}</td>
                        <td className="px-4 py-2">{patient?.name ?? "—"}</td>
                        <td className="px-4 py-2">{ses ? fmtDate(ses.date) : "—"}</td>
                        <td className="px-4 py-2 tabular">#{a.queueNo}</td>
                        <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                        <td className="px-4 py-2">
                          {tot ? <StatusBadge status={tot.status} /> : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
            {docAppts.length === 0 && <Empty title="No appointments for this doctor" />}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

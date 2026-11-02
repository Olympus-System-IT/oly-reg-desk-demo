"use client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Guard, PageHeader, StatusBadge, TableWrap, Empty, Panel } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { useDB } from "@/lib/hms/store";
import { patientAge, invoiceTotals, money, fmtDate, fmtDateTime } from "@/lib/hms/logic";
import { can } from "@/lib/hms/permissions";
import { useCurrentUser } from "@/lib/hms/store";

export const Route = createFileRoute("/_shell/patients/$id")({
  head: () => ({ meta: [{ title: "Patient — Hospital Management System" }] }),
  component: () => <Guard perm="patients.view" what="patient records"><PatientDetail /></Guard>,
});

function PatientDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const user = useCurrentUser();
  const canSeeFinancials = can(user, "billing.view");

  const patient = db.patients.find(p => p.id === id);
  if (!patient) return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">Patient not found.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/patients"><ArrowLeft className="mr-2 size-4" />Back to Patients</Link></Button>
    </div>
  );

  const appts = db.appointments.filter(a => a.patientId === patient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const invoices = db.invoices.filter(i => i.patientId === patient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
        <Link to="/patients"><ArrowLeft className="mr-1 size-4" />Back to Patients</Link>
      </Button>
      <PageHeader
        title={patient.name}
        description={`${patient.code} · ${patientAge(patient)}${patient.sex ? ` · ${patient.sex}` : ""}`}
      />

      <Tabs defaultValue="info">
        <TabsList className="mb-4">
          <TabsTrigger value="info">Profile</TabsTrigger>
          <TabsTrigger value="appointments">Appointments ({appts.length})</TabsTrigger>
          {canSeeFinancials && <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="info">
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title="Contact">
              <dl className="divide-y px-4 py-2 text-sm">
                {[
                  ["Patient ID", patient.code],
                  ["Mobile", patient.mobile || "—"],
                  ["Address", patient.address ?? "—"],
                  ["Guardian", patient.guardian ?? "—"],
                  ["SMS consent", patient.smsConsent ? "Yes" : "No"],
                  ["Registered", fmtDate(patient.createdAt)],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2 py-2">
                    <dt className="w-36 shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel title="Summary">
              <dl className="divide-y px-4 py-2 text-sm">
                {[
                  ["Total appointments", appts.length],
                  ["Completed", appts.filter(a => a.status === "Completed").length],
                  ["Cancelled", appts.filter(a => a.status === "Cancelled").length],
                  ...(canSeeFinancials ? [
                    ["Total invoiced", money(invoices.reduce((s, i) => s + invoiceTotals(i).total, 0))],
                    ["Outstanding", money(invoices.reduce((s, i) => s + invoiceTotals(i).balance, 0))],
                  ] : []),
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

        <TabsContent value="appointments">
          <div className="rounded-lg border bg-card shadow-xs">
            <TableWrap>
              <table className="w-full text-sm">
                <thead><tr className="border-b">{["Ref","Date","Doctor","Queue","Source","Status"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {appts.map(a => {
                    const ses = db.sessions.find(s => s.id === a.sessionId);
                    const doc = ses ? db.doctors.find(d => d.id === ses.doctorId) : undefined;
                    return (
                      <tr key={a.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs">{a.ref}</td>
                        <td className="px-4 py-2">{ses ? fmtDate(ses.date) : "—"}</td>
                        <td className="px-4 py-2">{doc?.name ?? "—"}</td>
                        <td className="px-4 py-2 tabular">#{a.queueNo}</td>
                        <td className="px-4 py-2 text-muted-foreground">{a.source}</td>
                        <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
            {appts.length === 0 && <Empty title="No appointments for this patient" />}
          </div>
        </TabsContent>

        {canSeeFinancials && (
          <TabsContent value="invoices">
            <div className="rounded-lg border bg-card shadow-xs">
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="border-b">{["Invoice","Date","Total","Paid","Balance","Status",""].map(h => <th key={h} className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${h === "" ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {invoices.map(inv => {
                      const t = invoiceTotals(inv, db.settings.taxRate);
                      return (
                        <tr key={inv.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2 font-mono text-xs">{inv.no}</td>
                          <td className="px-4 py-2">{fmtDate(inv.createdAt)}</td>
                          <td className="px-4 py-2 tabular">{money(t.total)}</td>
                          <td className="px-4 py-2 tabular">{money(t.paid)}</td>
                          <td className="px-4 py-2 tabular font-medium">{money(t.balance)}</td>
                          <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                          <td className="px-4 py-2 text-right"><Button asChild variant="ghost" size="sm"><Link to="/invoices/$id" params={{ id: inv.id }}>View</Link></Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
              {invoices.length === 0 && <Empty title="No invoices for this patient" />}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

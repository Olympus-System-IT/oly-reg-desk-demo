"use client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format, addDays } from "date-fns";
import { Guard, PageHeader, StatusBadge, Empty, TableWrap, NativeSelect } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDB } from "@/lib/hms/store";
import { invoiceTotals, money, fmtDate } from "@/lib/hms/logic";

export const Route = createFileRoute("/_shell/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Hospital Management System" }] }),
  component: () => <Guard perm="billing.view" what="invoices"><InvoiceList /></Guard>,
});

function InvoiceList() {
  const db = useDB();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterFrom, setFilterFrom] = useState(format(addDays(new Date(), -30), "yyyy-MM-dd"));
  const [filterTo, setFilterTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const filtered = db.invoices.filter(inv => {
    const t = invoiceTotals(inv, db.settings.taxRate);
    const patient = db.patients.find(p => p.id === inv.patientId);
    const q = search.toLowerCase();
    if (q && !inv.no.toLowerCase().includes(q) && !patient?.name.toLowerCase().includes(q) && !patient?.code.includes(q)) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterMethod && !inv.payments.some(p => p.method === filterMethod)) return false;
    if (!inv.createdAt.startsWith("") || inv.createdAt.slice(0, 10) < filterFrom || inv.createdAt.slice(0, 10) > filterTo) return false;
    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const grandTotal = filtered.reduce((s, i) => s + invoiceTotals(i, db.settings.taxRate).total, 0);
  const grandPaid = filtered.reduce((s, i) => s + invoiceTotals(i, db.settings.taxRate).paid, 0);
  const grandBalance = filtered.reduce((s, i) => s + invoiceTotals(i, db.settings.taxRate).balance, 0);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="All invoices. Click an invoice to view details, collect balance, or void."
        actions={<Button asChild><Link to="/pos">New invoice</Link></Button>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice no, patient name, ID…" className="flex-1 min-w-[200px]" aria-label="Search invoices" />
        <NativeSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status" className="w-44">
          <option value="">All statuses</option>
          {["Unpaid", "Partially Paid", "Paid", "Partially Refunded", "Refunded", "Voided"].map(s => <option key={s}>{s}</option>)}
        </NativeSelect>
        <NativeSelect value={filterMethod} onChange={e => setFilterMethod(e.target.value)} aria-label="Filter by payment method" className="w-44">
          <option value="">All methods</option>
          <option>Cash</option>
          <option>Card</option>
          <option>Bank transfer</option>
        </NativeSelect>
        <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} aria-label="From date" className="w-40" />
        <span className="flex items-center text-muted-foreground text-sm">to</span>
        <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} aria-label="To date" className="w-40" />
      </div>

      {/* Totals summary */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total invoiced", value: money(grandTotal) },
          { label: "Collected", value: money(grandPaid) },
          { label: "Outstanding", value: money(grandBalance) },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card px-4 py-3 shadow-xs">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-lg font-semibold tabular">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card shadow-xs">
        <TableWrap>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["Invoice","Date","Patient","Total","Paid","Balance","Method","Status",""].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.slice(0, 100).map(inv => {
                const t = invoiceTotals(inv, db.settings.taxRate);
                const patient = db.patients.find(p => p.id === inv.patientId);
                const methods = [...new Set(inv.payments.map(p => p.method))].join("/");
                return (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs">{inv.no}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDate(inv.createdAt)}</td>
                    <td className="px-4 py-2">
                      <div>{patient?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{patient?.code}</div>
                    </td>
                    <td className="px-4 py-2 tabular">{money(t.total)}</td>
                    <td className="px-4 py-2 tabular">{money(t.paid)}</td>
                    <td className="px-4 py-2 tabular font-medium">{money(t.balance)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{methods || "—"}</td>
                    <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-2 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/invoices/$id" params={{ id: inv.id }}>View</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && <Empty title="No invoices found">Adjust your filters.</Empty>}
        {filtered.length > 100 && <p className="border-t px-4 py-2 text-center text-xs text-muted-foreground">Showing first 100. Narrow your filters.</p>}
      </div>
    </>
  );
}

"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Receipt,
  Search,
  Printer,
  Calendar,
  CreditCard,
  User,
  CheckCircle2,
} from "lucide-react";
import { Guard, PageHeader, StatusBadge, TableWrap, NativeSelect } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useDB } from "@/lib/hms/store";
import { money } from "@/lib/hms/logic";
import type { PharmacyDispense } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/pharmacy/history")({
  head: () => ({
    meta: [
      { title: "Dispensed History — Hospital Management System" },
      { name: "description", content: "Archived ledger of all completed pharmacy counter dispensing transactions." },
    ],
  }),
  component: () => (
    <Guard perm="pharmacy.access" what="dispensing history ledger">
      <DispensedHistoryPage />
    </Guard>
  ),
});

function DispensedHistoryPage() {
  const db = useDB();

  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [selectedDispense, setSelectedDispense] = useState<PharmacyDispense | null>(null);

  const filtered = useMemo(() => {
    return db.dispenses.filter((d) => {
      const q = search.toLowerCase().trim();
      const matchQ =
        !q ||
        d.no.toLowerCase().includes(q) ||
        d.patientName.toLowerCase().includes(q) ||
        (d.patientMobile && d.patientMobile.includes(q)) ||
        d.items.some((i) => i.medicineName.toLowerCase().includes(q) || i.batchNo.toLowerCase().includes(q));

      const matchMethod = !filterMethod || d.payMethod === filterMethod;
      return matchQ && matchMethod;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [db.dispenses, search, filterMethod]);

  const totalRevenue = useMemo(() => filtered.reduce((s, d) => s + d.total, 0), [filtered]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Dispensed Transactions History"
        description="Search past counter sales and doctor prescription dispensings, verify batch allocations, and re-print receipts."
      />

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Transactions Logged</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{filtered.length}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Dispensed Value</div>
          <div className="mt-1 text-2xl font-bold text-primary tabular">{money(totalRevenue)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Average Basket Size</div>
          <div className="mt-1 text-2xl font-bold text-foreground tabular">
            {money(filtered.length > 0 ? totalRevenue / filtered.length : 0)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by dispense #, patient name, mobile, medication, batch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <NativeSelect
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="w-44"
        >
          <option value="">All Payment Methods</option>
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
          <option value="Bank transfer">Bank transfer</option>
        </NativeSelect>
      </div>

      {/* Table */}
      <TableWrap>
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="py-3 px-4 font-medium">Dispense No</th>
              <th className="py-3 px-4 font-medium">Date & Time</th>
              <th className="py-3 px-4 font-medium">Patient</th>
              <th className="py-3 px-4 font-medium">Prescription / Type</th>
              <th className="py-3 px-4 font-medium">Dispensed Medications</th>
              <th className="py-3 px-4 font-medium text-center">Payment</th>
              <th className="py-3 px-4 font-medium text-right">Net Total</th>
              <th className="py-3 px-4 text-right font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  No dispensing transactions found matching your search.
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-primary">{d.no}</td>
                  <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                    {d.date.slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-foreground">{d.patientName}</div>
                    {d.patientMobile && (
                      <div className="text-[11px] text-muted-foreground">{d.patientMobile}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {d.prescriptionId ? (
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {db.prescriptions.find((p) => p.id === d.prescriptionId)?.no ?? "Prescription"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">Direct Counter (OTC)</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-foreground">{d.items.length} items</div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                      {d.items.map((i) => `${i.medicineName} (${i.qty})`).join(", ")}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {d.payMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold tabular text-foreground">
                    {money(d.total)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDispense(d)}
                      className="h-7 text-xs"
                    >
                      <Receipt className="mr-1 size-3.5" /> Receipt
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* View Receipt Dialog */}
      <Dialog open={Boolean(selectedDispense)} onOpenChange={(open) => !open && setSelectedDispense(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              Pharmacy Dispensary Receipt
            </DialogTitle>
            <DialogDescription className="text-xs">
              Official hospital pharmacy cash receipt and batch audit bill.
            </DialogDescription>
          </DialogHeader>

          {selectedDispense && (
            <div className="rounded-lg border bg-muted/20 p-4 text-xs font-mono space-y-3">
              <div className="text-center border-b pb-2">
                <div className="font-bold text-sm">OLYMPUS LANKA HOSPITAL</div>
                <div className="text-[11px] text-muted-foreground">Hospital Road, Thissamaharama</div>
                <div className="text-[11px] text-muted-foreground">Dispensary Cashier Desk</div>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                <div>Receipt: <span className="font-semibold text-foreground">{selectedDispense.no}</span></div>
                <div>Date: {selectedDispense.date.slice(0, 16).replace("T", " ")}</div>
                <div>Customer: <span className="text-foreground">{selectedDispense.patientName}</span></div>
                <div>Method: {selectedDispense.payMethod}</div>
              </div>

              <Separator />

              <div className="space-y-1.5 text-[11px]">
                {selectedDispense.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <div>
                      <div className="font-medium text-foreground">{it.medicineName}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Batch: {it.batchNo} | Qty: {it.qty} × {it.unitPrice}
                      </div>
                    </div>
                    <div className="font-semibold text-foreground">{money(it.total)}</div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{money(selectedDispense.subtotal)}</span>
                </div>
                {selectedDispense.discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount:</span>
                    <span>-{money(selectedDispense.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t">
                  <span>Total Paid:</span>
                  <span className="text-primary">{money(selectedDispense.total)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-muted-foreground pt-2 border-t">
                Served by: {selectedDispense.by} · Olympus Lanka Pharmacy
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs"
            >
              <Printer className="mr-1.5 size-3.5" /> Print
            </Button>
            <Button size="sm" onClick={() => setSelectedDispense(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


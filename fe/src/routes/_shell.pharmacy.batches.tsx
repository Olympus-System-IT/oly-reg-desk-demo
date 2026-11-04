"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Search,
  Boxes,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  PackageX,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, TableWrap, NativeSelect, Field } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { mutate, useCurrentUser, useDB } from "@/lib/hms/store";
import { money } from "@/lib/hms/logic";
import { getBatchExpiryStatus } from "@/lib/hms/pharmacyLogic";
import type { MedicineBatch } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/pharmacy/batches")({
  head: () => ({
    meta: [
      { title: "Batch & Expiry Tracker — Hospital Management System" },
      { name: "description", content: "Pharmaceutical batch tracking, shelf-life expiry alerts, and stock adjustments." },
    ],
  }),
  component: () => (
    <Guard perm="pharmacy.inventory" what="batch tracking and expiry monitoring">
      <BatchTrackerPage />
    </Guard>
  ),
});

function BatchTrackerPage() {
  const db = useDB();
  const user = useCurrentUser();

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "critical30" | "warning90" | "expired" | "active" | "depleted">("all");
  const [adjustBatch, setAdjustBatch] = useState<MedicineBatch | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("Physical stock count verification");

  const filteredBatches = useMemo(() => {
    return db.batches.filter((b) => {
      const med = db.medicines.find((m) => m.id === b.medicineId);
      const sup = db.suppliers.find((s) => s.id === b.supplierId);
      const q = search.toLowerCase().trim();

      const matchQ =
        !q ||
        b.batchNo.toLowerCase().includes(q) ||
        (med && med.name.toLowerCase().includes(q)) ||
        (med && med.genericName.toLowerCase().includes(q)) ||
        (sup && sup.name.toLowerCase().includes(q));

      if (!matchQ) return false;

      const exp = getBatchExpiryStatus(b.expiryDate, b.quantity);

      if (filterTab === "critical30") {
        return b.quantity > 0 && exp.daysRemaining >= 0 && exp.daysRemaining <= 30;
      }
      if (filterTab === "warning90") {
        return b.quantity > 0 && exp.daysRemaining >= 0 && exp.daysRemaining <= 90;
      }
      if (filterTab === "expired") {
        return b.quantity > 0 && exp.status === "Expired";
      }
      if (filterTab === "active") {
        return b.quantity > 0 && exp.status !== "Expired";
      }
      if (filterTab === "depleted") {
        return b.quantity === 0;
      }

      return true;
    }).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  }, [db, search, filterTab]);

  const counts = useMemo(() => {
    let expired = 0;
    let critical30 = 0;
    let warning90 = 0;
    let active = 0;
    let depleted = 0;

    for (const b of db.batches) {
      if (b.quantity === 0) {
        depleted++;
        continue;
      }
      const exp = getBatchExpiryStatus(b.expiryDate, b.quantity);
      if (exp.status === "Expired") expired++;
      else {
        active++;
        if (exp.daysRemaining <= 30) critical30++;
        if (exp.daysRemaining <= 90) warning90++;
      }
    }

    return { all: db.batches.length, expired, critical30, warning90, active, depleted };
  }, [db.batches]);

  const handleOpenAdjust = (b: MedicineBatch) => {
    setAdjustBatch(b);
    setAdjustQty(b.quantity);
    setAdjustReason("Physical stock audit count verification");
  };

  const handleSaveAdjustment = () => {
    if (!adjustBatch) return;

    const diff = adjustQty - adjustBatch.quantity;
    if (diff === 0) {
      setAdjustBatch(null);
      return;
    }

    mutate((d) => {
      const b = d.batches.find((x) => x.id === adjustBatch.id);
      const med = d.medicines.find((m) => m.id === adjustBatch.medicineId);
      if (b) {
        const oldQty = b.quantity;
        b.quantity = Math.max(0, adjustQty);

        d.auditLog.unshift({
          id: `audit${Date.now()}`,
          ts: new Date().toISOString(),
          userId: d.auth.userId ?? "u8",
          userName: user?.name ?? "Pharmacist",
          action: "update",
          entity: "batch",
          entityId: b.id,
          detail: `Batch ${b.batchNo} (${med?.name}) adjusted from ${oldQty} to ${b.quantity}. Reason: ${adjustReason}`,
        });
      }
    });

    toast.success(`Batch ${adjustBatch.batchNo} quantity updated.`);
    setAdjustBatch(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Batch & Expiry Tracker"
        description="First-Expiring-First-Out (FEFO) shelf-life control, quarantine tracking for expired medicines, and audit adjustments."
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
            filterTab === "all" ? "bg-primary text-primary-foreground font-semibold" : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          All Batches ({counts.all})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("critical30")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
            filterTab === "critical30" ? "bg-destructive text-destructive-foreground font-semibold" : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          }`}
        >
          Expires ≤ 30 Days ({counts.critical30})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("warning90")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
            filterTab === "warning90" ? "bg-amber-600 text-white font-semibold" : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
          }`}
        >
          Expires ≤ 90 Days ({counts.warning90})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("expired")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
            filterTab === "expired" ? "bg-red-900 text-white font-semibold" : "bg-red-100 text-red-800 hover:bg-red-200"
          }`}
        >
          Expired ({counts.expired})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("active")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
            filterTab === "active" ? "bg-primary text-primary-foreground font-semibold" : "bg-info-soft text-primary hover:bg-muted border border-primary/20"
          }`}
        >
          Active Stock ({counts.active})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("depleted")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
            filterTab === "depleted" ? "bg-slate-700 text-white font-semibold" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Depleted ({counts.depleted})
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by batch number, medication name, or supplier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Batches Table */}
      <TableWrap>
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="py-3 px-4 font-medium">Batch Number</th>
              <th className="py-3 px-4 font-medium">Medication</th>
              <th className="py-3 px-4 font-medium">Supplier</th>
              <th className="py-3 px-4 font-medium">Received Date</th>
              <th className="py-3 px-4 font-medium">Expiry Date</th>
              <th className="py-3 px-4 font-medium text-center">Shelf-Life Status</th>
              <th className="py-3 px-4 font-medium text-center">Available / Initial</th>
              <th className="py-3 px-4 font-medium text-right">Cost Value</th>
              <th className="py-3 px-4 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredBatches.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  No batches matching this filter.
                </td>
              </tr>
            ) : (
              filteredBatches.map((batch) => {
                const med = db.medicines.find((m) => m.id === batch.medicineId);
                const sup = db.suppliers.find((s) => s.id === batch.supplierId);
                const exp = getBatchExpiryStatus(batch.expiryDate, batch.quantity);
                const isExpired = exp.status === "Expired";

                return (
                  <tr
                    key={batch.id}
                    className={`hover:bg-muted/20 transition-colors ${
                      isExpired ? "bg-red-500/5" : batch.quantity === 0 ? "opacity-60 bg-muted/10" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{batch.batchNo}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{med?.name ?? "Unknown Medicine"}</div>
                      <div className="text-[11px] text-muted-foreground">{med?.genericName}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{sup?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{batch.receivedDate}</td>
                    <td className="py-3 px-4 font-mono font-medium text-foreground">{batch.expiryDate}</td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={exp.label} tone={exp.tone} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold tabular text-foreground">{batch.quantity}</span>
                      <span className="text-muted-foreground font-normal"> / {batch.initialQuantity}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold tabular text-foreground">
                      {money(batch.quantity * batch.unitCost)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAdjust(batch)}
                        className="h-7 text-xs"
                      >
                        Adjust Qty
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* Adjust Quantity Dialog */}
      <Dialog open={Boolean(adjustBatch)} onOpenChange={(open) => !open && setAdjustBatch(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Adjust Batch Quantity</DialogTitle>
            <DialogDescription className="text-xs">
              Record physical stock count audit adjustments or quarantine damaged/expired goods.
            </DialogDescription>
          </DialogHeader>

          {adjustBatch && (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <div className="font-semibold text-foreground">
                  {db.medicines.find((m) => m.id === adjustBatch.medicineId)?.name}
                </div>
                <div className="text-muted-foreground">
                  Batch: <span className="font-mono font-semibold text-foreground">{adjustBatch.batchNo}</span> · Current Stock: {adjustBatch.quantity}
                </div>
              </div>

              <Field label="New Physical Stock Quantity" required>
                <Input
                  type="number"
                  min="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                />
              </Field>

              <Field label="Adjustment Reason" required>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-2xs"
                >
                  <option>Physical stock audit count verification</option>
                  <option>Expired stock write-off & quarantine</option>
                  <option>Damaged or broken ampoules / vials</option>
                  <option>Supplier return / exchange</option>
                  <option>Dispensary correction</option>
                </select>
              </Field>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setAdjustBatch(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAdjustment}>Save Adjustment</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


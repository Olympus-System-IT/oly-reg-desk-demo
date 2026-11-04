"use client";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  CreditCard,
  Pill,
  Search,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, Panel, Field, StatusBadge } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { mutate, useCurrentUser, useDB } from "@/lib/hms/store";
import { money } from "@/lib/hms/logic";
import {
  getMedicineStock,
  getMedicineBatches,
  getBatchExpiryStatus,
  allocateFefoBatches,
  todayDateStr,
} from "@/lib/hms/pharmacyLogic";
import type { PayMethod, PharmacyDispense, PharmacyDispenseItem, Prescription } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/pharmacy/dispense")({
  validateSearch: (search: Record<string, unknown>) => ({
    rxId: typeof search.rxId === "string" ? search.rxId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Dispense & Counter POS — Hospital Management System" },
      { name: "description", content: "Prescription dispensing, batch deduction, and OTC counter sales." },
    ],
  }),
  component: () => (
    <Guard perm="pharmacy.dispense" what="dispensing and pharmacy cashiering">
      <PharmacyDispensePage />
    </Guard>
  ),
});

type CartItem = {
  tempId: string;
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNo: string;
  expiryDate: string;
  dosage?: string;
  qty: number;
  availableBatchQty: number;
  unitPrice: number;
  total: number;
};

function PharmacyDispensePage() {
  const db = useDB();
  const user = useCurrentUser();
  const searchParams = useSearch({ from: "/_shell/pharmacy/dispense" });
  const navigate = useNavigate();

  const [mode, setMode] = useState<"prescription" | "otc">(searchParams.rxId ? "prescription" : "prescription");
  const [selectedRxId, setSelectedRxId] = useState<string>(searchParams.rxId ?? "");
  const [patientSearch, setPatientSearch] = useState("");
  const [walkInPatientName, setWalkInPatientName] = useState("");
  const [walkInPatientMobile, setWalkInPatientMobile] = useState("");
  const [medSearch, setMedSearch] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PayMethod>("Cash");
  const [cashTendered, setCashTendered] = useState<number | "">("");

  const [confirmedDispense, setConfirmedDispense] = useState<PharmacyDispense | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // When searchParams.rxId changes, set selected prescription
  useEffect(() => {
    if (searchParams.rxId) {
      setSelectedRxId(searchParams.rxId);
      loadPrescription(searchParams.rxId);
    }
  }, [searchParams.rxId]);

  const pendingPrescriptions = useMemo(
    () => db.prescriptions.filter((p) => p.status === "Pending"),
    [db.prescriptions]
  );

  const selectedRx = useMemo(
    () => (selectedRxId ? db.prescriptions.find((p) => p.id === selectedRxId) ?? null : null),
    [db.prescriptions, selectedRxId]
  );

  const selectedPatient = useMemo(() => {
    if (selectedRx) {
      return db.patients.find((p) => p.id === selectedRx.patientId) ?? null;
    }
    return null;
  }, [selectedRx, db.patients]);

  const loadPrescription = (rxId: string) => {
    const rx = db.prescriptions.find((p) => p.id === rxId);
    if (!rx) return;

    const newCart: CartItem[] = [];

    for (const item of rx.items) {
      const med = db.medicines.find((m) => m.id === item.medicineId);
      if (!med) continue;

      const fefo = allocateFefoBatches(db, med.id, item.quantity);

      if (fefo.allocations.length > 0) {
        // Add allocated batches
        for (const alloc of fefo.allocations) {
          const batch = db.batches.find((b) => b.id === alloc.batchId);
          newCart.push({
            tempId: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            medicineId: med.id,
            medicineName: med.name,
            batchId: alloc.batchId,
            batchNo: alloc.batchNo,
            expiryDate: alloc.expiryDate,
            dosage: item.dosage,
            qty: alloc.qty,
            availableBatchQty: batch?.quantity ?? alloc.qty,
            unitPrice: med.unitPrice,
            total: alloc.qty * med.unitPrice,
          });
        }
      } else {
        // No batch available - add line with zero stock alert
        newCart.push({
          tempId: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          medicineId: med.id,
          medicineName: med.name,
          batchId: "",
          batchNo: "No Batch",
          expiryDate: "-",
          dosage: item.dosage,
          qty: item.quantity,
          availableBatchQty: 0,
          unitPrice: med.unitPrice,
          total: item.quantity * med.unitPrice,
        });
      }
    }

    setCart(newCart);
  };

  const handleSelectPrescription = (rxId: string) => {
    setSelectedRxId(rxId);
    if (rxId) {
      loadPrescription(rxId);
    } else {
      setCart([]);
    }
  };

  // Medicine search suggestions
  const matchedMedicines = useMemo(() => {
    const q = medSearch.toLowerCase().trim();
    if (!q) return [];
    return db.medicines
      .filter(
        (m) =>
          m.active &&
          (m.name.toLowerCase().includes(q) ||
            m.genericName.toLowerCase().includes(q) ||
            m.code.toLowerCase().includes(q) ||
            m.category.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [db.medicines, medSearch]);

  const addMedicineToCart = (med: typeof db.medicines[0]) => {
    const batches = getMedicineBatches(db, med.id, true);
    if (batches.length === 0) {
      toast.error(`"${med.name}" is currently out of stock.`);
      return;
    }

    // Pick earliest non-expired batch (FEFO)
    const bestBatch = batches[0];
    setCart((prev) => [
      ...prev,
      {
        tempId: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        medicineId: med.id,
        medicineName: med.name,
        batchId: bestBatch.id,
        batchNo: bestBatch.batchNo,
        expiryDate: bestBatch.expiryDate,
        dosage: "As directed",
        qty: 1,
        availableBatchQty: bestBatch.quantity,
        unitPrice: med.unitPrice,
        total: med.unitPrice,
      },
    ]);
    setMedSearch("");
    toast.success(`Added ${med.name} (${bestBatch.batchNo}) to cart.`);
  };

  const updateCartItemQty = (tempId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((i) => i.tempId !== tempId));
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        return {
          ...item,
          qty: newQty,
          total: newQty * item.unitPrice,
        };
      })
    );
  };

  const removeCartItem = (tempId: string) => {
    setCart((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  // Calculations
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);
  const finalTotal = useMemo(() => Math.max(0, subtotal - (Number(discount) || 0)), [subtotal, discount]);
  const changeDue = useMemo(() => {
    if (payMethod !== "Cash" || cashTendered === "" || typeof cashTendered !== "number") return 0;
    return Math.max(0, cashTendered - finalTotal);
  }, [payMethod, cashTendered, finalTotal]);

  const handleConfirmDispense = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty. Add items to dispense.");
      return;
    }

    // Check for unassigned batches or stock shortages
    for (const item of cart) {
      if (!item.batchId) {
        toast.error(`Cannot dispense "${item.medicineName}": No active stock batch assigned.`);
        return;
      }
      if (item.qty > item.availableBatchQty) {
        toast.error(
          `Insufficient stock for "${item.medicineName}" in batch ${item.batchNo}. Available: ${item.availableBatchQty}, Requested: ${item.qty}`
        );
        return;
      }
    }

    if (payMethod === "Cash" && typeof cashTendered === "number" && cashTendered < finalTotal) {
      toast.error(`Cash tendered (${money(cashTendered)}) is less than total due (${money(finalTotal)})`);
      return;
    }

    const patientName =
      selectedPatient?.name ?? walkInPatientName.trim() ?? "Walk-in Customer";
    const patientMobile = selectedPatient?.mobile ?? walkInPatientMobile.trim() ?? "";

    let createdDispense: PharmacyDispense | null = null;

    mutate((d) => {
      const dispNo = `DSP-${String((d.counters["dispense"] = (d.counters["dispense"] ?? 0) + 1)).padStart(5, "0")}`;
      const dispId = `dsp${Date.now()}`;
      const nowIso = new Date().toISOString();

      // 1. Deduct stock from batches
      const dispenseItems: PharmacyDispenseItem[] = [];

      for (const item of cart) {
        const batch = d.batches.find((b) => b.id === item.batchId);
        if (batch) {
          batch.quantity = Math.max(0, batch.quantity - item.qty);
        }
        dispenseItems.push({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          batchId: item.batchId,
          batchNo: item.batchNo,
          dosage: item.dosage,
          qty: item.qty,
          unitPrice: item.unitPrice,
          total: item.total,
        });
      }

      // 2. Create PharmacyDispense record
      createdDispense = {
        id: dispId,
        no: dispNo,
        prescriptionId: selectedRx ? selectedRx.id : undefined,
        patientId: selectedPatient ? selectedPatient.id : "walk-in",
        patientName,
        patientMobile: patientMobile || undefined,
        date: nowIso,
        items: dispenseItems,
        subtotal,
        discount: Number(discount) || 0,
        total: finalTotal,
        payMethod,
        cashReceived: typeof cashTendered === "number" ? cashTendered : undefined,
        change: changeDue,
        by: user?.name ?? "Pharmacist",
        status: "Completed",
        notes: selectedRx ? `Dispensed for prescription ${selectedRx.no}` : "Walk-in OTC dispense",
      };

      d.dispenses.unshift(createdDispense);

      // 3. If prescription was selected, update its status
      if (selectedRx) {
        const rx = d.prescriptions.find((p) => p.id === selectedRx.id);
        if (rx) {
          rx.status = "Dispensed";
          rx.dispensedAt = nowIso;
          rx.dispensedBy = user?.name ?? "Pharmacist";
          rx.dispenseId = dispId;
        }
      }

      // 4. Audit log
      d.auditLog.unshift({
        id: `audit${Date.now()}`,
        ts: nowIso,
        userId: d.auth.userId ?? "u8",
        userName: user?.name ?? "Pharmacist",
        action: "create",
        entity: "dispense",
        entityId: dispId,
        detail: `Pharmacy dispense ${dispNo} processed for ${patientName}. Total: ${money(finalTotal)}`,
      });
    });

    toast.success("Prescription dispensed and payment collected successfully!");
    setConfirmedDispense(createdDispense);
    setReceiptOpen(true);
  };

  const handleReset = () => {
    setSelectedRxId("");
    setCart([]);
    setDiscount(0);
    setCashTendered("");
    setWalkInPatientName("");
    setWalkInPatientMobile("");
    setConfirmedDispense(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Prescription Dispensing & Counter POS"
        description="Verify doctor prescriptions, allocate FEFO medication batches, and collect pharmacy counter payments."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column: Selection & Items (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Mode Switcher */}
          <div className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mode:</span>
              <div className="flex rounded-lg border p-1 bg-muted/40">
                <button
                  type="button"
                  onClick={() => {
                    setMode("prescription");
                    setCart([]);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    mode === "prescription"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Doctor Prescription
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("otc");
                    setSelectedRxId("");
                    setCart([]);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    mode === "otc"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Direct OTC Walk-in Sale
                </button>
              </div>
            </div>

            {selectedRx && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
                Clear Selection
              </Button>
            )}
          </div>

          {/* Mode 1: Doctor Prescription Picker */}
          {mode === "prescription" && (
            <Panel title="Select Doctor Prescription">
              <div className="p-4 space-y-4">
                <Field label="Pending Prescriptions Queue" hint="Choose a prescription to automatically allocate medication batches">
                  <select
                    value={selectedRxId}
                    onChange={(e) => handleSelectPrescription(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">-- Choose a Pending Prescription ({pendingPrescriptions.length} waiting) --</option>
                    {pendingPrescriptions.map((rx) => {
                      const p = db.patients.find((pat) => pat.id === rx.patientId);
                      return (
                        <option key={rx.id} value={rx.id}>
                          {rx.no} — {p?.name ?? "Unknown"} ({rx.items.length} items) · Dr. {rx.doctorName ?? "Consultant"} · {rx.diagnosis}
                        </option>
                      );
                    })}
                  </select>
                </Field>

                {selectedRx && selectedPatient && (
                  <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <User className="size-3.5 text-primary" />
                        <span>{selectedPatient.name}</span>
                        <span className="font-mono text-muted-foreground">({selectedPatient.code})</span>
                      </div>
                      <StatusBadge status="Pending" tone="amber" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
                      <div>
                        <span className="block font-medium text-foreground">Doctor</span>
                        <span>{selectedRx.doctorName ?? "Consultant"}</span>
                      </div>
                      <div>
                        <span className="block font-medium text-foreground">Date</span>
                        <span>{selectedRx.date}</span>
                      </div>
                      <div>
                        <span className="block font-medium text-foreground">Diagnosis</span>
                        <span className="text-foreground">{selectedRx.diagnosis ?? "General consultation"}</span>
                      </div>
                      <div>
                        <span className="block font-medium text-foreground">Mobile</span>
                        <span>{selectedPatient.mobile || "—"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* Mode 2: Walk-in Patient Info */}
          {mode === "otc" && (
            <Panel title="Walk-in Customer Details (Optional)">
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Customer / Patient Name">
                  <Input
                    placeholder="e.g. Kamal Perera or Walk-in"
                    value={walkInPatientName}
                    onChange={(e) => setWalkInPatientName(e.target.value)}
                  />
                </Field>
                <Field label="Contact Mobile">
                  <Input
                    placeholder="e.g. 0771234567"
                    value={walkInPatientMobile}
                    onChange={(e) => setWalkInPatientMobile(e.target.value)}
                  />
                </Field>
              </div>
            </Panel>
          )}

          {/* Medication Search / Add Additional Items */}
          <Panel title="Add Medication / Item to Dispensing">
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search medication by name, brand, generic (e.g., Amoxicillin, Paracetamol, Omeprazole)…"
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {matchedMedicines.length > 0 && (
                <div className="rounded-lg border bg-card divide-y shadow-xs max-h-56 overflow-y-auto">
                  {matchedMedicines.map((m) => {
                    const avail = getMedicineStock(db, m.id);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-semibold text-foreground">{m.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {m.genericName} · {m.category} · Rack: {m.rackLocation ?? "A-1"}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-xs">
                            <div className="font-semibold text-foreground">{money(m.unitPrice)}</div>
                            <div className={`text-[11px] ${avail > 0 ? "text-primary font-medium" : "text-destructive"}`}>
                              {avail > 0 ? `${avail} in stock` : "Out of stock"}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addMedicineToCart(m)}
                            disabled={avail <= 0}
                            className="h-7 text-xs"
                          >
                            <Plus className="size-3.5 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>

          {/* Cart Items Table */}
          <Panel title={`Dispensing Items (${cart.length})`}>
            {cart.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No items in dispensing list. Select a prescription or search medications above to add items.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">Medication</th>
                      <th className="py-2.5 px-3 font-medium">Batch / Expiry</th>
                      <th className="py-2.5 px-3 font-medium">Dosage Instructions</th>
                      <th className="py-2.5 px-3 font-medium text-center">Qty</th>
                      <th className="py-2.5 px-3 font-medium text-right">Price</th>
                      <th className="py-2.5 px-3 font-medium text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cart.map((item) => {
                      const exp = item.expiryDate !== "-" ? getBatchExpiryStatus(item.expiryDate, item.qty) : null;
                      const hasShortage = item.qty > item.availableBatchQty;

                      return (
                        <tr key={item.tempId} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-foreground">{item.medicineName}</div>
                            {hasShortage && (
                              <div className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-0.5">
                                <AlertTriangle className="size-3" /> Shortage (Batch has {item.availableBatchQty})
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-mono text-xs">{item.batchNo}</div>
                            {exp && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Exp: {item.expiryDate}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-muted-foreground text-xs">{item.dosage || "As directed"}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateCartItemQty(item.tempId, parseInt(e.target.value) || 0)}
                              className="w-16 rounded border px-2 py-1 text-center text-xs font-semibold"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right tabular text-muted-foreground">
                            {money(item.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold tabular text-foreground">
                            {money(item.total)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeCartItem(item.tempId)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded"
                              title="Remove item"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Right column: Cashiering & Totals (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          <Panel title="Payment & Cashiering">
            <div className="p-4 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground tabular">{money(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Discount (LKR)</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discount || ""}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="h-8 w-28 text-right text-xs"
                  />
                </div>

                <Separator />

                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-bold text-foreground">Total Due</span>
                  <span className="text-xl font-bold text-primary tabular">{money(finalTotal)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Cash", "Card", "Bank transfer"] as PayMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`rounded-lg border py-2 text-center text-xs font-medium transition-colors cursor-pointer ${
                        payMethod === m
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {payMethod === "Cash" && (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-medium">Cash Tendered</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      className="h-8 w-32 text-right text-xs font-semibold"
                    />
                  </div>

                  {typeof cashTendered === "number" && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t">
                      <span className="text-muted-foreground">Change Due:</span>
                      <span className="font-bold text-primary text-sm tabular">
                        {money(changeDue)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="button"
                onClick={handleConfirmDispense}
                disabled={cart.length === 0}
                className="w-full text-sm py-5 font-semibold cursor-pointer"
              >
                <CheckCircle2 className="mr-2 size-4" /> Confirm & Dispense
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      {/* Printable Dispensing Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="size-5 text-primary" />
              Prescription Dispensed Successfully
            </DialogTitle>
            <DialogDescription className="text-xs">
              Medication stock has been deducted using FEFO. Official dispensary receipt generated.
            </DialogDescription>
          </DialogHeader>

          {confirmedDispense && (
            <div className="rounded-lg border bg-muted/20 p-4 text-xs font-mono space-y-3">
              <div className="text-center border-b pb-2">
                <div className="font-bold text-sm">OLYMPUS LANKA HOSPITAL</div>
                <div className="text-[11px] text-muted-foreground">Hospital Road, Thissamaharama</div>
                <div className="text-[11px] text-muted-foreground">Pharmacy Dispensary Counter</div>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                <div>Dispense No: <span className="font-semibold text-foreground">{confirmedDispense.no}</span></div>
                <div>Date: {confirmedDispense.date.slice(0, 10)}</div>
                <div>Patient: <span className="text-foreground">{confirmedDispense.patientName}</span></div>
                <div>Method: {confirmedDispense.payMethod}</div>
              </div>

              <Separator />

              <div className="space-y-1.5 text-[11px]">
                {confirmedDispense.items.map((it, idx) => (
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
                  <span>{money(confirmedDispense.subtotal)}</span>
                </div>
                {confirmedDispense.discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount:</span>
                    <span>-{money(confirmedDispense.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t">
                  <span>Total Paid:</span>
                  <span className="text-primary">{money(confirmedDispense.total)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-muted-foreground pt-2 border-t">
                Dispensed by {confirmedDispense.by} · Thank you
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.print();
              }}
              className="text-xs"
            >
              <Printer className="mr-1.5 size-3.5" /> Print Receipt
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setReceiptOpen(false);
                handleReset();
                navigate({ to: "/pharmacy" });
              }}
              className="text-xs"
            >
              Done & Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


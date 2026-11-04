"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  Plus,
  Pencil,
  PowerOff,
  Power,
  Boxes,
  Pill,
  AlertTriangle,
  SlidersHorizontal,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, TableWrap, NativeSelect, Field } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { mutate, useCurrentUser, useDB } from "@/lib/hms/store";
import { money } from "@/lib/hms/logic";
import {
  getMedicineStock,
  getMedicineBatches,
  getBatchExpiryStatus,
  getStockStatus,
} from "@/lib/hms/pharmacyLogic";
import type { DosageForm, Medicine, MedicineBatch } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/pharmacy/inventory")({
  head: () => ({
    meta: [
      { title: "Medications Master — Hospital Management System" },
      { name: "description", content: "Pharmaceutical formulary catalog, pricing margins, and stock thresholds." },
    ],
  }),
  component: () => (
    <Guard perm="pharmacy.inventory" what="pharmacy inventory and formulary">
      <MedicationsMasterPage />
    </Guard>
  ),
});

const DOSAGE_FORMS: DosageForm[] = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Suspension",
  "Injection",
  "Ointment",
  "Cream",
  "Drops",
  "Inhaler",
  "Infusion",
  "Other",
];

const CATEGORIES = [
  "Antibiotics",
  "Analgesics & Pain",
  "Antihypertensives",
  "Antidiabetics",
  "Antihistamines",
  "Gastrointestinal",
  "Cardiovascular",
  "Respiratory",
  "Other",
];

const schema = z.object({
  code: z.string().trim().min(2, "Code required").max(20),
  name: z.string().trim().min(2, "Brand/Trade name required"),
  genericName: z.string().trim().min(2, "Generic scientific name required"),
  category: z.string().min(1, "Select category"),
  dosageForm: z.enum([
    "Tablet",
    "Capsule",
    "Syrup",
    "Suspension",
    "Injection",
    "Ointment",
    "Cream",
    "Drops",
    "Inhaler",
    "Infusion",
    "Other",
  ]),
  strength: z.string().trim().min(1, "Strength required (e.g. 500 mg)"),
  unit: z.string().trim().min(1, "Dispensing unit required (e.g. Tablet, Bottle)"),
  unitPrice: z.coerce.number().positive("Selling price must be positive"),
  unitCost: z.coerce.number().positive("Purchase cost must be positive"),
  reorderLevel: z.coerce.number().int().nonnegative("Reorder level cannot be negative"),
  requiresPrescription: z.boolean(),
  rackLocation: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

type Form = z.infer<typeof schema>;

function MedicationsMasterPage() {
  const db = useDB();
  const user = useCurrentUser();

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStockStatus, setFilterStockStatus] = useState("");
  const [filterRx, setFilterRx] = useState("");
  const [filterActive, setFilterActive] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [viewingBatchesMed, setViewingBatchesMed] = useState<Medicine | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      name: "",
      genericName: "",
      category: CATEGORIES[0],
      dosageForm: "Tablet",
      strength: "",
      unit: "Tablet",
      unitPrice: 0,
      unitCost: 0,
      reorderLevel: 50,
      requiresPrescription: true,
      rackLocation: "",
      manufacturer: "",
      description: "",
    },
  });

  const reqRxVal = watch("requiresPrescription");

  const openAdd = () => {
    setEditingMed(null);
    reset({
      code: `MED-${String((db.counters["medicine"] ?? db.medicines.length) + 1).padStart(4, "0")}`,
      name: "",
      genericName: "",
      category: CATEGORIES[0],
      dosageForm: "Tablet",
      strength: "500 mg",
      unit: "Tablet",
      unitPrice: 20,
      unitCost: 12,
      reorderLevel: 50,
      requiresPrescription: true,
      rackLocation: "A-01",
      manufacturer: "",
      description: "",
    });
    setModalOpen(true);
  };

  const openEdit = (med: Medicine) => {
    setEditingMed(med);
    reset({
      code: med.code,
      name: med.name,
      genericName: med.genericName,
      category: med.category,
      dosageForm: med.dosageForm,
      strength: med.strength,
      unit: med.unit,
      unitPrice: med.unitPrice,
      unitCost: med.unitCost,
      reorderLevel: med.reorderLevel,
      requiresPrescription: med.requiresPrescription,
      rackLocation: med.rackLocation ?? "",
      manufacturer: med.manufacturer ?? "",
      description: med.description ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = (v: Form) => {
    const dup = db.medicines.find(
      (m) => m.code.toUpperCase() === v.code.toUpperCase() && m.id !== editingMed?.id
    );
    if (dup) {
      toast.error(`Medication Code "${v.code}" is already in use.`);
      return;
    }

    mutate((d) => {
      const nowIso = new Date().toISOString();
      const byName = user?.name ?? "Admin";

      if (editingMed) {
        const item = d.medicines.find((x) => x.id === editingMed.id);
        if (item) {
          Object.assign(item, {
            code: v.code.toUpperCase(),
            name: v.name,
            genericName: v.genericName,
            category: v.category,
            dosageForm: v.dosageForm,
            strength: v.strength,
            unit: v.unit,
            unitPrice: v.unitPrice,
            unitCost: v.unitCost,
            reorderLevel: v.reorderLevel,
            requiresPrescription: v.requiresPrescription,
            rackLocation: v.rackLocation || undefined,
            manufacturer: v.manufacturer || undefined,
            description: v.description || undefined,
          });

          d.auditLog.unshift({
            id: `audit${Date.now()}`,
            ts: nowIso,
            userId: d.auth.userId ?? "u8",
            userName: byName,
            action: "update",
            entity: "medicine",
            entityId: item.id,
            detail: `Updated medicine "${item.name}" (${item.code}).`,
          });
        }
      } else {
        const id = `med${Date.now()}`;
        d.counters["medicine"] = (d.counters["medicine"] ?? d.medicines.length) + 1;
        const newMed: Medicine = {
          id,
          code: v.code.toUpperCase(),
          name: v.name,
          genericName: v.genericName,
          category: v.category,
          dosageForm: v.dosageForm,
          strength: v.strength,
          unit: v.unit,
          unitPrice: v.unitPrice,
          unitCost: v.unitCost,
          reorderLevel: v.reorderLevel,
          requiresPrescription: v.requiresPrescription,
          active: true,
          rackLocation: v.rackLocation || undefined,
          manufacturer: v.manufacturer || undefined,
          description: v.description || undefined,
        };
        d.medicines.push(newMed);

        d.auditLog.unshift({
          id: `audit${Date.now()}`,
          ts: nowIso,
          userId: d.auth.userId ?? "u8",
          userName: byName,
          action: "create",
          entity: "medicine",
          entityId: id,
          detail: `Created new medication "${newMed.name}" (${newMed.code}).`,
        });
      }
    });

    toast.success(editingMed ? "Medication updated." : "New medication created.");
    setModalOpen(false);
  };

  const toggleActive = (med: Medicine) => {
    mutate((d) => {
      const item = d.medicines.find((x) => x.id === med.id);
      if (item) {
        item.active = !item.active;
        d.auditLog.unshift({
          id: `audit${Date.now()}`,
          ts: new Date().toISOString(),
          userId: d.auth.userId ?? "u8",
          userName: user?.name ?? "Admin",
          action: item.active ? "activate" : "deactivate",
          entity: "medicine",
          entityId: item.id,
          detail: `${item.active ? "Activated" : "Deactivated"} medication ${item.name}`,
        });
      }
    });
    toast.info(`${med.name} is now ${med.active ? "inactive" : "active"}.`);
  };

  const filteredMedicines = useMemo(() => {
    return db.medicines.filter((m) => {
      const q = search.toLowerCase().trim();
      const matchQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.rackLocation && m.rackLocation.toLowerCase().includes(q));

      const matchCat = !filterCat || m.category === filterCat;
      const matchRx = !filterRx || (filterRx === "rx" ? m.requiresPrescription : !m.requiresPrescription);
      const matchActive = !filterActive || (filterActive === "active" ? m.active : !m.active);

      if (!matchQ || !matchCat || !matchRx || !matchActive) return false;

      if (filterStockStatus) {
        const stock = getMedicineStock(db, m.id);
        const status = getStockStatus(m, stock);
        if (status.status !== filterStockStatus) return false;
      }

      return true;
    });
  }, [db, search, filterCat, filterStockStatus, filterRx, filterActive]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Medications Master Catalog"
        description="Comprehensive pharmaceutical formulary with generic mappings, pricing, reorder points, and storage racks."
        actions={
          <Button onClick={openAdd}>
            <Plus className="mr-1.5 size-4" /> Add Medication
          </Button>
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by trade name, generic, code, category, rack..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <NativeSelect
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="w-44"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </NativeSelect>

        <NativeSelect
          value={filterStockStatus}
          onChange={(e) => setFilterStockStatus(e.target.value)}
          className="w-40"
        >
          <option value="">All Stock Levels</option>
          <option value="In Stock">In Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
        </NativeSelect>

        <NativeSelect
          value={filterRx}
          onChange={(e) => setFilterRx(e.target.value)}
          className="w-32"
        >
          <option value="">Rx / OTC</option>
          <option value="rx">Rx Only</option>
          <option value="otc">OTC Counter</option>
        </NativeSelect>

        <NativeSelect
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="w-32"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </NativeSelect>
      </div>

      {/* Master Table */}
      <TableWrap>
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="py-3 px-4 font-medium">Code</th>
              <th className="py-3 px-4 font-medium">Medication & Strength</th>
              <th className="py-3 px-4 font-medium">Generic Name</th>
              <th className="py-3 px-4 font-medium">Category</th>
              <th className="py-3 px-4 font-medium text-center">Form</th>
              <th className="py-3 px-4 font-medium text-center">Available Stock</th>
              <th className="py-3 px-4 font-medium text-right">Cost</th>
              <th className="py-3 px-4 font-medium text-right">Price</th>
              <th className="py-3 px-4 font-medium text-center">Rack</th>
              <th className="py-3 px-4 font-medium text-center">Class</th>
              <th className="py-3 px-4 font-medium text-center">Status</th>
              <th className="py-3 px-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredMedicines.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-muted-foreground">
                  No medications found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredMedicines.map((med) => {
                const stock = getMedicineStock(db, med.id);
                const stockStatus = getStockStatus(med, stock);
                const margin = med.unitPrice > 0 ? Math.round(((med.unitPrice - med.unitCost) / med.unitPrice) * 100) : 0;

                return (
                  <tr key={med.id} className={`hover:bg-muted/20 transition-colors ${!med.active ? "opacity-60 bg-muted/10" : ""}`}>
                    <td className="py-3 px-4 font-mono font-semibold text-primary">{med.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{med.name}</div>
                      <div className="text-[11px] text-muted-foreground">{med.strength}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground italic">{med.genericName}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{med.category}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {med.dosageForm}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-bold tabular text-foreground">
                          {stock} <span className="text-[10px] font-normal text-muted-foreground">{med.unit}</span>
                        </span>
                        <StatusBadge status={stockStatus.status} tone={stockStatus.tone} />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right tabular text-muted-foreground">{money(med.unitCost)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-semibold tabular text-foreground">{money(med.unitPrice)}</div>
                      <div className="text-[10px] text-primary font-medium">+{margin}%</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] font-medium text-muted-foreground">
                      {med.rackLocation ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          med.requiresPrescription
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {med.requiresPrescription ? "Rx Only" : "OTC"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={med.active ? "Active" : "Inactive"} tone={med.active ? "blue" : "gray"} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingBatchesMed(med)}
                          className="h-7 px-2 text-xs"
                          title="View active batches"
                        >
                          <Boxes className="size-3.5 mr-1" /> Batches
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(med)}
                          className="h-7 px-2 text-xs"
                          title="Edit details"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(med)}
                          className={`h-7 px-1.5 text-xs ${med.active ? "text-muted-foreground hover:text-destructive" : "text-primary hover:text-primary/80"}`}
                          title={med.active ? "Deactivate" : "Activate"}
                        >
                          {med.active ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* Batches Slideover Sheet */}
      <Sheet open={Boolean(viewingBatchesMed)} onOpenChange={(open) => !open && setViewingBatchesMed(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {viewingBatchesMed && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-base font-bold text-foreground">
                  Batches for {viewingBatchesMed.name}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {viewingBatchesMed.genericName} · Reorder Threshold: {viewingBatchesMed.reorderLevel} {viewingBatchesMed.unit}
                </SheetDescription>
              </SheetHeader>

              {(() => {
                const batches = getMedicineBatches(db, viewingBatchesMed.id);
                if (batches.length === 0) {
                  return (
                    <div className="p-8 text-center text-muted-foreground text-xs">
                      No batch records found for this medication.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {batches.map((b) => {
                      const exp = getBatchExpiryStatus(b.expiryDate, b.quantity);
                      const sup = db.suppliers.find((s) => s.id === b.supplierId);

                      return (
                        <div key={b.id} className="rounded-lg border p-3 bg-card space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-foreground">{b.batchNo}</span>
                            <StatusBadge status={exp.label} tone={exp.tone} />
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                            <div>Stock: <span className="font-semibold text-foreground">{b.quantity} {viewingBatchesMed.unit}</span></div>
                            <div>Initial Qty: <span>{b.initialQuantity}</span></div>
                            <div>Expiry: <span className="font-medium text-foreground">{b.expiryDate}</span></div>
                            <div>Received: <span>{b.receivedDate}</span></div>
                          </div>
                          {sup && (
                            <div className="text-[11px] text-muted-foreground border-t pt-1">
                              Supplier: <span className="text-foreground">{sup.name}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add / Edit Medication Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingMed ? `Edit ${editingMed.name}` : "Add New Medication"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Formulary configuration, generic mappings, inventory thresholds, and pricing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Medication Code" required error={errors.code?.message}>
                <Input placeholder="e.g. MED-0029" {...register("code")} />
              </Field>

              <Field label="Brand / Trade Name" required error={errors.name?.message}>
                <Input placeholder="e.g. Augmentin 625mg" {...register("name")} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Generic Scientific Name" required error={errors.genericName?.message}>
                <Input placeholder="e.g. Co-amoxiclav" {...register("genericName")} />
              </Field>

              <Field label="Category" required error={errors.category?.message}>
                <select
                  {...register("category")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-2xs"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Dosage Form" required error={errors.dosageForm?.message}>
                <select
                  {...register("dosageForm")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-2xs"
                >
                  {DOSAGE_FORMS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </Field>

              <Field label="Strength" required error={errors.strength?.message}>
                <Input placeholder="e.g. 500 mg, 120mg/5ml" {...register("strength")} />
              </Field>

              <Field label="Dispensing Unit" required error={errors.unit?.message}>
                <Input placeholder="e.g. Tablet, Bottle, Vial" {...register("unit")} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Purchase Cost (LKR)" required error={errors.unitCost?.message}>
                <Input type="number" step="0.01" {...register("unitCost")} />
              </Field>

              <Field label="Selling Price (LKR)" required error={errors.unitPrice?.message}>
                <Input type="number" step="0.01" {...register("unitPrice")} />
              </Field>

              <Field label="Reorder Threshold" required error={errors.reorderLevel?.message}>
                <Input type="number" min="0" {...register("reorderLevel")} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Rack / Shelf Location" error={errors.rackLocation?.message}>
                <Input placeholder="e.g. Rack A-02, Fridge-1" {...register("rackLocation")} />
              </Field>

              <Field label="Manufacturer / Brand">
                <Input placeholder="e.g. GlaxoSmithKline, SPC" {...register("manufacturer")} />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Requires Prescription (Rx Only)</Label>
                <p className="text-[11px] text-muted-foreground">
                  If enabled, this medication requires authorization by a licensed doctor.
                </p>
              </div>
              <Switch
                checked={reqRxVal}
                onCheckedChange={(val) => setValue("requiresPrescription", val)}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingMed ? "Save Changes" : "Create Medication"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Truck,
  Plus,
  PackageCheck,
  CheckCircle2,
  Trash2,
  Boxes,
  Pencil,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, TableWrap, Field } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { mutate, useCurrentUser, useDB } from "@/lib/hms/store";
import { money } from "@/lib/hms/logic";
import type { MedicineBatch, PurchaseOrder, PurchaseOrderItem, Supplier } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/pharmacy/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers & Purchase Orders — Hospital Management System" },
      { name: "description", content: "Pharmaceutical procurement, supplier directory, and goods receiving (GRN)." },
    ],
  }),
  component: () => (
    <Guard perm="pharmacy.manage" what="supplier and procurement management">
      <SuppliersProcurementPage />
    </Guard>
  ),
});

// Zod schemas
const supplierSchema = z.object({
  code: z.string().trim().min(2, "Code required"),
  name: z.string().trim().min(2, "Supplier name required"),
  contactPerson: z.string().trim().min(2, "Contact person required"),
  phone: z.string().trim().min(5, "Valid phone number required"),
  email: z.string().trim().email("Valid email required"),
  address: z.string().trim().min(3, "Address required"),
});
type SupplierForm = z.infer<typeof supplierSchema>;

const poItemSchema = z.object({
  medicineId: z.string().min(1, "Select medicine"),
  qtyOrdered: z.coerce.number().int().positive("Qty must be positive"),
  unitCost: z.coerce.number().positive("Unit cost must be positive"),
});

const poSchema = z.object({
  supplierId: z.string().min(1, "Select supplier"),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(poItemSchema).min(1, "At least one item required"),
});
type POForm = z.infer<typeof poSchema>;

function SuppliersProcurementPage() {
  const db = useDB();
  const user = useCurrentUser();

  const [activeTab, setActiveTab] = useState<"pos" | "suppliers">("pos");
  const [newPoOpen, setNewPoOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Receiving GRN state
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [grnDeliveries, setGrnDeliveries] = useState<
    {
      medicineId: string;
      medicineName: string;
      qtyReceived: number;
      batchNo: string;
      expiryDate: string;
      unitCost: number;
    }[]
  >([]);

  // Supplier Form
  const {
    register: regSup,
    handleSubmit: handleSubSup,
    reset: resetSup,
    formState: { errors: errorsSup },
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
  });

  // PO Form
  const {
    register: regPo,
    handleSubmit: handleSubPo,
    control: controlPo,
    reset: resetPo,
    watch: watchPo,
    formState: { errors: errorsPo },
  } = useForm<POForm>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      supplierId: "",
      expectedDate: "",
      notes: "",
      items: [{ medicineId: "", qtyOrdered: 100, unitCost: 10 }],
    },
  });

  const { fields: poFields, append: appendPoItem, remove: removePoItem } = useFieldArray({
    control: controlPo,
    name: "items",
  });

  const openNewPo = () => {
    resetPo({
      supplierId: db.suppliers[0]?.id ?? "",
      expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      notes: "Stock replenishment shipment",
      items: [{ medicineId: db.medicines[0]?.id ?? "", qtyOrdered: 200, unitCost: db.medicines[0]?.unitCost ?? 10 }],
    });
    setNewPoOpen(true);
  };

  const onSubmitPo = (data: POForm) => {
    let total = 0;
    const items: PurchaseOrderItem[] = data.items.map((it) => {
      const med = db.medicines.find((m) => m.id === it.medicineId);
      const subtotal = it.qtyOrdered * it.unitCost;
      total += subtotal;
      return {
        medicineId: it.medicineId,
        medicineName: med?.name ?? "Medication",
        qtyOrdered: it.qtyOrdered,
        unitCost: it.unitCost,
        subtotal,
      };
    });

    mutate((d) => {
      const nextNo = `PO-${String((d.counters["purchaseOrder"] = (d.counters["purchaseOrder"] ?? 0) + 1)).padStart(4, "0")}`;
      const id = `po${Date.now()}`;
      const todayStr = new Date().toISOString().slice(0, 10);

      const newPo: PurchaseOrder = {
        id,
        no: nextNo,
        supplierId: data.supplierId,
        orderDate: todayStr,
        expectedDate: data.expectedDate,
        status: "Ordered",
        items,
        totalAmount: total,
        notes: data.notes,
        by: user?.name ?? "Pharmacist",
      };

      d.purchaseOrders.unshift(newPo);

      d.auditLog.unshift({
        id: `audit${Date.now()}`,
        ts: new Date().toISOString(),
        userId: d.auth.userId ?? "u8",
        userName: user?.name ?? "Pharmacist",
        action: "create",
        entity: "purchaseOrder",
        entityId: id,
        detail: `Purchase Order ${nextNo} issued. Total: ${money(total)}`,
      });
    });

    toast.success("Purchase order created and sent to supplier.");
    setNewPoOpen(false);
  };

  const openReceiveGrn = (po: PurchaseOrder) => {
    setReceivingPo(po);
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 2);

    const initDeliveries = po.items.map((it, idx) => ({
      medicineId: it.medicineId,
      medicineName: it.medicineName,
      qtyReceived: it.qtyOrdered,
      batchNo: `BAT-${today.getFullYear()}-${String(120 + idx * 5).padStart(3, "0")}`,
      expiryDate: nextYear.toISOString().slice(0, 10),
      unitCost: it.unitCost,
    }));

    setGrnDeliveries(initDeliveries);
  };

  const handleConfirmGrn = () => {
    if (!receivingPo) return;

    mutate((d) => {
      const po = d.purchaseOrders.find((p) => p.id === receivingPo.id);
      const todayStr = new Date().toISOString().slice(0, 10);
      const nowIso = new Date().toISOString();

      if (po) {
        po.status = "Received";
        po.receivedDate = todayStr;

        // Create new batches and update inventory
        for (const del of grnDeliveries) {
          const med = d.medicines.find((m) => m.id === del.medicineId);
          const batchId = `bat${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

          const newBatch: MedicineBatch = {
            id: batchId,
            medicineId: del.medicineId,
            batchNo: del.batchNo.trim().toUpperCase(),
            expiryDate: del.expiryDate,
            quantity: del.qtyReceived,
            initialQuantity: del.qtyReceived,
            unitCost: del.unitCost,
            unitPrice: med?.unitPrice ?? del.unitCost * 1.5,
            supplierId: po.supplierId,
            receivedDate: todayStr,
          };

          d.batches.push(newBatch);
        }

        d.auditLog.unshift({
          id: `audit${Date.now()}`,
          ts: nowIso,
          userId: d.auth.userId ?? "u8",
          userName: user?.name ?? "Pharmacist",
          action: "update",
          entity: "purchaseOrder",
          entityId: po.id,
          detail: `Goods Received Note (GRN) confirmed for PO ${po.no}. Created ${grnDeliveries.length} new inventory batches.`,
        });
      }
    });

    toast.success(`PO ${receivingPo.no} marked as Received. Stock batches added to inventory.`);
    setReceivingPo(null);
  };

  // Supplier CRUD
  const openAddSupplier = () => {
    setEditingSupplier(null);
    resetSup({
      code: `SUP-${String(db.suppliers.length + 1).padStart(4, "0")}`,
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
    });
    setSupplierModalOpen(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    resetSup({
      code: s.code,
      name: s.name,
      contactPerson: s.contactPerson,
      phone: s.phone,
      email: s.email,
      address: s.address,
    });
    setSupplierModalOpen(true);
  };

  const onSubmitSupplier = (data: SupplierForm) => {
    mutate((d) => {
      const nowIso = new Date().toISOString();
      if (editingSupplier) {
        const item = d.suppliers.find((x) => x.id === editingSupplier.id);
        if (item) {
          Object.assign(item, data);
        }
      } else {
        const id = `sup${Date.now()}`;
        d.suppliers.push({
          id,
          ...data,
          active: true,
        });
      }
    });

    toast.success(editingSupplier ? "Supplier updated." : "New supplier added.");
    setSupplierModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Procurement & Supplier Directory"
        description="Issue purchase orders, track inbound shipments, and receive Goods Received Notes (GRN) into batch inventory."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={openNewPo}>
              <Plus className="mr-1.5 size-4" /> Create Purchase Order
            </Button>
            <Button variant="outline" onClick={openAddSupplier}>
              <Plus className="mr-1.5 size-4" /> Add Supplier
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="pos" className="text-xs">
            Purchase Orders & GRN ({db.purchaseOrders.length})
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs">
            Supplier Directory ({db.suppliers.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Purchase Orders */}
        <TabsContent value="pos" className="mt-4 space-y-4">
          <TableWrap>
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-medium">PO Number</th>
                  <th className="py-3 px-4 font-medium">Supplier</th>
                  <th className="py-3 px-4 font-medium">Order Date</th>
                  <th className="py-3 px-4 font-medium">Expected Date</th>
                  <th className="py-3 px-4 font-medium">Ordered Items</th>
                  <th className="py-3 px-4 font-medium text-right">Total Amount</th>
                  <th className="py-3 px-4 font-medium text-center">Status</th>
                  <th className="py-3 px-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {db.purchaseOrders.map((po) => {
                  const sup = db.suppliers.find((s) => s.id === po.supplierId);
                  const isOrdered = po.status === "Ordered";

                  return (
                    <tr key={po.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{po.no}</td>
                      <td className="py-3 px-4 font-semibold text-foreground">{sup?.name ?? "Unknown Supplier"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{po.orderDate}</td>
                      <td className="py-3 px-4 text-muted-foreground">{po.expectedDate ?? "—"}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{po.items.length} items</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                          {po.items.map((i) => i.medicineName).join(", ")}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular text-foreground">
                        {money(po.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge
                          status={po.status}
                          tone={po.status === "Received" ? "blue" : po.status === "Ordered" ? "amber" : "gray"}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isOrdered && (
                          <Button
                            size="sm"
                            onClick={() => openReceiveGrn(po)}
                            className="h-7 text-xs font-semibold"
                          >
                            <PackageCheck className="mr-1.5 size-3.5" /> Receive GRN
                          </Button>
                        )}
                        {po.status === "Received" && (
                          <span className="text-[11px] text-muted-foreground">Received on {po.receivedDate}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </TabsContent>

        {/* Tab 2: Supplier Directory */}
        <TabsContent value="suppliers" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {db.suppliers.map((sup) => (
              <div key={sup.id} className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-primary font-semibold">{sup.code}</span>
                    <h4 className="text-sm font-bold text-foreground mt-0.5">{sup.name}</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditSupplier(sup)}
                    className="h-7 px-2 text-xs"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Truck className="size-3.5 text-muted-foreground shrink-0" />
                    <span>Contact: <strong className="text-foreground">{sup.contactPerson}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-muted-foreground shrink-0" />
                    <span>{sup.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{sup.email}</span>
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-relaxed line-clamp-2">{sup.address}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Receive GRN Dialog */}
      <Dialog open={Boolean(receivingPo)} onOpenChange={(open) => !open && setReceivingPo(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <PackageCheck className="size-5 text-primary" />
              Goods Received Note (GRN) — PO {receivingPo?.no}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verify incoming shipment quantities and record batch numbers & expiry dates into inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="space-y-3">
              {grnDeliveries.map((del, idx) => (
                <div key={idx} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <div className="font-semibold text-foreground text-sm flex justify-between">
                    <span>{del.medicineName}</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Cost: {money(del.unitCost)} / unit
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Field label="Qty Received" required>
                      <Input
                        type="number"
                        min="1"
                        value={del.qtyReceived}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setGrnDeliveries((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, qtyReceived: val } : item))
                          );
                        }}
                      />
                    </Field>

                    <Field label="Batch Number" required>
                      <Input
                        placeholder="e.g. BAT-2026-081"
                        value={del.batchNo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGrnDeliveries((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, batchNo: val } : item))
                          );
                        }}
                      />
                    </Field>

                    <Field label="Expiry Date" required>
                      <Input
                        type="date"
                        value={del.expiryDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGrnDeliveries((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, expiryDate: val } : item))
                          );
                        }}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setReceivingPo(null)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmGrn}>
                Confirm Goods Received & Add Batches
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Purchase Order Dialog */}
      <Dialog open={newPoOpen} onOpenChange={setNewPoOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Create Purchase Order (PO)</DialogTitle>
            <DialogDescription className="text-xs">
              Order bulk pharmaceuticals from accredited distributors.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubPo(onSubmitPo)} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Supplier" required error={errorsPo.supplierId?.message}>
                <select
                  {...regPo("supplierId")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-2xs"
                >
                  {db.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Expected Delivery Date">
                <Input type="date" {...regPo("expectedDate")} />
              </Field>
            </div>

            <Field label="Order Notes / Delivery Instructions">
              <Input placeholder="e.g. Standard delivery to central store" {...regPo("notes")} />
            </Field>

            {/* Line items */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                  Order Line Items
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendPoItem({
                      medicineId: db.medicines[0]?.id ?? "",
                      qtyOrdered: 100,
                      unitCost: db.medicines[0]?.unitCost ?? 10,
                    })
                  }
                  className="h-7 text-xs"
                >
                  <Plus className="size-3.5 mr-1" /> Add Medicine
                </Button>
              </div>

              <div className="space-y-2">
                {poFields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end rounded-lg border bg-muted/20 p-2.5">
                    <div className="col-span-6">
                      <Label className="text-[11px] mb-1 block">Medication</Label>
                      <select
                        {...regPo(`items.${idx}.medicineId` as const)}
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-2xs"
                      >
                        {db.medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.strength})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <Label className="text-[11px] mb-1 block">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        {...regPo(`items.${idx}.qtyOrdered` as const)}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-[11px] mb-1 block">Cost (LKR)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...regPo(`items.${idx}.unitCost` as const)}
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      {poFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePoItem(idx)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setNewPoOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit Purchase Order</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Modal */}
      <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingSupplier ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Distributor contact coordinates and profile.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubSup(onSubmitSupplier)} className="space-y-3 text-xs">
            <Field label="Supplier Code" required error={errorsSup.code?.message}>
              <Input {...regSup("code")} />
            </Field>

            <Field label="Company / Distributor Name" required error={errorsSup.name?.message}>
              <Input placeholder="e.g. State Pharmaceuticals Corp" {...regSup("name")} />
            </Field>

            <Field label="Contact Person" required error={errorsSup.contactPerson?.message}>
              <Input placeholder="e.g. Mr. Nimal Jayawardena" {...regSup("contactPerson")} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" required error={errorsSup.phone?.message}>
                <Input placeholder="0112345678" {...regSup("phone")} />
              </Field>

              <Field label="Email" required error={errorsSup.email?.message}>
                <Input placeholder="orders@distributor.lk" {...regSup("email")} />
              </Field>
            </div>

            <Field label="Physical Address" required error={errorsSup.address?.message}>
              <Textarea placeholder="Address..." {...regSup("address")} className="h-16 text-xs" />
            </Field>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSupplierModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Supplier</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

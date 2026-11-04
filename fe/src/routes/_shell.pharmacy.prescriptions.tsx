"use client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  Plus,
  Trash2,
  ClipboardList,
  Eye,
  CheckCircle2,
  XCircle,
  Pill,
  User,
  Calendar,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, TableWrap, NativeSelect, Field } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { mutate, useCurrentUser, useDB } from "@/lib/hms/store";
import { money } from "@/lib/hms/logic";
import type { Prescription, PrescriptionItem, PrescriptionStatus } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/pharmacy/prescriptions")({
  head: () => ({
    meta: [
      { title: "Prescriptions — Hospital Management System" },
      { name: "description", content: "Master directory of outpatient and clinical prescriptions." },
    ],
  }),
  component: () => (
    <Guard perm="pharmacy.access" what="prescription management">
      <PrescriptionsPage />
    </Guard>
  ),
});

const itemSchema = z.object({
  medicineId: z.string().min(1, "Select medicine"),
  dosage: z.string().trim().min(1, "Dosage instruction required"),
  duration: z.string().trim().min(1, "Duration required"),
  quantity: z.coerce.number().int().positive("Qty must be positive"),
  instructions: z.string().optional(),
});

const newRxSchema = z.object({
  patientId: z.string().min(1, "Select patient"),
  doctorId: z.string().optional(),
  doctorName: z.string().optional(),
  diagnosis: z.string().trim().min(2, "Diagnosis required"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one medication is required"),
});

type NewRxForm = z.infer<typeof newRxSchema>;

function PrescriptionsPage() {
  const db = useDB();
  const user = useCurrentUser();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [viewingRx, setViewingRx] = useState<Prescription | null>(null);
  const [newRxOpen, setNewRxOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<NewRxForm>({
    resolver: zodResolver(newRxSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      doctorName: "",
      diagnosis: "",
      notes: "",
      items: [{ medicineId: "", dosage: "1 Tab TDS", duration: "5 days", quantity: 15, instructions: "After meals" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const filtered = db.prescriptions.filter((rx) => {
    const pat = db.patients.find((p) => p.id === rx.patientId);
    const q = search.toLowerCase().trim();
    if (
      q &&
      !rx.no.toLowerCase().includes(q) &&
      !pat?.name.toLowerCase().includes(q) &&
      !pat?.code.toLowerCase().includes(q) &&
      !(rx.doctorName && rx.doctorName.toLowerCase().includes(q)) &&
      !(rx.diagnosis && rx.diagnosis.toLowerCase().includes(q))
    ) {
      return false;
    }
    if (filterStatus && rx.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const openNewRxModal = () => {
    reset({
      patientId: db.patients[0]?.id ?? "",
      doctorId: db.doctors[0]?.id ?? "",
      doctorName: db.doctors[0]?.name ?? "",
      diagnosis: "",
      notes: "",
      items: [
        {
          medicineId: db.medicines[0]?.id ?? "",
          dosage: "1 Tab TDS (3 times daily)",
          duration: "5 days",
          quantity: 15,
          instructions: "Take after meals",
        },
      ],
    });
    setNewRxOpen(true);
  };

  const onSubmitNewRx = (data: NewRxForm) => {
    const doc = db.doctors.find((d) => d.id === data.doctorId);
    const docName = doc ? doc.name : data.doctorName || "OPD Consultant";

    const rxItems: PrescriptionItem[] = data.items.map((it) => {
      const med = db.medicines.find((m) => m.id === it.medicineId);
      return {
        medicineId: it.medicineId,
        medicineName: med?.name ?? "Medication",
        dosage: it.dosage,
        duration: it.duration,
        quantity: it.quantity,
        unitPrice: med?.unitPrice ?? 0,
        instructions: it.instructions,
      };
    });

    mutate((d) => {
      const nextNo = `RX-${String((d.counters["prescription"] = (d.counters["prescription"] ?? 0) + 1)).padStart(5, "0")}`;
      const id = `rx${Date.now()}`;
      const todayStr = new Date().toISOString().slice(0, 10);

      const newRx: Prescription = {
        id,
        no: nextNo,
        patientId: data.patientId,
        doctorId: data.doctorId,
        doctorName: docName,
        date: todayStr,
        diagnosis: data.diagnosis,
        notes: data.notes,
        status: "Pending",
        items: rxItems,
      };

      d.prescriptions.unshift(newRx);

      d.auditLog.unshift({
        id: `audit${Date.now()}`,
        ts: new Date().toISOString(),
        userId: d.auth.userId ?? "u8",
        userName: user?.name ?? "Admin",
        action: "create",
        entity: "prescription",
        entityId: id,
        detail: `Prescription ${nextNo} created for patient ID ${data.patientId}.`,
      });
    });

    toast.success("New prescription created and queued for dispensing.");
    setNewRxOpen(false);
  };

  const handleCancelRx = (rx: Prescription) => {
    if (!confirm(`Are you sure you want to cancel prescription ${rx.no}?`)) return;

    mutate((d) => {
      const item = d.prescriptions.find((p) => p.id === rx.id);
      if (item) {
        item.status = "Cancelled";
        d.auditLog.unshift({
          id: `audit${Date.now()}`,
          ts: new Date().toISOString(),
          userId: d.auth.userId ?? "u8",
          userName: user?.name ?? "Admin",
          action: "update",
          entity: "prescription",
          entityId: rx.id,
          detail: `Prescription ${rx.no} was cancelled.`,
        });
      }
    });

    toast.info(`Prescription ${rx.no} marked as cancelled.`);
    setViewingRx(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Prescriptions Directory"
        description="Search, view, and track clinical prescriptions queued for pharmacy dispensing."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={openNewRxModal}>
              <Plus className="mr-1.5 size-4" /> New Prescription
            </Button>
            <Button variant="outline" asChild>
              <Link to="/pharmacy/dispense" search={{ rxId: undefined }}>
                <CreditCard className="mr-1.5 size-4" /> Go to Dispenser
              </Link>
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by Rx number, patient name, doctor, diagnosis…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <NativeSelect
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-48"
        >
          <option value="">All Statuses ({db.prescriptions.length})</option>
          <option value="Pending">Pending ({db.prescriptions.filter((p) => p.status === "Pending").length})</option>
          <option value="Dispensed">Dispensed ({db.prescriptions.filter((p) => p.status === "Dispensed").length})</option>
          <option value="Cancelled">Cancelled ({db.prescriptions.filter((p) => p.status === "Cancelled").length})</option>
        </NativeSelect>
      </div>

      {/* Table */}
      <TableWrap>
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="py-3 px-4 font-medium">Rx Number</th>
              <th className="py-3 px-4 font-medium">Date</th>
              <th className="py-3 px-4 font-medium">Patient</th>
              <th className="py-3 px-4 font-medium">Prescribing Doctor</th>
              <th className="py-3 px-4 font-medium">Diagnosis</th>
              <th className="py-3 px-4 font-medium">Medications</th>
              <th className="py-3 px-4 font-medium text-center">Status</th>
              <th className="py-3 px-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  No prescriptions found matching your query.
                </td>
              </tr>
            ) : (
              filtered.map((rx) => {
                const pat = db.patients.find((p) => p.id === rx.patientId);
                const isPending = rx.status === "Pending";

                return (
                  <tr key={rx.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-primary">{rx.no}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">{rx.date}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{pat?.name ?? "Unknown"}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{pat?.code}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{rx.doctorName ?? "OPD Consultant"}</td>
                    <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">{rx.diagnosis ?? "—"}</td>
                    <td className="py-3 px-4">
                      <div className="text-foreground font-medium">{rx.items.length} items</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                        {rx.items.map((i) => i.medicineName).join(", ")}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge
                        status={rx.status}
                        tone={rx.status === "Pending" ? "amber" : rx.status === "Dispensed" ? "blue" : "red"}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingRx(rx)}
                          className="h-7 px-2 text-xs"
                          title="View clinical details"
                        >
                          <Eye className="size-3.5 mr-1" /> View
                        </Button>
                        {isPending && (
                          <Button
                            size="sm"
                            asChild
                            className="h-7 px-2.5 text-xs font-semibold"
                          >
                            <Link to="/pharmacy/dispense" search={{ rxId: rx.id }}>
                              Dispense
                            </Link>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* Clinical Prescription Detail Sheet */}
      <Sheet open={Boolean(viewingRx)} onOpenChange={(open) => !open && setViewingRx(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {viewingRx && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle className="font-mono text-base font-bold text-primary">
                    Prescription {viewingRx.no}
                  </SheetTitle>
                  <StatusBadge
                    status={viewingRx.status}
                    tone={viewingRx.status === "Pending" ? "amber" : viewingRx.status === "Dispensed" ? "blue" : "red"}
                  />
                </div>
                <SheetDescription className="text-xs">
                  Issued on {viewingRx.date} by Dr. {viewingRx.doctorName ?? "Consultant"}
                </SheetDescription>
              </SheetHeader>

              {/* Patient Demographics */}
              {(() => {
                const p = db.patients.find((pat) => pat.id === viewingRx.patientId);
                return (
                  <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2 text-xs">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <User className="size-4 text-primary" />
                      <span>{p?.name ?? "Unknown Patient"}</span>
                      <span className="font-mono text-muted-foreground">({p?.code})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                      <div>Mobile: <span className="text-foreground">{p?.mobile || "—"}</span></div>
                      <div>Diagnosis: <span className="text-foreground font-medium">{viewingRx.diagnosis ?? "General"}</span></div>
                    </div>
                  </div>
                );
              })()}

              {/* Medications List */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Prescribed Medications ({viewingRx.items.length})
                </h4>
                <div className="rounded-lg border divide-y bg-card text-xs">
                  {viewingRx.items.map((it, idx) => (
                    <div key={idx} className="p-3 space-y-1">
                      <div className="flex justify-between items-start font-semibold text-foreground">
                        <span>{it.medicineName}</span>
                        <span className="font-mono text-primary font-bold">{it.quantity} units</span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Dosage:</span> {it.dosage} · Duration: {it.duration}
                      </div>
                      {it.instructions && (
                        <div className="text-[11px] text-muted-foreground italic">
                          Note: {it.instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispense Log (if dispensed) */}
              {viewingRx.status === "Dispensed" && (
                <div className="rounded-lg border border-primary/20 bg-info-soft/40 p-3 text-xs space-y-1">
                  <div className="font-semibold text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="size-4" /> Successfully Dispensed
                  </div>
                  <div className="text-muted-foreground">
                    Dispensed by <span className="text-foreground font-medium">{viewingRx.dispensedBy}</span> on{" "}
                    {viewingRx.dispensedAt?.slice(0, 16).replace("T", " ")}
                  </div>
                </div>
              )}

              {/* Action buttons in sheet */}
              <div className="flex items-center justify-between pt-4 border-t">
                {viewingRx.status === "Pending" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelRx(viewingRx)}
                      className="text-xs text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="size-3.5 mr-1" /> Cancel Prescription
                    </Button>
                    <Button
                      size="sm"
                      asChild
                      className="text-xs"
                    >
                      <Link to="/pharmacy/dispense" search={{ rxId: viewingRx.id }}>
                        Dispense Now <CreditCard className="size-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingRx(null)}
                    className="w-full text-xs"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* New Prescription Dialog */}
      <Dialog open={newRxOpen} onOpenChange={setNewRxOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Record New Prescription</DialogTitle>
            <DialogDescription className="text-xs">
              Enter clinical prescription details and medication orders for outpatient dispensing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitNewRx)} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Patient" required error={errors.patientId?.message}>
                <select
                  {...register("patientId")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-2xs"
                >
                  {db.patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) · {p.mobile}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Doctor / Consultant" error={errors.doctorId?.message}>
                <select
                  {...register("doctorId")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-2xs"
                >
                  {db.doctors.filter((d) => d.active).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Clinical Diagnosis" required error={errors.diagnosis?.message}>
              <Input placeholder="e.g. Acute Pharyngitis, Type 2 Diabetes Refill, Hypertension..." {...register("diagnosis")} />
            </Field>

            <Field label="Clinical Notes / Remarks">
              <Textarea placeholder="Special instructions for patient, follow-up dates, etc." {...register("notes")} className="h-16 text-xs" />
            </Field>

            <Separator />

            {/* Prescribed Items Dynamic Array */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                  Prescription Line Items
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      medicineId: db.medicines[0]?.id ?? "",
                      dosage: "1 Tab BD",
                      duration: "5 days",
                      quantity: 10,
                      instructions: "After meals",
                    })
                  }
                  className="h-7 text-xs"
                >
                  <Plus className="size-3.5 mr-1" /> Add Medication
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, idx) => (
                  <div key={field.id} className="rounded-lg border bg-muted/20 p-3 space-y-2 relative">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                        title="Remove medication"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Field label={`Medication #${idx + 1}`} required>
                        <select
                          {...register(`items.${idx}.medicineId` as const)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-2xs"
                        >
                          {db.medicines.filter((m) => m.active).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.dosageForm}) - {money(m.unitPrice)}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Quantity" required>
                          <Input
                            type="number"
                            min="1"
                            {...register(`items.${idx}.quantity` as const)}
                          />
                        </Field>
                        <Field label="Duration" required>
                          <Input
                            placeholder="e.g. 5 days, 1 mo"
                            {...register(`items.${idx}.duration` as const)}
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Field label="Dosage" required>
                        <Input
                          placeholder="e.g. 1 Tab TDS, 2 Puffs PRN"
                          {...register(`items.${idx}.dosage` as const)}
                        />
                      </Field>
                      <Field label="Instructions (Optional)">
                        <Input
                          placeholder="e.g. Take after meals, with water"
                          {...register(`items.${idx}.instructions` as const)}
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setNewRxOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Prescription</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

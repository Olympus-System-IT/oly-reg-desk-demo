"use client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, PowerOff, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, ConfirmDialog, Empty, TableWrap, NativeSelect } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { mutate, useDB } from "@/lib/hms/store";
import type { Doctor } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/doctors")({
  head: () => ({ meta: [{ title: "Doctors — Hospital Management System" }] }),
  component: () => <Guard perm="setup.manage" what="doctor management"><DoctorList /></Guard>,
});

const schema = z.object({
  name: z.string().trim().min(3, "Name required"),
  specialtyId: z.string().min(1, "Select a consultant type"),
  mobile: z.string().trim().regex(/^07[0-9]{8}$/, "Enter a valid Sri Lankan mobile (07XXXXXXXX)"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  regNo: z.string().trim().max(30).optional(),
  qualifications: z.string().trim().max(100).optional(),
  fee: z.coerce.number().nonnegative("Fee cannot be negative"),
  payoutType: z.enum(["none", "fixed", "percent"]),
  payoutValue: z.coerce.number().nonnegative().optional(),
});
type Form = z.infer<typeof schema>;

function DoctorList() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [search, setSearch] = useState("");
  const [filterSpec, setFilterSpec] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<Doctor | null>(null);

  const activeSpecs = db.specialties.filter(s => s.active);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { payoutType: "none" },
  });
  const payoutType = watch("payoutType");

  const filtered = db.doctors.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.mobile.includes(q);
    const matchSpec = !filterSpec || d.specialtyId === filterSpec;
    const matchStatus = !filterStatus || (filterStatus === "active" ? d.active : !d.active);
    return matchQ && matchSpec && matchStatus;
  });

  const openAdd = () => {
    setEditing(null);
    reset({ name: "", specialtyId: activeSpecs[0]?.id ?? "", mobile: "", email: "", regNo: "", qualifications: "", fee: 0, payoutType: "none", payoutValue: undefined });
    setOpen(true);
  };

  const openEdit = (d: Doctor) => {
    setEditing(d);
    reset({
      name: d.name, specialtyId: d.specialtyId, mobile: d.mobile, email: d.email ?? "",
      regNo: d.regNo ?? "", qualifications: d.qualifications ?? "", fee: d.fee,
      payoutType: d.payout.type,
      payoutValue: d.payout.type !== "none" ? d.payout.value : undefined,
    });
    setOpen(true);
  };

  const onSubmit = (v: Form) => {
    mutate((d) => {
      const payout =
        v.payoutType === "fixed" ? { type: "fixed" as const, value: v.payoutValue ?? 0 } :
        v.payoutType === "percent" ? { type: "percent" as const, value: Math.min(100, v.payoutValue ?? 0) } :
        { type: "none" as const };
      if (editing) {
        const doc = d.doctors.find(x => x.id === editing.id);
        if (doc) Object.assign(doc, { name: v.name, specialtyId: v.specialtyId, mobile: v.mobile, email: v.email || undefined, regNo: v.regNo || undefined, qualifications: v.qualifications || undefined, fee: v.fee, payout });
      } else {
        const idx = (d.counters.doctor = (d.counters.doctor ?? 0) + 1);
        d.doctors.push({ id: `d${Date.now()}`, code: `DR-${String(idx).padStart(4, "0")}`, name: v.name, specialtyId: v.specialtyId, mobile: v.mobile, email: v.email || undefined, regNo: v.regNo || undefined, qualifications: v.qualifications || undefined, fee: v.fee, payout, active: true });
      }
    });
    toast.success(editing ? "Doctor updated" : "Doctor added");
    setOpen(false);
  };

  const toggleActive = (doc: Doctor) => {
    if (doc.active) { setDeactivateTarget(doc); return; }
    mutate((d) => { const x = d.doctors.find(y => y.id === doc.id); if (x) x.active = true; });
    toast.success(`${doc.name} activated`);
  };

  return (
    <>
      <PageHeader
        title="Doctors"
        description="Manage doctor profiles, fees, and hospital charges."
        actions={<Button onClick={openAdd}><Plus className="mr-2 size-4" />Add doctor</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, ID, mobile…" className="pl-9" aria-label="Search doctors" />
        </div>
        <NativeSelect value={filterSpec} onChange={e => setFilterSpec(e.target.value)} aria-label="Filter by consultant type" className="w-48">
          <option value="">All consultant types</option>
          {db.specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </NativeSelect>
        <NativeSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status" className="w-32">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </NativeSelect>
      </div>

      <div className="rounded-lg border bg-card shadow-xs">
        <TableWrap>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["Code","Name","Consultant Type","Fee","Hospital Charge","Status",""].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${h === "" ? "" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(doc => {
                const sp = db.specialties.find(s => s.id === doc.specialtyId);
                const payoutLabel = doc.payout.type === "none" ? "—" : doc.payout.type === "fixed" ? `LKR ${doc.payout.value.toLocaleString()}` : `${doc.payout.value}%`;
                return (
                  <tr key={doc.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{doc.code}</td>
                    <td className="px-4 py-3">
                      <Link to="/doctors/$id" params={{ id: doc.id }} className="font-medium text-primary hover:underline">{doc.name}</Link>
                      <div className="text-xs text-muted-foreground">{doc.mobile}</div>
                    </td>
                    <td className="px-4 py-3">{sp?.name ?? "—"}</td>
                    <td className="px-4 py-3 tabular">LKR {doc.fee.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{payoutLabel}</td>
                    <td className="px-4 py-3"><StatusBadge status={doc.active ? "Active" : "Inactive"} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(doc)} aria-label={`Edit ${doc.name}`}><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(doc)} aria-label={doc.active ? `Deactivate ${doc.name}` : `Activate ${doc.name}`}>
                          {doc.active ? <PowerOff className="size-4 text-destructive" /> : <Power className="size-4 text-success" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && <Empty title="No doctors found">{search || filterSpec || filterStatus ? "Try adjusting your filters." : <Button onClick={openAdd} variant="outline" className="mt-3">Add first doctor</Button>}</Empty>}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit doctor" : "Add doctor"}</DialogTitle>
            <DialogDescription>Doctor ID is assigned automatically.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full name <span className="text-destructive">*</span></Label>
                <Input {...register("name")} placeholder="Dr. First Last" />
                {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Consultant Type <span className="text-destructive">*</span></Label>
                <NativeSelect {...register("specialtyId")}>
                  {db.specialties.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </NativeSelect>
                {errors.specialtyId && <p role="alert" className="text-xs text-destructive">{errors.specialtyId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Mobile <span className="text-destructive">*</span></Label>
                <Input {...register("mobile")} placeholder="07XXXXXXXX" />
                {errors.mobile && <p role="alert" className="text-xs text-destructive">{errors.mobile.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" {...register("email")} placeholder="doctor@example.lk" />
              </div>
              <div className="space-y-1.5">
                <Label>Reg. no. (SLMC)</Label>
                <Input {...register("regNo")} placeholder="SLMC 12345" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Qualifications</Label>
                <Input {...register("qualifications")} placeholder="MBBS, MD …" />
              </div>
              <div className="space-y-1.5">
                <Label>Consultation fee (LKR) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} {...register("fee")} />
                {errors.fee && <p role="alert" className="text-xs text-destructive">{errors.fee.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Hospital charge rule</Label>
                <NativeSelect {...register("payoutType")}>
                  <option value="none">No hospital charge</option>
                  <option value="fixed">Fixed amount</option>
                  <option value="percent">Percentage of fee</option>
                </NativeSelect>
              </div>
              {payoutType !== "none" && (
                <div className="space-y-1.5">
                  <Label>{payoutType === "fixed" ? "Fixed amount (LKR)" : "Percentage (%)"}</Label>
                  <Input type="number" min={0} max={payoutType === "percent" ? 100 : undefined} {...register("payoutValue")} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{editing ? "Save changes" : "Add doctor"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={v => { if (!v) setDeactivateTarget(null); }}
        title={`Deactivate "${deactivateTarget?.name}"?`}
        description="Their history is preserved. They will no longer appear in new session or booking forms."
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => {
          if (!deactivateTarget) return;
          mutate((d) => { const x = d.doctors.find(y => y.id === deactivateTarget.id); if (x) x.active = false; });
          toast.success(`${deactivateTarget.name} deactivated`);
          setDeactivateTarget(null);
        }}
      />
    </>
  );
}

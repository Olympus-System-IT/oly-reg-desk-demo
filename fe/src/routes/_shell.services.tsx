"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, PowerOff, Power, History } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, ConfirmDialog, Empty, TableWrap, NativeSelect } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { mutate, useDB } from "@/lib/hms/store";
import { money, fmtDate } from "@/lib/hms/logic";
import type { Service } from "@/lib/hms/types";
import { useCurrentUser } from "@/lib/hms/store";

export const Route = createFileRoute("/_shell/services")({
  head: () => ({ meta: [{ title: "Services & Modalities — Hospital Management System" }] }),
  component: () => <Guard perm="setup.manage" what="service management"><Services /></Guard>,
});

const CATEGORIES = ["Consultation", "Cardiac diagnostics", "Radiology", "Laboratory", "Physiotherapy", "Procedures", "Other"];

const schema = z.object({
  code: z.string().trim().min(1, "Code required").max(20),
  name: z.string().trim().min(2, "Name required").max(100),
  category: z.string().min(1, "Category required"),
  modality: z.string().trim().max(50).optional(),
  description: z.string().trim().max(300).optional(),
  price: z.coerce.number().nonnegative("Price cannot be negative"),
  duration: z.coerce.number().int().nonnegative().optional(),
});
type Form = z.infer<typeof schema>;

function Services() {
  const db = useDB();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Service | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<Service | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const allCategories = [...new Set(db.services.map(s => s.category))];

  const filtered = db.services.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    const matchCat = !filterCat || s.category === filterCat;
    const matchStatus = !filterStatus || (filterStatus === "active" ? s.active : !s.active);
    return matchQ && matchCat && matchStatus;
  });

  const openAdd = () => { setEditing(null); reset({ code: "", name: "", category: CATEGORIES[0], modality: "", description: "", price: 0, duration: undefined }); setOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); reset({ code: s.code, name: s.name, category: s.category, modality: s.modality ?? "", description: s.description ?? "", price: s.price, duration: s.duration }); setOpen(true); };

  const onSubmit = (v: Form) => {
    const dupCode = db.services.find(s => s.code.toUpperCase() === v.code.toUpperCase() && s.id !== editing?.id);
    if (dupCode) { toast.error(`Code "${v.code}" is already in use`); return; }

    mutate((d) => {
      const now = new Date().toISOString().slice(0, 10);
      const byName = user?.name ?? "Admin";
      if (editing) {
        const svc = d.services.find(x => x.id === editing.id);
        if (svc) {
          if (svc.price !== v.price) {
            svc.history.push({ date: now, from: svc.price, to: v.price, by: byName });
            d.auditLog.unshift({ id: `audit${Date.now()}`, ts: new Date().toISOString(), userId: d.auth.userId!, userName: byName, action: "price_change", entity: "service", entityId: svc.id, detail: `${svc.name} price changed from LKR ${svc.price} to LKR ${v.price}`, oldValue: String(svc.price), newValue: String(v.price) });
          }
          Object.assign(svc, { code: v.code.toUpperCase(), name: v.name, category: v.category, modality: v.modality || undefined, description: v.description || undefined, price: v.price, duration: v.duration ?? undefined });
        }
      } else {
        const id = `sv${Date.now()}`;
        d.services.push({ id, code: v.code.toUpperCase(), name: v.name, category: v.category, modality: v.modality || undefined, description: v.description || undefined, price: v.price, duration: v.duration ?? undefined, active: true, history: [{ date: now, from: null, to: v.price, by: byName }] });
      }
    });
    toast.success(editing ? "Service updated" : "Service created");
    setOpen(false);
  };

  const toggleActive = (svc: Service) => {
    if (svc.active) { setDeactivateTarget(svc); return; }
    mutate((d) => { const x = d.services.find(s => s.id === svc.id); if (x) x.active = true; });
    toast.success(`${svc.name} activated`);
  };

  return (
    <>
      <PageHeader
        title="Services & Modalities"
        description="Manage billable services. Price changes apply only to new transactions."
        actions={<Button onClick={openAdd}><Plus className="mr-2 size-4" />Add service</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, code…" className="flex-1 min-w-[180px]" aria-label="Search services" />
        <NativeSelect value={filterCat} onChange={e => setFilterCat(e.target.value)} aria-label="Filter by category" className="w-44">
          <option value="">All categories</option>
          {allCategories.map(c => <option key={c}>{c}</option>)}
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
            <thead><tr className="border-b">{["Code","Name","Category","Modality","Price","Duration","Status",""].map(h => <th key={h} className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${h === "" ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {filtered.map(svc => (
                <tr key={svc.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{svc.code}</td>
                  <td className="px-4 py-2 font-medium">{svc.name}</td>
                  <td className="px-4 py-2">{svc.category}</td>
                  <td className="px-4 py-2 text-muted-foreground">{svc.modality ?? "—"}</td>
                  <td className="px-4 py-2 tabular">{svc.price === 0 ? <span className="text-muted-foreground">Doctor fee</span> : money(svc.price)}</td>
                  <td className="px-4 py-2 tabular text-muted-foreground">{svc.duration ? `${svc.duration} min` : "—"}</td>
                  <td className="px-4 py-2"><StatusBadge status={svc.active ? "Active" : "Inactive"} /></td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setHistoryTarget(svc)} aria-label={`Price history for ${svc.name}`}><History className="size-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(svc)} aria-label={`Edit ${svc.name}`}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(svc)}>
                        {svc.active ? <PowerOff className="size-4 text-destructive" /> : <Power className="size-4 text-success" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && <Empty title="No services found" />}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit service" : "Add service"}</DialogTitle>
            <DialogDescription>Price changes are logged and apply only to new invoices.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input {...register("code")} placeholder="LAB-007" className="uppercase" />
                {errors.code && <p role="alert" className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Category <span className="text-destructive">*</span></Label>
                <NativeSelect {...register("category")}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </NativeSelect>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input {...register("name")} placeholder="Service name" />
                {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Modality</Label>
                <Input {...register("modality")} placeholder="e.g. Ultrasound" />
              </div>
              <div className="space-y-1.5">
                <Label>Price (LKR) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} {...register("price")} />
                {errors.price && <p role="alert" className="text-xs text-destructive">{errors.price.message}</p>}
                <p className="text-xs text-muted-foreground">Set 0 to use doctor's consultation fee</p>
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input type="number" min={0} {...register("duration")} placeholder="Optional" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Textarea {...register("description")} rows={2} className="resize-none" placeholder="Optional description…" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{editing ? "Save changes" : "Create service"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Price History Drawer */}
      <Sheet open={!!historyTarget} onOpenChange={v => { if (!v) setHistoryTarget(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Price history — {historyTarget?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {historyTarget?.history.slice().reverse().map((h, i) => (
              <div key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div className="text-xs text-muted-foreground">{fmtDate(h.date)} · by {h.by}</div>
                <div className="mt-1 font-medium">
                  {h.from === null ? <span>Initial price set to {money(h.to)}</span> : <span>{money(h.from)} → {money(h.to)}</span>}
                </div>
              </div>
            ))}
            {!historyTarget?.history.length && <p className="text-sm text-muted-foreground">No price history.</p>}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={v => { if (!v) setDeactivateTarget(null); }}
        title={`Deactivate "${deactivateTarget?.name}"?`}
        description="The service will be hidden from new invoices. Historical records are preserved."
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => {
          if (!deactivateTarget) return;
          mutate((d) => { const x = d.services.find(s => s.id === deactivateTarget.id); if (x) x.active = false; });
          toast.success(`${deactivateTarget.name} deactivated`);
          setDeactivateTarget(null);
        }}
      />
    </>
  );
}

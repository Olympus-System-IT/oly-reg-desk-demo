"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, PowerOff, Power } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, ConfirmDialog, Empty, TableWrap } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { mutate, useDB } from "@/lib/hms/store";
import type { Specialty } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/specialties")({
  head: () => ({ meta: [{ title: "Consultant Types — Hospital Management System" }] }),
  component: () => <Guard perm="setup.manage" what="consultant type management"><Specialties /></Guard>,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  description: z.string().trim().max(200).optional(),
});
type Form = z.infer<typeof schema>;

function Specialties() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [search, setSearch] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<Specialty | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const filtered = db.specialties.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); reset({ name: "", description: "" }); setOpen(true); };
  const openEdit = (s: Specialty) => { setEditing(s); reset({ name: s.name, description: s.description ?? "" }); setOpen(true); };

  const onSubmit = (v: Form) => {
    // Duplicate name check
    const dup = db.specialties.find(s => s.name.trim().toLowerCase() === v.name.toLowerCase() && s.id !== editing?.id);
    if (dup) { toast.error(`"${v.name}" already exists`); return; }

    mutate((d) => {
      if (editing) {
        const sp = d.specialties.find(x => x.id === editing.id);
        if (sp) { sp.name = v.name.trim(); sp.description = v.description?.trim() || undefined; }
      } else {
        const newId = `sp${Date.now()}`;
        d.specialties.push({ id: newId, name: v.name.trim(), description: v.description?.trim() || undefined, active: true });
        d.auditLog.unshift({ id: `audit${Date.now()}`, ts: new Date().toISOString(), userId: d.auth.userId!, userName: d.users.find(u => u.id === d.auth.userId)?.name ?? "", action: "create", entity: "specialty", entityId: newId, detail: `Consultant Type '${v.name.trim()}' created` });
      }
    });
    toast.success(editing ? "Consultant type updated" : "Consultant type created");
    setOpen(false);
  };

  const toggleActive = (sp: Specialty) => {
    if (sp.active) { setDeactivateTarget(sp); return; }
    mutate((d) => { const x = d.specialties.find(s => s.id === sp.id); if (x) x.active = true; });
    toast.success(`${sp.name} activated`);
  };

  return (
    <>
      <PageHeader
        title="Consultant Types"
        description="Manage medical consultant types. Deactivated consultant types are hidden from booking but history is preserved."
        actions={<Button onClick={openAdd}><Plus className="mr-2 size-4" />Add consultant type</Button>}
      />

      <div className="mb-4">
        <Input
          placeholder="Search consultant types…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Search consultant types"
        />
      </div>

      <div className="rounded-lg border bg-card shadow-xs">
        <TableWrap>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(sp => {
                return (
                  <tr key={sp.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{sp.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sp.description ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={sp.active ? "Active" : "Inactive"} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(sp)} aria-label={`Edit ${sp.name}`}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(sp)} aria-label={sp.active ? `Deactivate ${sp.name}` : `Activate ${sp.name}`}>
                          {sp.active ? <PowerOff className="size-4 text-destructive" /> : <Power className="size-4 text-success" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && <Empty title={search ? "No consultant types match your search" : "No consultant types yet"}>
          {!search && <Button onClick={openAdd} className="mt-3" variant="outline">Add first consultant type</Button>}
        </Empty>}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit consultant type" : "Add consultant type"}</DialogTitle>
            <DialogDescription>{editing ? `Editing: ${editing.name}` : "Create a new medical consultant type"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input {...register("name")} placeholder="e.g. Cardiology" aria-invalid={!!errors.name} />
              {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register("description")} rows={2} placeholder="Optional description…" className="resize-none" />
              {errors.description && <p role="alert" className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{editing ? "Save changes" : "Create consultant type"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={v => { if (!v) setDeactivateTarget(null); }}
        title={`Deactivate "${deactivateTarget?.name}"?`}
        description="Existing bookings and history are preserved. The consultant type will be hidden from new bookings."
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => {
          if (!deactivateTarget) return;
          mutate((d) => { const x = d.specialties.find(s => s.id === deactivateTarget.id); if (x) x.active = false; });
          toast.success(`${deactivateTarget.name} deactivated`);
          setDeactivateTarget(null);
        }}
      />
    </>
  );
}

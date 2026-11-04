"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, PowerOff, Power, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, ConfirmDialog, Empty, TableWrap, NativeSelect } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { mutate, useDB } from "@/lib/hms/store";
import { fmtDate } from "@/lib/hms/logic";
import { ROLE_LABEL } from "@/lib/hms/permissions";
import type { Role, User } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/users")({
  head: () => ({ meta: [{ title: "Users — Hospital Management System" }] }),
  component: () => <Guard perm="users.manage" what="user management"><Users /></Guard>,
});

const ROLES: Role[] = ["admin", "manager", "pharmacist", "receptionist", "nurse"];

const schema = z.object({
  name: z.string().trim().min(2, "Name required"),
  username: z.string().trim().min(3, "Username required").max(30).regex(/^[a-z0-9._-]+$/, "Lowercase letters, numbers, ., _, - only"),
  contact: z.string().trim().min(5, "Email or mobile required"),
  role: z.enum(["admin", "manager", "pharmacist", "receptionist", "nurse"]),
  grantPL: z.boolean().optional(),
});
type Form = z.infer<typeof schema>;

function Users() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { role: "receptionist", grantPL: false } });
  const watchedRole = watch("role");
  const watchedGrantPL = watch("grantPL");

  const filtered = db.users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.contact.toLowerCase().includes(q);
    const matchRole = !filterRole || u.role === filterRole;
    const matchStatus = !filterStatus || (filterStatus === "active" ? u.active : !u.active);
    return matchQ && matchRole && matchStatus;
  });

  const openAdd = () => { setEditing(null); reset({ name: "", username: "", contact: "", role: "receptionist", grantPL: false }); setOpen(true); };
  const openEdit = (u: User) => { setEditing(u); reset({ name: u.name, username: u.username, contact: u.contact, role: u.role, grantPL: u.grantPL ?? false }); setOpen(true); };

  const onSubmit = (v: Form) => {
    const dupUser = db.users.find(u => u.username === v.username && u.id !== editing?.id);
    if (dupUser) { toast.error(`Username "${v.username}" is already taken`); return; }

    mutate((d) => {
      const byName = d.users.find(u => u.id === d.auth.userId)?.name ?? "Admin";
      if (editing) {
        const u = d.users.find(x => x.id === editing.id);
        if (u) Object.assign(u, { name: v.name, username: v.username, contact: v.contact, role: v.role, grantPL: v.role === "manager" ? v.grantPL : undefined });
      } else {
        const id = `u${Date.now()}`;
        d.users.push({ id, name: v.name, username: v.username, contact: v.contact, role: v.role, active: true, grantPL: v.role === "manager" ? v.grantPL : undefined, createdAt: new Date().toISOString().slice(0, 10) });
        d.auditLog.unshift({ id: `audit${Date.now()}`, ts: new Date().toISOString(), userId: d.auth.userId!, userName: byName, action: "create", entity: "user", entityId: id, detail: `User '${v.username}' created with role ${ROLE_LABEL[v.role]}` });
      }
    });
    toast.success(editing ? "User updated" : "User created");
    setOpen(false);
  };

  const toggleActive = (u: User) => {
    if (u.active) { setDeactivateTarget(u); return; }
    mutate((d) => {
      const x = d.users.find(y => y.id === u.id);
      if (x) x.active = true;
      const byName = d.users.find(y => y.id === d.auth.userId)?.name ?? "";
      d.auditLog.unshift({ id: `audit${Date.now()}`, ts: new Date().toISOString(), userId: d.auth.userId!, userName: byName, action: "activate", entity: "user", entityId: u.id, detail: `User '${u.username}' activated` });
    });
    toast.success(`${u.name} activated`);
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage staff accounts. Passwords are never displayed or stored in this demo."
        actions={<Button onClick={openAdd}><Plus className="mr-2 size-4" />Add user</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, username, contact…" className="flex-1 min-w-[200px]" aria-label="Search users" />
        <NativeSelect value={filterRole} onChange={e => setFilterRole(e.target.value)} aria-label="Filter by role" className="w-44">
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
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
            <thead><tr className="border-b">{["Name","Username","Contact","Role","Created","Status",""].map(h => <th key={h} className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${h === "" ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.contact}</td>
                  <td className="px-4 py-2">
                    {ROLE_LABEL[u.role]}
                    {u.role === "manager" && u.grantPL && <span className="ml-1 text-xs text-primary">(P&L)</span>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{u.createdAt ? fmtDate(u.createdAt) : "—"}</td>
                  <td className="px-4 py-2"><StatusBadge status={u.active ? "Active" : "Inactive"} /></td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setResetTarget(u)} aria-label={`Reset password for ${u.name}`}><KeyRound className="size-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)} aria-label={`Edit ${u.name}`}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
                        {u.active ? <PowerOff className="size-4 text-destructive" /> : <Power className="size-4 text-success" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && <Empty title="No users found" />}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "Add user"}</DialogTitle>
            <DialogDescription>Passwords are managed separately via the reset flow. Demo only.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full name <span className="text-destructive">*</span></Label>
                <Input {...register("name")} />
                {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Username <span className="text-destructive">*</span></Label>
                <Input {...register("username")} placeholder="lowercase only" />
                {errors.username && <p role="alert" className="text-xs text-destructive">{errors.username.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email or mobile <span className="text-destructive">*</span></Label>
                <Input {...register("contact")} placeholder="email@example.lk or 07XXXXXXXX" />
                {errors.contact && <p role="alert" className="text-xs text-destructive">{errors.contact.message}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Role <span className="text-destructive">*</span></Label>
                <NativeSelect {...register("role")}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </NativeSelect>
              </div>
              {watchedRole === "manager" && (
                <div className="col-span-2 flex items-center gap-3">
                  <Switch id="grantPL" checked={watchedGrantPL} onCheckedChange={v => setValue("grantPL", v)} />
                  <Label htmlFor="grantPL">Grant P&L access</Label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{editing ? "Save changes" : "Create user"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password confirm */}
      <Dialog open={!!resetTarget} onOpenChange={v => { if (!v) setResetTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {resetTarget?.name}</DialogTitle>
            <DialogDescription>
              In this prototype, no real email or SMS is sent. In production, a secure reset link would be sent to {resetTarget?.contact}. The user would then set a new password via that link.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
            Simulated: no real password reset is performed. This is a demo prototype.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetTarget(null)}>Close</Button>
            <Button onClick={() => {
              mutate((d) => {
                const byName = d.users.find(u => u.id === d.auth.userId)?.name ?? "";
                d.auditLog.unshift({ id: `audit${Date.now()}`, ts: new Date().toISOString(), userId: d.auth.userId!, userName: byName, action: "reset_password", entity: "user", entityId: resetTarget!.id, detail: `Password reset initiated for '${resetTarget!.username}' (simulated)` });
              });
              toast.success(`Password reset initiated for ${resetTarget?.name} (simulated — no real email sent)`);
              setResetTarget(null);
            }}>Confirm reset (simulated)</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={v => { if (!v) setDeactivateTarget(null); }}
        title={`Deactivate "${deactivateTarget?.name}"?`}
        description="They will not be able to log in. Their history is preserved."
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => {
          if (!deactivateTarget) return;
          mutate((d) => {
            const x = d.users.find(y => y.id === deactivateTarget.id);
            if (x) { x.active = false; x.lastActive = new Date().toISOString().slice(0, 10); }
            const byName = d.users.find(u => u.id === d.auth.userId)?.name ?? "";
            d.auditLog.unshift({ id: `audit${Date.now()}`, ts: new Date().toISOString(), userId: d.auth.userId!, userName: byName, action: "deactivate", entity: "user", entityId: deactivateTarget.id, detail: `User '${deactivateTarget.username}' deactivated` });
          });
          toast.success(`${deactivateTarget.name} deactivated`);
          setDeactivateTarget(null);
        }}
      />
    </>
  );
}

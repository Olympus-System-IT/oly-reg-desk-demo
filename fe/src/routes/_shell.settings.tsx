"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, TableWrap, Empty, NativeSelect, Panel } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mutate, useDB } from "@/lib/hms/store";
import { fmtDateTime } from "@/lib/hms/logic";
import type { AuditAction } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({ meta: [{ title: "Settings — Hospital Management System" }] }),
  component: () => <Guard perm="setup.manage" what="settings"><Settings /></Guard>,
});

const settingsSchema = z.object({
  hospitalName: z.string().trim().min(2, "Name required"),
  address: z.string().trim().min(5, "Address required"),
  phone: z.string().trim().min(5),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  currency: z.string().min(1),
  invoicePrefix: z.string().trim().min(1, "Required").max(10),
  receiptPrefix: z.string().trim().min(1, "Required").max(10),
  bookingPrefix: z.string().trim().min(1, "Required").max(10),
  receiptFooter: z.string().trim().max(300),
  invoiceFooter: z.string().trim().max(300),
  smsTemplateBooking: z.string().trim().max(300),
  smsTemplateSessionChange: z.string().trim().max(300),
});
type SettingsForm = z.infer<typeof settingsSchema>;

const ACTION_LABELS: Record<AuditAction, string> = {
  create: "Created", update: "Updated", delete: "Deleted",
  activate: "Activated", deactivate: "Deactivated",
  price_change: "Price changed", void: "Voided", refund: "Refunded",
  override: "Override", reset_password: "Password reset", login: "Login",
};

function Settings() {
  const db = useDB();
  const [filterUser, setFilterUser] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [smsPreview, setSmsPreview] = useState({ name: "Kamal Perera", doctor: "Dr. Nimal Perera", date: "15 Oct 2026", time: "08:30", room: "OPD-1", ref: "BK-261015-0001" });

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      hospitalName: db.settings.hospitalName,
      address: db.settings.address,
      phone: db.settings.phone,
      email: db.settings.email ?? "",
      currency: db.settings.currency,
      invoicePrefix: db.settings.invoicePrefix,
      receiptPrefix: db.settings.receiptPrefix,
      bookingPrefix: db.settings.bookingPrefix,
      receiptFooter: db.settings.receiptFooter,
      invoiceFooter: db.settings.invoiceFooter,
      smsTemplateBooking: db.settings.smsTemplateBooking,
      smsTemplateSessionChange: db.settings.smsTemplateSessionChange,
    },
  });

  const onSubmit = (v: SettingsForm) => {
    mutate((d) => {
      Object.assign(d.settings, v);
      const byName = d.users.find(u => u.id === d.auth.userId)?.name ?? "";
      d.auditLog.unshift({ id: `audit${Date.now()}`, ts: new Date().toISOString(), userId: d.auth.userId!, userName: byName, action: "update", entity: "settings", entityId: "settings", detail: "Hospital settings updated" });
    });
    toast.success("Settings saved");
  };

  const interpolateSms = (tmpl: string) =>
    tmpl
      .replace("{name}", smsPreview.name)
      .replace("{doctor}", smsPreview.doctor)
      .replace("{date}", smsPreview.date)
      .replace("{time}", smsPreview.time)
      .replace("{room}", smsPreview.room)
      .replace("{ref}", smsPreview.ref);

  // Audit log filtering
  const allEntities = [...new Set(db.auditLog.map(e => e.entity))];
  const allActions = [...new Set(db.auditLog.map(e => e.action))];
  const filteredLog = db.auditLog.filter(e => {
    const matchUser = !filterUser || e.userId === filterUser;
    const matchEntity = !filterEntity || e.entity === filterEntity;
    const matchAction = !filterAction || e.action === filterAction;
    const matchFrom = !filterFrom || e.ts >= filterFrom;
    const matchTo = !filterTo || e.ts.slice(0, 10) <= filterTo;
    return matchUser && matchEntity && matchAction && matchFrom && matchTo;
  });

  return (
    <>
      <PageHeader
        title="Settings"
        description="Hospital configuration, numbering, SMS templates, and audit log."
      />

      <Tabs defaultValue="general">
        <TabsList className="mb-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
          <TabsTrigger value="receipts">Receipts & Invoices</TabsTrigger>
          <TabsTrigger value="sms">SMS Templates</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabsContent value="general">
            <div className="max-w-xl space-y-4 rounded-lg border bg-card p-5 shadow-xs">
              <div className="flex items-center gap-4 rounded-md border bg-muted/20 p-3">
                <div className="size-14 rounded-md border bg-white p-1 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                  <img src="/logo.png" alt="Olympus Lanka Hospital Logo" className="size-full object-contain" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Hospital Brand Logo</div>
                  <div className="text-xs text-muted-foreground">Olympus Lanka Hospital logo applied to receipts, invoices, and app navigation.</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Hospital name <span className="text-destructive">*</span></Label>
                <Input {...register("hospitalName")} />
                {errors.hospitalName && <p role="alert" className="text-xs text-destructive">{errors.hospitalName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Address <span className="text-destructive">*</span></Label>
                <Textarea {...register("address")} rows={2} className="resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone <span className="text-destructive">*</span></Label>
                  <Input {...register("phone")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" {...register("email")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <NativeSelect {...register("currency")} className="w-32">
                  <option value="LKR">LKR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </NativeSelect>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !isDirty}><Save className="mr-2 size-4" />Save settings</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="numbering">
            <div className="max-w-md space-y-4 rounded-lg border bg-card p-5 shadow-xs">
              <p className="text-sm text-muted-foreground">These prefixes are used for new documents. Existing numbers are not affected.</p>
              {(["invoicePrefix", "receiptPrefix", "bookingPrefix"] as const).map(f => (
                <div key={f} className="space-y-1.5">
                  <Label>{f === "invoicePrefix" ? "Invoice prefix" : f === "receiptPrefix" ? "Receipt prefix" : "Booking prefix"}</Label>
                  <Input {...register(f)} className="w-32" />
                </div>
              ))}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !isDirty}><Save className="mr-2 size-4" />Save</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="receipts">
            <div className="max-w-xl space-y-4 rounded-lg border bg-card p-5 shadow-xs">
              <div className="space-y-1.5">
                <Label>Receipt footer</Label>
                <Textarea {...register("receiptFooter")} rows={3} className="resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice footer</Label>
                <Textarea {...register("invoiceFooter")} rows={3} className="resize-none" />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !isDirty}><Save className="mr-2 size-4" />Save</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sms">
            <div className="max-w-xl space-y-4 rounded-lg border bg-card p-5 shadow-xs">
              <p className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
                Simulated — no real SMS is sent in this prototype. In production, messages would be delivered via a server-side SMS provider.
              </p>
              <p className="text-xs text-muted-foreground">Variables: <code>{"{name}"}</code>, <code>{"{doctor}"}</code>, <code>{"{date}"}</code>, <code>{"{time}"}</code>, <code>{"{room}"}</code>, <code>{"{ref}"}</code></p>
              <div className="space-y-1.5">
                <Label>Booking confirmation template</Label>
                <Textarea {...register("smsTemplateBooking")} rows={3} className="resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label>Session change template</Label>
                <Textarea {...register("smsTemplateSessionChange")} rows={3} className="resize-none" />
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview (with sample data)</p>
                <p className="text-sm">{interpolateSms(db.settings.smsTemplateBooking)}</p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !isDirty}><Save className="mr-2 size-4" />Save templates</Button>
              </div>
            </div>
          </TabsContent>
        </form>

        <TabsContent value="audit">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <NativeSelect value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-44" aria-label="Filter by user">
                <option value="">All users</option>
                {db.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </NativeSelect>
              <NativeSelect value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="w-36" aria-label="Filter by entity">
                <option value="">All entities</option>
                {allEntities.map(e => <option key={e}>{e}</option>)}
              </NativeSelect>
              <NativeSelect value={filterAction} onChange={e => setFilterAction(e.target.value)} className="w-40" aria-label="Filter by action">
                <option value="">All actions</option>
                {allActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a as AuditAction] ?? a}</option>)}
              </NativeSelect>
              <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} aria-label="From date" className="w-40" />
              <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} aria-label="To date" className="w-40" />
            </div>

            <div className="rounded-lg border bg-card shadow-xs">
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="border-b">{["When","User","Action","Entity","Detail"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {filteredLog.slice(0, 100).map(e => (
                      <tr key={e.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDateTime(e.ts)}</td>
                        <td className="px-4 py-2 font-medium">{e.userName}</td>
                        <td className="px-4 py-2"><StatusBadge status={ACTION_LABELS[e.action] ?? e.action} tone={e.action === "void" || e.action === "delete" || e.action === "deactivate" ? "red" : e.action === "create" || e.action === "activate" ? "green" : "blue"} /></td>
                        <td className="px-4 py-2 capitalize text-muted-foreground">{e.entity}</td>
                        <td className="px-4 py-2 max-w-xs truncate" title={e.detail}>{e.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
              {filteredLog.length === 0 && <Empty title="No audit log entries" />}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

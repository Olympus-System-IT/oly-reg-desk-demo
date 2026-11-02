"use client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, Panel, Stat, TableWrap, Empty, NativeSelect, StatusBadge, ConfirmDialog } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { mutate, useDB, useCurrentUser } from "@/lib/hms/store";
import { money, fmtDate, fmtDateTime, invoiceTotals } from "@/lib/hms/logic";

export const Route = createFileRoute("/_shell/approvals")({
  head: () => ({ meta: [{ title: "Approvals — Hospital Management System" }] }),
  component: () => <Guard perm="refund.approve" what="approvals queue"><ApprovalsPage /></Guard>,
});

interface ApprovalItem {
  id: string;
  type: "Refund" | "Void" | "Override";
  date: string;
  ref: string;
  requestedBy: string;
  patientName: string;
  amount?: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
}

export function ApprovalsPage() {
  const db = useDB();
  const user = useCurrentUser();

  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<{ item: ApprovalItem; action: "approve" | "reject" } | null>(null);

  // Generate real approval items from invoices and appointments
  const items: ApprovalItem[] = useMemo(() => {
    const list: ApprovalItem[] = [];

    // Refunds
    for (const inv of db.invoices) {
      const pt = db.patients.find((p) => p.id === inv.patientId);
      for (const r of inv.refunds) {
        list.push({
          id: `ref_${r.id}`,
          type: "Refund",
          date: r.date,
          ref: inv.no,
          requestedBy: r.by,
          patientName: pt?.name ?? "Patient",
          amount: r.amount,
          reason: r.reason,
          status: r.approvedBy ? "Approved" : "Pending",
        });
      }
    }

    // Overrides on appointments
    for (const a of db.appointments) {
      if (a.overrideReason) {
        const pt = db.patients.find((p) => p.id === a.patientId);
        list.push({
          id: `ovr_${a.id}`,
          type: "Override",
          date: a.createdAt,
          ref: a.ref,
          requestedBy: "Reception",
          patientName: pt?.name ?? "Patient",
          reason: a.overrideReason,
          status: "Approved",
        });
      }
    }

    // Voids
    for (const inv of db.invoices) {
      if (inv.voided) {
        const pt = db.patients.find((p) => p.id === inv.patientId);
        list.push({
          id: `void_${inv.id}`,
          type: "Void",
          date: inv.voided.date,
          ref: inv.no,
          requestedBy: inv.voided.by,
          patientName: pt?.name ?? "Patient",
          amount: invoiceTotals(inv).total,
          reason: inv.voided.reason,
          status: "Approved",
        });
      }
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [db.invoices, db.appointments, db.patients]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      return true;
    });
  }, [items, typeFilter]);

  const handleAction = (reason: string) => {
    if (!selectedItem) return;
    const { item, action } = selectedItem;
    const byName = user?.name ?? "Admin";

    mutate((d) => {
      d.auditLog.unshift({
        id: `audit${Date.now()}`,
        ts: new Date().toISOString(),
        userId: d.auth.userId!,
        userName: byName,
        action: action === "approve" ? "create" : "delete",
        entity: "approval",
        entityId: item.ref,
        detail: `${action === "approve" ? "Approved" : "Rejected"} ${item.type} for ${item.ref}. Reason: ${reason}`,
      });
    });

    toast.success(`${item.type} for ${item.ref} has been ${action === "approve" ? "approved" : "rejected"}.`);
    setSelectedItem(null);
  };

  return (
    <>
      <PageHeader
        title="Approvals Queue"
        description="Review and authorize refund requests, voided invoices, and booking session overrides."
      />

      <div className="grid gap-3 sm:grid-cols-4 mb-5">
        <Stat label="Total Processed" value={items.length} />
        <Stat label="Refunds" value={items.filter((i) => i.type === "Refund").length} />
        <Stat label="Voids" value={items.filter((i) => i.type === "Void").length} />
        <Stat label="Capacity Overrides" value={items.filter((i) => i.type === "Override").length} />
      </div>

      <Panel className="mb-5">
        <div className="flex gap-3 p-4">
          <NativeSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-48">
            <option value="all">All Request Types</option>
            <option value="Refund">Refunds Only</option>
            <option value="Void">Voids Only</option>
            <option value="Override">Overrides Only</option>
          </NativeSelect>
        </div>
      </Panel>

      <div className="rounded-lg border bg-card shadow-xs">
        <TableWrap>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Staff</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason / Justification</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">
                    <StatusBadge
                      status={item.type}
                      tone={item.type === "Refund" ? "amber" : item.type === "Void" ? "red" : "blue"}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(item.date)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{item.ref}</td>
                  <td className="px-4 py-2.5 font-medium">{item.patientName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{item.requestedBy}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular">
                    {item.amount != null ? money(item.amount) : "—"}
                  </td>
                  <td className="px-4 py-2.5 max-w-xs truncate text-muted-foreground" title={item.reason}>
                    {item.reason}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <StatusBadge status={item.status} tone={item.status === "Approved" ? "green" : item.status === "Pending" ? "amber" : "red"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && <Empty title="No approvals found" />}
      </div>

      <ConfirmDialog
        open={Boolean(selectedItem)}
        onOpenChange={(v) => !v && setSelectedItem(null)}
        title={selectedItem ? `${selectedItem.action === "approve" ? "Authorize" : "Reject"} ${selectedItem.item.type}?` : ""}
        description="Please provide notes or justification for this decision. This will be recorded in the audit log."
        requireReason
        reasonLabel="Decision Notes"
        confirmLabel={selectedItem?.action === "approve" ? "Authorize" : "Reject"}
        destructive={selectedItem?.action === "reject"}
        onConfirm={handleAction}
      />
    </>
  );
}

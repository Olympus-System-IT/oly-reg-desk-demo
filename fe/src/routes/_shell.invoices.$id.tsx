"use client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CreditCard, Printer, RotateCcw, Ban, Share2, Check, Download } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, TableWrap, Empty, Panel, Field, NativeSelect, ConfirmDialog } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mutate, useDB, useCurrentUser } from "@/lib/hms/store";
import { invoiceTotals, money, fmtDate, fmtDateTime } from "@/lib/hms/logic";
import { can } from "@/lib/hms/permissions";
import type { PayMethod } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/invoices/$id")({
  head: () => ({ meta: [{ title: "Invoice Details — Hospital Management System" }] }),
  component: () => <Guard perm="billing.view" what="invoice details"><InvoiceDetail /></Guard>,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const user = useCurrentUser();

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payMethod, setPayMethod] = useState<PayMethod>("Cash");
  const [payRef, setPayRef] = useState("");

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number | "">("");
  const [refundReason, setRefundReason] = useState("");

  const [voidOpen, setVoidOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printTab, setPrintTab] = useState<"thermal" | "a4" | "ebill">("thermal");
  const [ebillCopied, setEbillCopied] = useState(false);

  const inv = db.invoices.find((i) => i.id === id);
  if (!inv) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/invoices">
            <ArrowLeft className="mr-2 size-4" /> Back to Invoices
          </Link>
        </Button>
      </div>
    );
  }

  const patient = db.patients.find((p) => p.id === inv.patientId);
  const totals = invoiceTotals(inv, db.settings.taxRate);

  const canCollect = can(user, "billing.collect") && !inv.voided && totals.balance > 0;
  const canRefund = can(user, "refund.approve") && !inv.voided && totals.paid > totals.refunded;
  const canVoid = can(user, "void.approve") && !inv.voided;

  const handleCollectPayment = () => {
    const amt = Number(payAmount);
    if (!amt || amt <= 0 || amt > totals.balance) {
      toast.error(`Please enter a valid amount up to ${money(totals.balance)}`);
      return;
    }

    mutate((d) => {
      const target = d.invoices.find((i) => i.id === inv.id);
      if (!target) return;
      const rcptIdx = (d.counters.receipt = (d.counters.receipt ?? 0) + 1);
      const rcptNo = `${d.settings.receiptPrefix}-${String(rcptIdx).padStart(6, "0")}`;
      const now = new Date().toISOString();
      const byName = d.users.find((u) => u.id === d.auth.userId)?.name ?? "Staff";

      target.payments.push({
        id: `pay${Date.now()}`,
        receiptNo: rcptNo,
        amount: amt,
        method: payMethod,
        date: now,
        reference: payRef || undefined,
        by: byName,
      });

      d.auditLog.unshift({
        id: `audit${Date.now()}`,
        ts: now,
        userId: d.auth.userId!,
        userName: byName,
        action: "create",
        entity: "payment",
        entityId: rcptNo,
        detail: `Payment of ${money(amt)} received for ${target.no} via ${payMethod}`,
      });
    });

    toast.success(`Payment of ${money(amt)} recorded.`);
    setPayOpen(false);
    setPayAmount("");
    setPayRef("");
  };

  const handleRefund = () => {
    const amt = Number(refundAmount);
    const maxRefundable = totals.paid - totals.refunded;
    if (!amt || amt <= 0 || amt > maxRefundable) {
      toast.error(`Refund amount must be between 1 and ${money(maxRefundable)}`);
      return;
    }
    if (!refundReason.trim()) {
      toast.error("Refund reason is mandatory");
      return;
    }

    mutate((d) => {
      const target = d.invoices.find((i) => i.id === inv.id);
      if (!target) return;
      const now = new Date().toISOString();
      const byName = d.users.find((u) => u.id === d.auth.userId)?.name ?? "Staff";

      target.refunds.push({
        id: `ref${Date.now()}`,
        amount: amt,
        reason: refundReason.trim(),
        date: now,
        by: byName,
        approvedBy: byName,
      });

      d.auditLog.unshift({
        id: `audit${Date.now()}`,
        ts: now,
        userId: d.auth.userId!,
        userName: byName,
        action: "refund",
        entity: "invoice",
        entityId: target.no,
        detail: `Refund of ${money(amt)} issued for ${target.no}. Reason: ${refundReason}`,
      });
    });

    toast.success(`Refund of ${money(amt)} issued.`);
    setRefundOpen(false);
    setRefundAmount("");
    setRefundReason("");
  };

  const handleVoid = (reason: string) => {
    mutate((d) => {
      const target = d.invoices.find((i) => i.id === inv.id);
      if (!target) return;
      const now = new Date().toISOString();
      const byName = d.users.find((u) => u.id === d.auth.userId)?.name ?? "Staff";

      target.voided = {
        reason: reason.trim(),
        by: byName,
        date: now,
      };

      d.auditLog.unshift({
        id: `audit${Date.now()}`,
        ts: now,
        userId: d.auth.userId!,
        userName: byName,
        action: "void",
        entity: "invoice",
        entityId: target.no,
        detail: `Invoice ${target.no} voided. Reason: ${reason}`,
      });
    });

    toast.success(`Invoice ${inv.no} has been voided.`);
    setVoidOpen(false);
  };

  const ebillUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/ebill/${inv.id}?token=eb-${inv.no.toLowerCase()}`;

  const copyEbill = () => {
    navigator.clipboard.writeText(ebillUrl);
    setEbillCopied(true);
    toast.success("E-bill link copied to clipboard");
    setTimeout(() => setEbillCopied(false), 2000);
  };

  const sendEbillSms = () => {
    if (!patient?.mobile) {
      toast.error("Patient has no mobile number registered.");
      return;
    }
    mutate((d) => {
      d.messages.unshift({
        id: `msg${Date.now()}`,
        ts: new Date().toISOString(),
        patientId: patient.id,
        invoiceId: inv.id,
        type: "ebill",
        text: `Dear ${patient.name.split(" ")[0]}, your e-bill for invoice ${inv.no} is ready: ${ebillUrl} [DEMO: simulated SMS]`,
        status: "Sent",
        simulatedNote: "Simulated — no real SMS sent",
      });
    });
    toast.success(`E-bill SMS simulated for ${patient.mobile}`);
  };

  return (
    <>
      <div className="no-print">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
          <Link to="/invoices">
            <ArrowLeft className="mr-1 size-4" /> Back to Invoices
          </Link>
        </Button>

        <PageHeader
          title={`Invoice ${inv.no}`}
          description={`Created on ${fmtDateTime(inv.createdAt)} by ${inv.createdBy}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPrintOpen(true)}>
                <Printer className="mr-1.5 size-4" /> Print / E-Bill
              </Button>
              {canCollect && (
                <Button
                  size="sm"
                  onClick={() => {
                    setPayAmount(totals.balance);
                    setPayOpen(true);
                  }}
                >
                  <CreditCard className="mr-1.5 size-4" /> Collect payment
                </Button>
              )}
              {canRefund && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-600 hover:text-amber-700"
                  onClick={() => {
                    setRefundAmount(totals.paid - totals.refunded);
                    setRefundOpen(true);
                  }}
                >
                  <RotateCcw className="mr-1.5 size-4" /> Refund
                </Button>
              )}
              {canVoid && (
                <Button variant="destructive" size="sm" onClick={() => setVoidOpen(true)}>
                  <Ban className="mr-1.5 size-4" /> Void invoice
                </Button>
              )}
            </div>
          }
        />

        {inv.voided && (
          <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <h3 className="font-semibold">Invoice Voided</h3>
            <p className="mt-1 text-sm">
              Voided on {fmtDateTime(inv.voided.date)} by {inv.voided.by}. Reason: &ldquo;{inv.voided.reason}&rdquo;
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {/* Patient card */}
            <Panel title="Patient Information">
              <div className="grid gap-3 p-4 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Patient</span>
                  {patient ? (
                    <Link to="/patients/$id" params={{ id: patient.id }} className="font-medium text-primary hover:underline">
                      {patient.name} ({patient.code})
                    </Link>
                  ) : (
                    <span className="font-medium">Guest / Unknown</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Mobile</span>
                  <span>{patient?.mobile || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Address</span>
                  <span>{patient?.address || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">SMS Consent</span>
                  <span>{patient?.smsConsent ? "Consented" : "Opted out"}</span>
                </div>
              </div>
            </Panel>

            {/* Line items */}
            <Panel title="Invoice Items">
              <TableWrap>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Item / Service</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Qty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit Price</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inv.lines.map((l, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium">{l.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{l.category}</td>
                        <td className="px-4 py-2.5 text-right tabular">{l.qty}</td>
                        <td className="px-4 py-2.5 text-right tabular">{money(l.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right font-medium tabular">{money(l.qty * l.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </Panel>

            {/* Payments History */}
            <Panel title="Payments Received">
              {inv.payments.length === 0 ? (
                <Empty title="No payments recorded yet" />
              ) : (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Receipt #</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Method</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Cashier</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {inv.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 py-2 font-mono text-xs">{p.receiptNo}</td>
                          <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(p.date)}</td>
                          <td className="px-4 py-2 font-medium">{p.method}</td>
                          <td className="px-4 py-2 text-muted-foreground">{p.reference || "—"}</td>
                          <td className="px-4 py-2 text-muted-foreground">{p.by}</td>
                          <td className="px-4 py-2 text-right font-medium tabular text-success">{money(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Panel>

            {/* Refunds */}
            {inv.refunds.length > 0 && (
              <Panel title="Refunds Issued">
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Processed By</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Refunded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {inv.refunds.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(r.date)}</td>
                          <td className="px-4 py-2 font-medium text-destructive">{r.reason}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.by}</td>
                          <td className="px-4 py-2 text-right font-medium tabular text-destructive">-{money(r.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </Panel>
            )}
          </div>

          {/* Right column: Summary */}
          <div className="space-y-4">
            <Panel title="Summary">
              <div className="space-y-3 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={totals.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular">{money(totals.subtotal)}</span>
                </div>
                {inv.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span className="tabular">-{money(inv.discount)}</span>
                  </div>
                )}
                {totals.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({db.settings.taxRate}%)</span>
                    <span className="tabular">{money(totals.tax)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="tabular">{money(totals.total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Paid to date</span>
                  <span className="tabular text-foreground">{money(totals.paid)}</span>
                </div>
                {totals.refunded > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Refunded</span>
                    <span className="tabular">-{money(totals.refunded)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-semibold text-base">
                  <span>Balance Due</span>
                  <span className={`tabular ${totals.balance > 0 ? "text-destructive" : "text-success"}`}>
                    {money(totals.balance)}
                  </span>
                </div>
              </div>
            </Panel>

            <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground">Terms & Notes</p>
              <p>{db.settings.invoiceFooter || "Payment is due upon receipt. Inquiries within 7 days."}</p>
              <p className="pt-1 text-[11px]">Prototype simulated transaction mode · No real payment gateway</p>
            </div>
          </div>
        </div>
      </div>

      {/* Collect Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Payment — {inv.no}</DialogTitle>
            <DialogDescription>
              Record a payment against this invoice. Outstanding balance: {money(totals.balance)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Amount to collect" required>
              <Input
                type="number"
                min={1}
                max={totals.balance}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder={`Max ${totals.balance}`}
              />
            </Field>
            <Field label="Payment Method" required>
              <NativeSelect value={payMethod} onChange={(e) => setPayMethod(e.target.value as PayMethod)}>
                <option value="Cash">Cash</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Bank transfer">Bank Transfer</option>
              </NativeSelect>
            </Field>
            <Field label="Reference / Transaction ID (optional)">
              <Input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. Card slip # or transfer ref"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCollectPayment}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund — {inv.no}</DialogTitle>
            <DialogDescription>
              Maximum refundable: {money(totals.paid - totals.refunded)}. Reason is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Refund Amount" required>
              <Input
                type="number"
                min={1}
                max={totals.paid - totals.refunded}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </Field>
            <Field label="Reason for refund" required>
              <Input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Doctor cancelled, service unavailable"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRefund}>
              Confirm Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Confirmation Dialog */}
      <ConfirmDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title={`Void Invoice ${inv.no}?`}
        description="Voiding cancels this invoice and clears its balance. This action will be recorded in the audit log."
        requireReason
        reasonLabel="Void Reason"
        confirmLabel="Void Invoice"
        destructive
        onConfirm={handleVoid}
      />

      {/* Print / E-Bill Modal */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print / E-Bill Layouts</DialogTitle>
            <DialogDescription>Select format for physical printing or simulated digital sharing.</DialogDescription>
          </DialogHeader>

          <Tabs value={printTab} onValueChange={(v) => setPrintTab(v as typeof printTab)}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="thermal">80mm Thermal</TabsTrigger>
              <TabsTrigger value="a4">A4 Full Invoice</TabsTrigger>
              <TabsTrigger value="ebill">Digital E-Bill</TabsTrigger>
            </TabsList>

            {/* Thermal layout */}
            <TabsContent value="thermal" className="space-y-4">
              <div className="mx-auto w-[320px] rounded-lg border bg-card p-4 font-mono text-xs shadow-xs space-y-2">
                <div className="text-center space-y-1 border-b pb-2 flex flex-col items-center">
                  <img src="/logo.png" alt="Olympus Logo" className="size-10 object-contain mx-auto" />
                  <div className="font-bold text-sm">{db.settings.hospitalName}</div>
                  <div>{db.settings.address}</div>
                  <div>Tel: {db.settings.phone}</div>
                </div>
                <div className="flex justify-between pt-1">
                  <span>RECEIPT / INVOICE</span>
                  <span className="font-bold">{inv.no}</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Date: {fmtDateTime(inv.createdAt)}</span>
                  <span>By: {inv.createdBy}</span>
                </div>
                <div className="border-b pb-1 text-[11px]">
                  Patient: {patient?.name ?? "Guest"} ({patient?.code})
                </div>
                <div className="space-y-1 border-b py-2">
                  {inv.lines.map((l, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="truncate pr-2">{l.name} x{l.qty}</span>
                      <span>{money(l.qty * l.unitPrice)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-0.5 pt-1 text-right">
                  <div className="flex justify-between"><span>SUBTOTAL</span><span>{money(totals.subtotal)}</span></div>
                  {inv.discount > 0 && <div className="flex justify-between"><span>DISCOUNT</span><span>-{money(inv.discount)}</span></div>}
                  <div className="flex justify-between font-bold text-sm border-t pt-1"><span>TOTAL</span><span>{money(totals.total)}</span></div>
                  <div className="flex justify-between text-success"><span>PAID</span><span>{money(totals.paid)}</span></div>
                  {totals.balance > 0 && <div className="flex justify-between text-destructive font-bold"><span>DUE</span><span>{money(totals.balance)}</span></div>}
                </div>
                <div className="border-t pt-2 text-center text-[10px] text-muted-foreground">
                  {db.settings.receiptFooter || "Thank you. Get well soon!"}
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <Button onClick={() => window.print()}>
                  <Printer className="mr-2 size-4" /> Print Thermal (80mm)
                </Button>
              </div>
            </TabsContent>

            {/* A4 layout */}
            <TabsContent value="a4" className="space-y-4">
              <div className="rounded-lg border bg-card p-6 text-sm shadow-xs space-y-4">
                <div className="flex justify-between items-start border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-md border bg-white p-1 overflow-hidden shrink-0 flex items-center justify-center">
                      <img src="/logo.png" alt="Olympus Logo" className="size-full object-contain" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-primary">{db.settings.hospitalName}</h2>
                      <p className="text-xs text-muted-foreground">{db.settings.address}</p>
                      <p className="text-xs text-muted-foreground">Phone: {db.settings.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-foreground">{inv.no}</span>
                    <p className="text-xs text-muted-foreground">Date: {fmtDate(inv.createdAt)}</p>
                    <StatusBadge status={totals.status} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs border-b pb-4">
                  <div>
                    <span className="font-semibold block text-muted-foreground">Billed To:</span>
                    <p className="font-bold text-sm text-foreground">{patient?.name ?? "Guest"}</p>
                    <p>{patient?.code}</p>
                    <p>{patient?.mobile}</p>
                    <p>{patient?.address}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold block text-muted-foreground">Payment Status:</span>
                    <p className="font-semibold">{totals.status}</p>
                    <p>Cashier: {inv.createdBy}</p>
                  </div>
                </div>

                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="py-2 px-3 text-left">Description</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inv.lines.map((l, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium">{l.name}</td>
                        <td className="py-2 px-3 text-right tabular">{l.qty}</td>
                        <td className="py-2 px-3 text-right tabular">{money(l.unitPrice)}</td>
                        <td className="py-2 px-3 text-right tabular font-medium">{money(l.qty * l.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t pt-3 flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs text-right">
                    <div className="flex justify-between"><span>Subtotal:</span><span>{money(totals.subtotal)}</span></div>
                    {inv.discount > 0 && <div className="flex justify-between text-success"><span>Discount:</span><span>-{money(inv.discount)}</span></div>}
                    <div className="flex justify-between font-bold text-sm border-t pt-1"><span>Net Total:</span><span>{money(totals.total)}</span></div>
                    <div className="flex justify-between text-success"><span>Amount Paid:</span><span>{money(totals.paid)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-1 text-sm"><span>Balance Due:</span><span>{money(totals.balance)}</span></div>
                  </div>
                </div>

                <div className="border-t pt-3 text-center text-xs text-muted-foreground">
                  {db.settings.invoiceFooter || "Thank you for choosing our hospital."}
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <Button onClick={() => window.print()}>
                  <Printer className="mr-2 size-4" /> Print A4 Invoice
                </Button>
              </div>
            </TabsContent>

            {/* E-bill tab */}
            <TabsContent value="ebill" className="space-y-4">
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">Secure E-Bill Link</h4>
                    <p className="text-xs text-muted-foreground">Share this encrypted, non-guessable link with the patient.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={copyEbill}>
                    {ebillCopied ? <Check className="mr-1.5 size-4 text-success" /> : <Share2 className="mr-1.5 size-4" />}
                    {ebillCopied ? "Copied" : "Copy Link"}
                  </Button>
                </div>
                <div className="rounded-md bg-muted p-2 font-mono text-xs break-all text-muted-foreground">
                  {ebillUrl}
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={sendEbillSms}>
                    Simulate Send SMS
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPrintOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

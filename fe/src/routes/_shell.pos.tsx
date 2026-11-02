"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Search, Plus, Trash2, CreditCard, Printer } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, NativeSelect, Panel, Field, Empty } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { mutate, useDB } from "@/lib/hms/store";
import { invoiceTotals, money, patientAge } from "@/lib/hms/logic";
import type { InvoiceLine, PayMethod, Patient } from "@/lib/hms/types";
import { can } from "@/lib/hms/permissions";
import { useCurrentUser } from "@/lib/hms/store";

export const Route = createFileRoute("/_shell/pos")({
  head: () => ({ meta: [{ title: "POS — Hospital Management System" }] }),
  component: () => <Guard perm="billing.collect" what="point of sale"><POS /></Guard>,
});

type LineItem = InvoiceLine & { tempId: string };

function POS() {
  const db = useDB();
  const user = useCurrentUser();
  const canDiscount = can(user, "void.approve"); // admins can give bigger discounts; others limited

  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedApptId, setSelectedApptId] = useState<string>("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [serviceSearch, setServiceSearch] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("Cash");
  const [payRef, setPayRef] = useState("");
  const [cashReceived, setCashReceived] = useState<number | "">(0);
  const [submitted, setSubmitted] = useState(false);
  const [confirmedInv, setConfirmedInv] = useState<{ no: string; receiptNo: string; total: number } | null>(null);

  const patientQ = patientSearch.toLowerCase().trim();
  const matchedPatients = !patientQ ? [] : db.patients.filter(p =>
    p.name.toLowerCase().includes(patientQ) || p.code.includes(patientQ) || p.mobile.includes(patientQ)
  ).slice(0, 6);

  const activeServices = db.services.filter(s => s.active);
  const svcQ = serviceSearch.toLowerCase();
  const matchedServices = !svcQ ? [] : activeServices.filter(s =>
    s.name.toLowerCase().includes(svcQ) || s.code.toLowerCase().includes(svcQ) || s.category.toLowerCase().includes(svcQ)
  ).slice(0, 8);

  const patientAppts = selectedPatient
    ? db.appointments.filter(a => a.patientId === selectedPatient.id && a.status !== "Cancelled" && !a.invoiceId).slice(0, 5)
    : [];

  const addLine = (svc: typeof activeServices[0]) => {
    if (svc.code === "CON-001" && !selectedApptId) {
      toast.error("Select an appointment to bill a consultation");
      return;
    }
    const doc = selectedApptId ? db.sessions.find(s => s.id === db.appointments.find(a => a.id === selectedApptId)?.sessionId) : undefined;
    const docObj = doc ? db.doctors.find(d => d.id === doc.doctorId) : undefined;
    const unitPrice = svc.code === "CON-001" ? (docObj?.fee ?? 0) : svc.price;
    setLines(prev => [...prev, { tempId: `${Date.now()}`, serviceId: svc.id, name: svc.name, category: svc.category, qty: 1, unitPrice, doctorId: docObj?.id }]);
    setServiceSearch("");
  };

  const removeLine = (tempId: string) => setLines(prev => prev.filter(l => l.tempId !== tempId));
  const updateQty = (tempId: string, qty: number) => setLines(prev => prev.map(l => l.tempId === tempId ? { ...l, qty: Math.max(1, qty) } : l));
  const updatePrice = (tempId: string, price: number) => setLines(prev => prev.map(l => l.tempId === tempId ? { ...l, unitPrice: Math.max(0, price) } : l));

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const tax = db.settings.taxRate ? Math.round((subtotal - discount) * db.settings.taxRate) / 100 : 0;
  const total = Math.max(0, subtotal - discount) + tax;
  const change = payMethod === "Cash" && typeof cashReceived === "number" ? Math.max(0, cashReceived - total) : 0;

  const reset = () => {
    setSelectedPatient(null);
    setSelectedApptId("");
    setLines([]);
    setDiscount(0);
    setServiceSearch("");
    setPayMethod("Cash");
    setPayRef("");
    setCashReceived(0);
    setSubmitted(false);
    setPatientSearch("");
    setConfirmedInv(null);
  };

  const confirmInvoice = () => {
    if (!selectedPatient || lines.length === 0) { toast.error("Select a patient and add at least one service"); return; }
    if (submitted) return; // prevent duplicate
    setSubmitted(true);

    mutate((d) => {
      const invIdx = (d.counters.invoice = (d.counters.invoice ?? 0) + 1);
      const rcptIdx = (d.counters.receipt = (d.counters.receipt ?? 0) + 1);
      const invNo = `${d.settings.invoicePrefix}-${String(invIdx).padStart(6, "0")}`;
      const rcptNo = `${d.settings.receiptPrefix}-${String(rcptIdx).padStart(6, "0")}`;
      const now = new Date().toISOString();
      const by = d.users.find(u => u.id === d.auth.userId)?.name ?? "Staff";
      const invId = `i${Date.now()}`;

      const inv = {
        id: invId,
        no: invNo,
        patientId: selectedPatient.id,
        appointmentId: selectedApptId || undefined,
        lines: lines.map(({ tempId: _, ...l }) => l),
        discount,
        payments: [{
          id: `pay${Date.now()}`,
          receiptNo: rcptNo,
          amount: total,
          method: payMethod,
          date: now,
          reference: payRef || undefined,
          by,
        }],
        refunds: [],
        createdAt: now,
        createdBy: by,
      };
      d.invoices.push(inv);

      // Link invoice to appointment
      if (selectedApptId) {
        const appt = d.appointments.find(a => a.id === selectedApptId);
        if (appt) appt.invoiceId = invId;
      }

      d.auditLog.unshift({ id: `audit${Date.now()}`, ts: now, userId: d.auth.userId!, userName: by, action: "create", entity: "invoice", entityId: invId, detail: `Invoice ${invNo} created (${money(total)})` });

      setConfirmedInv({ no: invNo, receiptNo: rcptNo, total });
    });
  };

  if (confirmedInv) {
    return (
      <div className="max-w-md mx-auto py-8 text-center space-y-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft">
          <CreditCard className="size-8 text-success" />
        </div>
        <h2 className="text-xl font-semibold">Payment collected</h2>
        <div className="rounded-lg border bg-card p-5 text-left space-y-3 text-sm">
          <div className="flex items-center gap-2.5 border-b pb-3">
            <div className="size-8 overflow-hidden rounded bg-white p-0.5 border border-border/60 shrink-0 flex items-center justify-center">
              <img src="/logo.png" alt="Olympus Lanka Hospital Logo" className="size-full object-contain" />
            </div>
            <div>
              <div className="font-bold text-xs text-foreground">Olympus Lanka Hospital</div>
              <div className="text-[10px] text-muted-foreground">Official Payment Receipt</div>
            </div>
          </div>
          <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono">{confirmedInv.no}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Receipt</span><span className="font-mono">{confirmedInv.receiptNo}</span></div>
          <div className="flex justify-between font-semibold"><span>Total paid</span><span className="tabular">{money(confirmedInv.total)}</span></div>
        </div>
        <p className="text-xs text-muted-foreground">Demo — no real payment processed.</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={reset}>New invoice</Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 size-4" />Print receipt</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="POS / New Invoice" description="Create an invoice and collect payment." />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: patient + items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Patient selector */}
          <Panel title="Patient">
            <div className="p-4 space-y-2">
              {!selectedPatient ? (
                <>
                  <Input
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    placeholder="Search patient by name, ID, or mobile…"
                    autoFocus
                    aria-label="Search patient"
                  />
                  {matchedPatients.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedPatient(p); setPatientSearch(""); }}
                      className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-muted/50 border"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-2 text-muted-foreground text-xs">{p.code} · {p.mobile || "no mobile"} · {patientAge(p)}</span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedPatient.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedPatient.code} · {selectedPatient.mobile || "no mobile"}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setSelectedApptId(""); }}>Change</Button>
                </div>
              )}
              {selectedPatient && patientAppts.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Link to appointment (optional)</Label>
                  <NativeSelect value={selectedApptId} onChange={e => setSelectedApptId(e.target.value)} aria-label="Link to appointment">
                    <option value="">No appointment linked</option>
                    {patientAppts.map(a => {
                      const ses = db.sessions.find(s => s.id === a.sessionId);
                      const doc = ses ? db.doctors.find(d => d.id === ses.doctorId) : undefined;
                      return <option key={a.id} value={a.id}>{a.ref} · {doc?.name} · {ses?.date}</option>;
                    })}
                  </NativeSelect>
                </div>
              )}
            </div>
          </Panel>

          {/* Service search */}
          <Panel title="Add services">
            <div className="p-4 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={serviceSearch}
                  onChange={e => setServiceSearch(e.target.value)}
                  placeholder="Search service by name, code, or category…"
                  className="pl-9"
                  aria-label="Search services"
                />
              </div>
              {matchedServices.map(svc => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => addLine(svc)}
                  className="w-full text-left rounded-md border px-3 py-2 text-sm hover:border-primary hover:bg-info-soft/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{svc.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{svc.code} · {svc.category}</span>
                    </div>
                    <span className="tabular text-sm">{svc.price === 0 ? "Doctor fee" : money(svc.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          {/* Line items */}
          {lines.length > 0 && (
            <Panel title="Line items">
              <div className="divide-y">
                {lines.map(line => (
                  <div key={line.tempId} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{line.name}</div>
                      <div className="text-xs text-muted-foreground">{line.category}</div>
                    </div>
                    <Input
                      type="number" min={1} value={line.qty}
                      onChange={e => updateQty(line.tempId, Number(e.target.value))}
                      className="w-16 text-center h-8"
                      aria-label="Quantity"
                    />
                    <Input
                      type="number" min={0} value={line.unitPrice}
                      onChange={e => updatePrice(line.tempId, Number(e.target.value))}
                      className="w-28 h-8 tabular"
                      aria-label="Unit price"
                    />
                    <div className="flex items-center gap-2">
                      <span className="tabular text-sm w-24 text-right">{money(line.qty * line.unitPrice)}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeLine(line.tempId)} aria-label={`Remove ${line.name}`}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              {lines.length === 0 && <Empty title="No items added" />}
            </Panel>
          )}
        </div>

        {/* Right: totals + payment */}
        <div className="space-y-4">
          <Panel title="Totals">
            <div className="divide-y px-4 py-2 text-sm space-y-0">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular">{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between py-2 gap-2">
                <span className="text-muted-foreground shrink-0">Discount (LKR)</span>
                <Input
                  type="number" min={0} max={canDiscount ? subtotal : Math.min(subtotal, 500)}
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value))}
                  className="w-28 h-7 text-right tabular"
                  aria-label="Discount amount"
                />
              </div>
              {db.settings.taxRate && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Tax ({db.settings.taxRate}%)</span>
                  <span className="tabular">{money(tax)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between py-2 font-semibold text-base">
                <span>Total</span>
                <span className="tabular">{money(total)}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Payment">
            <div className="p-4 space-y-3">
              <NativeSelect value={payMethod} onChange={e => setPayMethod(e.target.value as PayMethod)} aria-label="Payment method">
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank transfer">Bank transfer</option>
              </NativeSelect>
              {(payMethod === "Card" || payMethod === "Bank transfer") && (
                <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Reference / transaction ID" />
              )}
              {payMethod === "Cash" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Cash received</Label>
                    <Input
                      type="number" min={0}
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value === "" ? "" : Number(e.target.value))}
                      className="tabular"
                    />
                  </div>
                  {typeof cashReceived === "number" && cashReceived > 0 && (
                    <div className={`rounded-md px-3 py-2 text-sm font-medium ${cashReceived >= total ? "bg-success-soft text-success" : "bg-danger-soft text-destructive"}`}>
                      {cashReceived >= total ? `Change due: ${money(change)}` : `Insufficient: ${money(total - cashReceived)} short`}
                    </div>
                  )}
                </>
              )}
            </div>
          </Panel>

          <Button
            className="w-full"
            size="lg"
            disabled={!selectedPatient || lines.length === 0 || submitted}
            onClick={confirmInvoice}
          >
            <CreditCard className="mr-2 size-5" />
            Confirm & collect payment
          </Button>
          <p className="text-center text-xs text-muted-foreground">Demo — no real payment processed.</p>
        </div>
      </div>
    </>
  );
}

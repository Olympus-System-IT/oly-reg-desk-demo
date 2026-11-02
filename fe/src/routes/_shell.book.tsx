"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Search, ArrowRight, CheckCircle2, CreditCard, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, Empty, Panel, NativeSelect, Field } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mutate, useDB } from "@/lib/hms/store";
import { sessionBookable, sessionBooked, money, invoiceTotals, patientAge, fmtDate, sessionLabel, hasActiveBooking } from "@/lib/hms/logic";
import type { Appointment, Patient, Session, PayMethod } from "@/lib/hms/types";
import { can } from "@/lib/hms/permissions";
import { useCurrentUser } from "@/lib/hms/store";

export const Route = createFileRoute("/_shell/book")({
  head: () => ({ meta: [{ title: "New Booking — Hospital Management System" }] }),
  component: () => <Guard perm="bookings.manage" what="new bookings"><Book /></Guard>,
});

type Step = 1 | 2 | 3 | 4;

const patientSchema = z.object({
  name: z.string().trim().min(2, "Name required"),
  mobile: z.string().trim().regex(/^(07[0-9]{8})?$/, "Valid mobile or leave blank").optional().or(z.literal("")),
  smsConsent: z.boolean(),
});

function Book() {
  const db = useDB();
  const user = useCurrentUser();
  const canCollect = can(user, "billing.collect");

  const [step, setStep] = useState<Step>(1);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [newPatientMode, setNewPatientMode] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [source, setSource] = useState<"Telephone" | "Walk-in">("Walk-in");
  const [payNow, setPayNow] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("Cash");
  const [payRef, setPayRef] = useState("");
  const [cashReceived, setCashReceived] = useState<number | "">(0);
  const [completedRef, setCompletedRef] = useState<{ ref: string; queue: number; invNo?: string; receipt?: string } | null>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: { name: "", mobile: "", smsConsent: true },
  });

  const q = patientSearch.toLowerCase().trim();
  const matchedPatients = !q ? [] : db.patients.filter(p =>
    p.name.toLowerCase().includes(q) || p.code.includes(q) || p.mobile.includes(q)
  ).slice(0, 8);

  const upcomingSessions = db.sessions
    .filter(s => s.date >= format(new Date(), "yyyy-MM-dd") && s.status !== "Cancelled" && s.status !== "Completed")
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  const confirmBooking = () => {
    if (!selectedPatient || !selectedSession) return;

    // Idempotency check
    if (hasActiveBooking(db, selectedPatient.id, selectedSession.id)) {
      toast.error("This patient already has an active booking for this session");
      return;
    }
    const bookable = sessionBookable(db, selectedSession);
    if (!bookable.ok) { toast.error(bookable.reason); return; }

    const doc = db.doctors.find(d => d.id === selectedSession.doctorId)!;
    const consultFee = doc.fee;
    const invTotal = consultFee;
    const net = invTotal;

    mutate((d) => {
      const ses = d.sessions.find(s => s.id === selectedSession.id)!;
      const queueNo = ses.nextQueue++;

      const now = new Date().toISOString();
      const dateStr = format(new Date(), "yyMMdd");
      const aIdx = (d.counters.appt = (d.counters.appt ?? 0) + 1);
      const ref = `BK-${dateStr}-${String(aIdx).padStart(4, "0")}`;

      const appt: Appointment = {
        id: `a${Date.now()}`,
        ref,
        patientId: selectedPatient.id,
        sessionId: ses.id,
        queueNo,
        source,
        status: "Booked",
        message: selectedPatient.smsConsent ? "Sent" : "Opted out",
        createdAt: now,
      };
      d.appointments.push(appt);

      if (payNow) {
        const invIdx = (d.counters.invoice = (d.counters.invoice ?? 0) + 1);
        const rcptIdx = (d.counters.receipt = (d.counters.receipt ?? 0) + 1);
        const invNo = `${d.settings.invoicePrefix}-${String(invIdx).padStart(6, "0")}`;
        const rcptNo = `${d.settings.receiptPrefix}-${String(rcptIdx).padStart(6, "0")}`;
        const invId = `i${Date.now()}`;

        const inv = {
          id: invId,
          no: invNo,
          patientId: selectedPatient.id,
          appointmentId: appt.id,
          lines: [{ serviceId: "sv1", name: `Consultation — ${doc.name}`, category: "Consultation", qty: 1, unitPrice: consultFee, doctorId: doc.id }],
          discount: 0,
          payments: [{ id: `pay${Date.now()}`, receiptNo: rcptNo, amount: net, method: payMethod, date: now, reference: payRef || undefined, by: d.users.find(u => u.id === d.auth.userId)?.name ?? "Staff" }],
          refunds: [],
          createdAt: now,
          createdBy: d.users.find(u => u.id === d.auth.userId)?.name ?? "Staff",
        };
        d.invoices.push(inv);
        appt.invoiceId = invId;
        setCompletedRef({ ref, queue: queueNo, invNo, receipt: rcptNo });
      } else {
        setCompletedRef({ ref, queue: queueNo });
      }
    });

    setStep(4);
  };

  const handleNewPatient = (v: z.infer<typeof patientSchema>) => {
    mutate((d) => {
      const idx = (d.counters.patient = (d.counters.patient ?? 0) + 1);
      const id = `p${Date.now()}`;
      const p: Patient = {
        id, code: `PT-${String(idx).padStart(6, "0")}`,
        name: v.name.trim(), mobile: v.mobile?.trim() ?? "",
        smsConsent: v.smsConsent, createdAt: new Date().toISOString().slice(0, 10),
      };
      d.patients.push(p);
      setSelectedPatient(p);
    });
    setNewPatientMode(false);
    setStep(2);
  };

  const restart = () => {
    setStep(1);
    setSelectedPatient(null);
    setSelectedSession(null);
    setPatientSearch("");
    setNewPatientMode(false);
    setPayNow(false);
    setCompletedRef(null);
    reset();
  };

  return (
    <>
      <PageHeader title="New Booking" description="Book a patient into a doctor session." />

      {/* Step indicator */}
      {step < 4 && (
        <ol className="mb-6 flex gap-3 text-sm">
          {(["1. Patient", "2. Session", "3. Review"] as const).map((label, i) => {
            const s = (i + 1) as 1 | 2 | 3;
            return (
              <li key={s} className={`flex items-center gap-1.5 ${step === s ? "text-primary font-semibold" : step > s ? "text-success" : "text-muted-foreground"}`}>
                {step > s ? <CheckCircle2 className="size-4 text-success" /> : <span className="size-5 flex items-center justify-center rounded-full border text-xs font-medium">{s}</span>}
                {label}
                {s < 3 && <ArrowRight className="size-3" />}
              </li>
            );
          })}
        </ol>
      )}

      {/* Step 1: Patient */}
      {step === 1 && (
        <div className="max-w-lg space-y-4">
          {!newPatientMode ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
                <Input
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  placeholder="Search patient by name, ID, or mobile…"
                  className="pl-9"
                  autoFocus
                  aria-label="Search patient"
                />
              </div>
              {matchedPatients.length > 0 && (
                <div className="rounded-lg border bg-card shadow-xs divide-y">
                  {matchedPatients.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedPatient(p); setStep(2); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <UserRound className="size-8 shrink-0 rounded-full bg-secondary p-1.5 text-secondary-foreground" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.code} · {p.mobile || "no mobile"} · {patientAge(p)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {patientSearch.length > 1 && matchedPatients.length === 0 && (
                <p className="text-sm text-muted-foreground">No patients found.</p>
              )}
              <Button variant="outline" onClick={() => setNewPatientMode(true)}>
                <Plus className="mr-2 size-4" />Register new patient
              </Button>
            </>
          ) : (
            <div className="rounded-lg border bg-card p-4 shadow-xs space-y-3">
              <h3 className="text-sm font-semibold">Quick patient registration</h3>
              <form onSubmit={handleSubmit(handleNewPatient)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Full name <span className="text-destructive">*</span></Label>
                  <Input {...register("name")} placeholder="First Last" autoFocus />
                  {errors.name && <p role="alert" className="text-xs text-destructive">{(errors.name as { message: string }).message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile</Label>
                  <Input {...register("mobile")} placeholder="07XXXXXXXX" />
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="sc" checked={watch("smsConsent")} onCheckedChange={v => setValue("smsConsent", v)} />
                  <Label htmlFor="sc">SMS consent</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setNewPatientMode(false)}>Cancel</Button>
                  <Button type="submit">Register & continue</Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Session */}
      {step === 2 && selectedPatient && (
        <div className="max-w-2xl space-y-4">
          <Panel title={`Patient: ${selectedPatient.name}`}>
            <div className="px-4 py-3 text-sm text-muted-foreground">{selectedPatient.code} · {selectedPatient.mobile || "no mobile"} · {patientAge(selectedPatient)}</div>
          </Panel>
          <div className="mb-3 flex gap-3">
            <NativeSelect value={source} onChange={e => setSource(e.target.value as typeof source)} aria-label="Booking source" className="w-40">
              <option>Walk-in</option>
              <option>Telephone</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            {upcomingSessions.map(ses => {
              const doc = db.doctors.find(d => d.id === ses.doctorId);
              const sp = db.specialties.find(s => s.id === doc?.specialtyId);
              const booked = sessionBooked(db, ses.id);
              const bookable = sessionBookable(db, ses);
              const alreadyBooked = hasActiveBooking(db, selectedPatient.id, ses.id);
              return (
                <button
                  key={ses.id}
                  type="button"
                  onClick={() => { if (bookable.ok && !alreadyBooked) { setSelectedSession(ses); setStep(3); } }}
                  disabled={!bookable.ok || alreadyBooked}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${bookable.ok && !alreadyBooked ? "hover:border-primary hover:bg-info-soft/20 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{doc?.name}</div>
                      <div className="text-xs text-muted-foreground">{sp?.name} · {fmtDate(ses.date)} · {ses.start}–{ses.end} · {ses.room}</div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={ses.status} />
                      <div className="mt-1 text-xs text-muted-foreground">{booked}/{ses.max} booked</div>
                      {alreadyBooked && <div className="text-xs text-warning">Already booked</div>}
                      {!bookable.ok && <div className="text-xs text-destructive">{bookable.reason}</div>}
                    </div>
                  </div>
                </button>
              );
            })}
            {upcomingSessions.length === 0 && <Empty title="No upcoming sessions available" />}
          </div>
          <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
        </div>
      )}

      {/* Step 3: Review & Payment */}
      {step === 3 && selectedPatient && selectedSession && (
        <div className="max-w-lg space-y-4">
          {(() => {
            const doc = db.doctors.find(d => d.id === selectedSession.doctorId)!;
            const sp = db.specialties.find(s => s.id === doc.specialtyId);
            const net = doc.fee;
            const change = payMethod === "Cash" && typeof cashReceived === "number" ? Math.max(0, cashReceived - net) : 0;
            return (
              <>
                <Panel title="Booking summary">
                  <dl className="divide-y px-4 py-2 text-sm">
                    {[
                      ["Patient", `${selectedPatient.name} (${selectedPatient.code})`],
                      ["Doctor", doc.name],
                      ["Specialty", sp?.name ?? "—"],
                      ["Date", fmtDate(selectedSession.date)],
                      ["Time", `${selectedSession.start}–${selectedSession.end}`],
                      ["Room", selectedSession.room],
                      ["Source", source],
                      ["Consultation fee", money(net)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-2 py-2">
                        <dt className="w-40 shrink-0 text-muted-foreground">{k}</dt>
                        <dd className="font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Panel>
                {canCollect && (
                  <Panel title="Payment">
                    <div className="px-4 py-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <Switch id="payNow" checked={payNow} onCheckedChange={setPayNow} />
                        <Label htmlFor="payNow">Collect payment now</Label>
                      </div>
                      {payNow && (
                        <>
                          <NativeSelect value={payMethod} onChange={e => setPayMethod(e.target.value as PayMethod)} aria-label="Payment method">
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="Bank transfer">Bank transfer</option>
                          </NativeSelect>
                          {(payMethod === "Card" || payMethod === "Bank transfer") && (
                            <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Reference / transaction ID" />
                          )}
                          {payMethod === "Cash" && (
                            <div className="flex items-center gap-2">
                              <Label className="w-28 shrink-0">Cash received</Label>
                              <Input type="number" min={net} value={cashReceived} onChange={e => setCashReceived(e.target.value === "" ? "" : Number(e.target.value))} className="w-32" />
                              {typeof cashReceived === "number" && cashReceived >= net && (
                                <span className="text-sm font-medium text-success">Change: {money(change)}</span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Panel>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
                  <Button onClick={confirmBooking} className="flex-1">
                    <CheckCircle2 className="mr-2 size-4" />
                    {payNow ? "Confirm & collect payment" : "Confirm booking (pay later)"}
                  </Button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && completedRef && (
        <div className="max-w-md mx-auto text-center space-y-5 py-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Booking confirmed</h2>
            <p className="mt-1 text-muted-foreground">Queue number assigned and SMS notification sent (simulated).</p>
          </div>
          <div className="rounded-lg border bg-card p-5 text-left space-y-3 text-sm">
            <div className="flex items-center gap-2.5 border-b pb-3">
              <div className="size-8 overflow-hidden rounded bg-white p-0.5 border border-border/60 shrink-0 flex items-center justify-center">
                <img src="/logo.png" alt="Olympus Lanka Hospital Logo" className="size-full object-contain" />
              </div>
              <div>
                <div className="font-bold text-xs text-foreground">Olympus Lanka Hospital</div>
                <div className="text-[10px] text-muted-foreground">Appointment Token Slip</div>
              </div>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Booking ref</span><span className="font-mono font-medium">{completedRef.ref}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Queue number</span><span className="text-2xl font-bold text-primary">#{completedRef.queue}</span></div>
            {completedRef.invNo && <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono">{completedRef.invNo}</span></div>}
            {completedRef.receipt && <div className="flex justify-between"><span className="text-muted-foreground">Receipt</span><span className="font-mono">{completedRef.receipt}</span></div>}
          </div>
          <p className="text-xs text-muted-foreground">Simulated SMS — no real message sent. Demo prototype only.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={restart}>New booking</Button>
            <Button onClick={() => window.print()}>Print slip</Button>
          </div>
        </div>
      )}
    </>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
    </svg>
  );
}

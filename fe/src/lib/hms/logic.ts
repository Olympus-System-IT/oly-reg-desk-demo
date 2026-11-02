import { differenceInYears, format, parseISO } from "date-fns";
import type { DB, Invoice, PaymentStatus, Session } from "./types";

export const todayStr = () => format(new Date(), "yyyy-MM-dd");

export function money(n: number, currency = "LKR") {
  return `${currency} ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function moneyNum(n: number) {
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function invoiceTotals(inv: Invoice, taxRate: number | null = null) {
  const subtotal = inv.lines.reduce((t, l) => t + l.qty * l.unitPrice, 0);
  const afterDiscount = Math.max(0, subtotal - inv.discount);
  const tax = taxRate ? Math.round(afterDiscount * taxRate) / 100 : 0;
  const total = afterDiscount + tax;
  const paid = inv.payments.reduce((t, p) => t + p.amount, 0);
  const refunded = inv.refunds.reduce((t, r) => t + r.amount, 0);
  const balance = inv.voided ? 0 : Math.max(0, total - paid);
  let status: PaymentStatus;
  if (inv.voided) status = "Voided";
  else if (refunded > 0 && refunded >= paid) status = "Refunded";
  else if (refunded > 0) status = "Partially Refunded";
  else if (paid <= 0) status = "Unpaid";
  else if (paid < total) status = "Partially Paid";
  else status = "Paid";
  return { subtotal, tax, total, paid, refunded, balance, net: paid - refunded, status };
}

export function patientAge(p: { dob?: string; approxAge?: number }) {
  if (p.dob) return `${differenceInYears(new Date(), new Date(p.dob))} y`;
  if (p.approxAge != null) return `~${p.approxAge} y (approx.)`;
  return "—";
}

export function sessionBooked(db: DB, sessionId: string) {
  return db.appointments.filter((a) => a.sessionId === sessionId && a.status !== "Cancelled").length;
}

export function sessionLabel(s: Session) {
  return `${format(new Date(s.date), "EEE d MMM")} · ${s.start}–${s.end}`;
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function findConflict(db: DB, cand: Omit<Session, "id" | "nextQueue" | "status"> & { id?: string }) {
  return db.sessions.find(
    (s) =>
      s.id !== cand.id &&
      s.status !== "Cancelled" &&
      s.date === cand.date &&
      (s.doctorId === cand.doctorId || s.room.trim().toLowerCase() === cand.room.trim().toLowerCase()) &&
      toMin(s.start) < toMin(cand.end) &&
      toMin(cand.start) < toMin(s.end),
  );
}

export function sessionBookable(db: DB, s: Session) {
  const booked = sessionBooked(db, s.id);
  const nowStr = format(new Date(), "yyyy-MM-dd HH:mm");
  if (s.status === "Cancelled" || s.status === "Completed") return { ok: false, reason: `Session ${s.status.toLowerCase()}` };
  if (`${s.date} ${s.end}` < nowStr) return { ok: false, reason: "Session has ended" };
  if (booked >= s.max) return { ok: false, reason: "Session full" };
  return { ok: true, reason: "" };
}

export function inRange(dateIso: string, from: string, to: string) {
  const d = dateIso.slice(0, 10);
  return d >= from && d <= to;
}

/** Compute P&L from raw DB data for a given date range */
export function computePnL(db: DB, from: string, to: string) {
  const relevantInvoices = db.invoices.filter(
    (inv) => !inv.voided && inRange(inv.createdAt, from, to)
  );

  let grossRevenue = 0;
  let discounts = 0;
  let cashCollected = 0;
  let refundsTotal = 0;
  let doctorFees = 0;
  let outstanding = 0;

  for (const inv of relevantInvoices) {
    const t = invoiceTotals(inv, db.settings.taxRate);
    grossRevenue += t.subtotal;
    discounts += inv.discount;
    cashCollected += t.paid;
    refundsTotal += t.refunded;
    outstanding += t.balance;
    // Doctor fees from consultation lines
    for (const line of inv.lines) {
      if (line.category === "Consultation" && line.doctorId) {
        const doc = db.doctors.find(d => d.id === line.doctorId);
        if (doc) {
          const payout = doc.payout;
          if (payout.type === "percent") doctorFees += Math.round(line.unitPrice * line.qty * payout.value / 100);
          else if (payout.type === "fixed") doctorFees += payout.value * line.qty;
        }
      }
    }
  }

  const expenses = db.expenses.filter(e => inRange(e.date, from, to));
  const opEx = expenses.reduce((s, e) => s + e.amount, 0);

  const netRevenue = grossRevenue - discounts - refundsTotal;
  const grossProfit = netRevenue - doctorFees;
  const netProfit = grossProfit - opEx;

  return {
    grossRevenue,
    discounts,
    refunds: refundsTotal,
    netRevenue,
    doctorFees,
    grossProfit,
    opEx,
    netProfit,
    cashCollected,
    outstanding,
    invoiceCount: relevantInvoices.length,
    expenseCount: expenses.length,
  };
}

/** Daily revenue time series for charts */
export function dailyRevenueSeries(db: DB, from: string, to: string) {
  const map = new Map<string, { billed: number; collected: number }>();
  for (const inv of db.invoices) {
    const d = inv.createdAt.slice(0, 10);
    if (!inRange(d, from, to)) continue;
    if (!map.has(d)) map.set(d, { billed: 0, collected: 0 });
    const entry = map.get(d)!;
    const t = invoiceTotals(inv, db.settings.taxRate);
    entry.billed += t.total;
    entry.collected += t.paid;
  }
  // Fill in zeros for days without data
  const result: { date: string; billed: number; collected: number }[] = [];
  let cur = from;
  while (cur <= to) {
    const v = map.get(cur) ?? { billed: 0, collected: 0 };
    result.push({ date: cur, billed: v.billed, collected: v.collected });
    cur = format(parseISO(cur).getTime() + 86400000, "yyyy-MM-dd");
  }
  return result;
}

/** Count appointments by status for a date range */
export function appointmentStatusCounts(db: DB, from: string, to: string) {
  const counts: Record<string, number> = {};
  for (const a of db.appointments) {
    const ses = db.sessions.find(s => s.id === a.sessionId);
    if (!ses || !inRange(ses.date, from, to)) continue;
    counts[a.status] = (counts[a.status] ?? 0) + 1;
  }
  return counts;
}

/** Revenue breakdown by service category */
export function revenueByCategory(db: DB, from: string, to: string) {
  const map = new Map<string, number>();
  for (const inv of db.invoices) {
    if (inv.voided || !inRange(inv.createdAt, from, to)) continue;
    for (const line of inv.lines) {
      const val = (map.get(line.category) ?? 0) + line.qty * line.unitPrice;
      map.set(line.category, val);
    }
  }
  return Array.from(map.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

/** Derive doctor payout amount */
export function doctorPayout(db: DB, doctorId: string, from: string, to: string) {
  let total = 0;
  const doc = db.doctors.find(d => d.id === doctorId);
  if (!doc) return 0;
  for (const inv of db.invoices) {
    if (inv.voided || !inRange(inv.createdAt, from, to)) continue;
    for (const line of inv.lines) {
      if (line.doctorId !== doctorId) continue;
      if (doc.payout.type === "percent") total += Math.round(line.unitPrice * line.qty * doc.payout.value / 100);
      else if (doc.payout.type === "fixed") total += doc.payout.value * line.qty;
    }
  }
  return total;
}

/** Format an ISO date string to a human-readable date-time */
export function fmtDateTime(iso: string) {
  return format(new Date(iso), "d MMM yyyy, HH:mm");
}

/** Format an ISO date string to a short date */
export function fmtDate(iso: string) {
  return format(new Date(iso), "d MMM yyyy");
}

/** Generate an idempotency key for booking (patientId + sessionId) */
export function bookingKey(patientId: string, sessionId: string) {
  return `${patientId}::${sessionId}`;
}

/** Check if a patient already has an active booking in a session */
export function hasActiveBooking(db: DB, patientId: string, sessionId: string) {
  return db.appointments.some(
    a => a.patientId === patientId && a.sessionId === sessionId && a.status !== "Cancelled"
  );
}

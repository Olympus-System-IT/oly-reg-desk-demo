import { format, addDays, parseISO } from "date-fns";
import type { DB, Doctor, InvoiceLine } from "@/lib/hms/types";
import { inRange, invoiceTotals } from "@/lib/hms/logic";

export interface DoctorAnalyticsFilters {
  dateFrom: string;
  dateTo: string;
  /** "all" or a doctor id */
  doctorId: string;
  /** "all" or a specialty id */
  specialtyId: string;
}

export interface DoctorRow {
  doctorId: string;
  name: string;
  specialty: string;
  sessions: number;
  capacity: number;
  /** Non-cancelled bookings */
  booked: number;
  completed: number;
  waiting: number; // Booked / Checked In / Waiting / In Consultation
  cancelled: number;
  noShow: number;
  total: number;
  /** Unique patients with a completed consultation */
  patientsSeen: number;
  completionRate: number; // % of total
  utilisation: number; // % of capacity
  income: number; // net of prorated refunds
  payout: number;
  hospitalShare: number;
  avgIncomePerPatient: number;
}

export interface DoctorTrendPoint {
  date: string;
  /** Total income for the selection */
  income: number;
  /** Patients seen (completed) for the selection */
  patients: number;
}

export interface DoctorSummary {
  totalIncome: number;
  patientsSeen: number;
  avgIncomePerPatient: number;
  completionRate: number;
  utilisation: number;
  topDoctor: string | null;
}

const WAITING = new Set(["Booked", "Checked In", "Waiting", "In Consultation"]);

function selectedDoctors(db: DB, f: DoctorAnalyticsFilters): Doctor[] {
  return db.doctors.filter(
    (d) =>
      (f.doctorId === "all" || d.id === f.doctorId) &&
      (f.specialtyId === "all" || d.specialtyId === f.specialtyId),
  );
}

function linePayout(doc: Doctor, line: InvoiceLine, share: number) {
  if (doc.payout.type === "percent") return Math.round((line.unitPrice * line.qty * doc.payout.value * share) / 100);
  if (doc.payout.type === "fixed") return Math.round(doc.payout.value * line.qty * share);
  return 0;
}

/** Per-doctor income: doctor-attributed invoice lines on non-voided invoices, net of prorated refunds. */
function incomeByDoctor(db: DB, f: DoctorAnalyticsFilters) {
  const income = new Map<string, number>();
  const payout = new Map<string, number>();
  const daily = new Map<string, number>();
  const docById = new Map(db.doctors.map((d) => [d.id, d]));

  for (const inv of db.invoices) {
    if (inv.voided) continue;
    const day = inv.createdAt.slice(0, 10);
    if (!inRange(day, f.dateFrom, f.dateTo)) continue;
    const t = invoiceTotals(inv);
    // Fraction of the invoice that stays as income after refunds
    const keep = t.paid > 0 ? Math.max(0, 1 - t.refunded / t.paid) : 1;
    for (const line of inv.lines) {
      if (!line.doctorId) continue;
      const doc = docById.get(line.doctorId);
      if (!doc) continue;
      const amount = Math.round(line.qty * line.unitPrice * keep);
      income.set(doc.id, (income.get(doc.id) ?? 0) + amount);
      payout.set(doc.id, (payout.get(doc.id) ?? 0) + linePayout(doc, line, keep));
      daily.set(`${doc.id}|${day}`, (daily.get(`${doc.id}|${day}`) ?? 0) + amount);
    }
  }
  return { income, payout, daily };
}

export function getDoctorRows(db: DB, f: DoctorAnalyticsFilters): DoctorRow[] {
  const docs = selectedDoctors(db, f);
  const sessionById = new Map(db.sessions.map((s) => [s.id, s]));
  const specName = new Map(db.specialties.map((s) => [s.id, s.name]));
  const { income, payout } = incomeByDoctor(db, f);

  const rows: DoctorRow[] = docs.map((doc) => {
    const sessions = db.sessions.filter(
      (s) => s.doctorId === doc.id && s.status !== "Cancelled" && inRange(s.date, f.dateFrom, f.dateTo),
    );
    const capacity = sessions.reduce((t, s) => t + s.max, 0);

    let completed = 0, waiting = 0, cancelled = 0, noShow = 0, total = 0;
    const seen = new Set<string>();
    for (const a of db.appointments) {
      const ses = sessionById.get(a.sessionId);
      if (!ses || ses.doctorId !== doc.id || !inRange(ses.date, f.dateFrom, f.dateTo)) continue;
      total++;
      if (a.status === "Completed") { completed++; seen.add(a.patientId); }
      else if (a.status === "Cancelled") cancelled++;
      else if (a.status === "No-show") noShow++;
      else if (WAITING.has(a.status)) waiting++;
    }
    const booked = total - cancelled;
    const inc = income.get(doc.id) ?? 0;
    const pay = payout.get(doc.id) ?? 0;
    return {
      doctorId: doc.id,
      name: doc.name,
      specialty: specName.get(doc.specialtyId) ?? "—",
      sessions: sessions.length,
      capacity,
      booked,
      completed,
      waiting,
      cancelled,
      noShow,
      total,
      patientsSeen: seen.size,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      utilisation: capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0,
      income: inc,
      payout: pay,
      hospitalShare: inc - pay,
      avgIncomePerPatient: completed > 0 ? Math.round(inc / completed) : 0,
    };
  });

  // Hide doctors with no activity in the period when viewing all
  return rows
    .filter((r) => f.doctorId !== "all" || r.total > 0 || r.income > 0 || r.sessions > 0)
    .sort((a, b) => b.income - a.income);
}

export function getDoctorSummary(rows: DoctorRow[]): DoctorSummary {
  const totalIncome = rows.reduce((t, r) => t + r.income, 0);
  const completed = rows.reduce((t, r) => t + r.completed, 0);
  const total = rows.reduce((t, r) => t + r.total, 0);
  const capacity = rows.reduce((t, r) => t + r.capacity, 0);
  const booked = rows.reduce((t, r) => t + r.booked, 0);
  return {
    totalIncome,
    patientsSeen: rows.reduce((t, r) => t + r.patientsSeen, 0),
    avgIncomePerPatient: completed > 0 ? Math.round(totalIncome / completed) : 0,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    utilisation: capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0,
    topDoctor: rows.length > 0 && rows[0].income > 0 ? rows[0].name : null,
  };
}

/** Daily income + patients seen for the selected doctors (zero-filled). */
export function getDoctorTrend(db: DB, f: DoctorAnalyticsFilters): DoctorTrendPoint[] {
  const ids = new Set(selectedDoctors(db, f).map((d) => d.id));
  const { daily } = incomeByDoctor(db, f);
  const sessionById = new Map(db.sessions.map((s) => [s.id, s]));

  const incomeDay = new Map<string, number>();
  for (const [key, amt] of daily) {
    const [id, day] = key.split("|");
    if (ids.has(id)) incomeDay.set(day, (incomeDay.get(day) ?? 0) + amt);
  }
  const patientsDay = new Map<string, number>();
  for (const a of db.appointments) {
    if (a.status !== "Completed") continue;
    const ses = sessionById.get(a.sessionId);
    if (!ses || !ids.has(ses.doctorId) || !inRange(ses.date, f.dateFrom, f.dateTo)) continue;
    patientsDay.set(ses.date, (patientsDay.get(ses.date) ?? 0) + 1);
  }

  const out: DoctorTrendPoint[] = [];
  let cur = f.dateFrom;
  while (cur <= f.dateTo) {
    out.push({
      date: format(parseISO(cur), "dd MMM"),
      income: incomeDay.get(cur) ?? 0,
      patients: patientsDay.get(cur) ?? 0,
    });
    cur = format(addDays(parseISO(cur), 1), "yyyy-MM-dd");
  }
  return out;
}

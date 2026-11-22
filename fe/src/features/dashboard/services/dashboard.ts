import { format, addDays, parseISO, differenceInDays } from "date-fns";
import type { DB, Role } from "@/lib/hms/types";
import { invoiceTotals, money, todayStr, inRange, sessionBooked } from "@/lib/hms/logic";
import type {
  DashboardFilters,
  KpiMetric,
  CollectionsTrendPoint,
  AppointmentVolumePoint,
  CategoryRevenuePoint,
} from "../types";
import { ACCOUNTING_BASIS_NOTE } from "../constants";

function shiftDate(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr), days), "yyyy-MM-dd");
}

/** 1. Exactly 5 Summary KPI Metrics */
export function getDashboardSummary(db: DB, filters: DashboardFilters, role: Role): KpiMetric[] {
  const t = todayStr();
  const daysDiff = Math.max(1, differenceInDays(parseISO(filters.dateTo), parseISO(filters.dateFrom)) + 1);
  const prevFrom = shiftDate(filters.dateFrom, -daysDiff);
  const prevTo = shiftDate(filters.dateFrom, -1);

  // 1. Today's Appointments
  const todaySessions = db.sessions.filter((s) => s.date === t);
  const todaySessionIds = new Set(todaySessions.map((s) => s.id));
  const todayAppts = db.appointments.filter((a) => todaySessionIds.has(a.sessionId));
  const todayBookedCount = todayAppts.length;

  const yesterdayDate = shiftDate(t, -1);
  const yesterdaySessionIds = new Set(db.sessions.filter((s) => s.date === yesterdayDate).map((s) => s.id));
  const yesterdayApptsCount = db.appointments.filter((a) => yesterdaySessionIds.has(a.sessionId)).length;
  const apptDelta = yesterdayApptsCount > 0
    ? Math.round(((todayBookedCount - yesterdayApptsCount) / yesterdayApptsCount) * 100)
    : 0;

  // 2. Cancelled Appointments (Today)
  const cancelledCount = todayAppts.filter((a) => a.status === "Cancelled").length;
  const cancelledPct = todayBookedCount > 0 ? Math.round((cancelledCount / todayBookedCount) * 100) : 0;

  // 3. Available Doctors (on duty today)
  const docsOnDuty = new Set(todaySessions.map((s) => s.doctorId)).size;

  // 4. Net Collections in period (Cash collected less refunds)
  let curCollected = 0;
  let curRefunds = 0;
  let curBilled = 0;
  let prevCollected = 0;
  let prevRefunds = 0;

  for (const inv of db.invoices) {
    if (inv.voided) continue;
    if (inRange(inv.createdAt, filters.dateFrom, filters.dateTo)) {
      curBilled += invoiceTotals(inv, db.settings.taxRate).total;
    }
    for (const p of inv.payments) {
      if (inRange(p.date, filters.dateFrom, filters.dateTo)) curCollected += p.amount;
      if (inRange(p.date, prevFrom, prevTo)) prevCollected += p.amount;
    }
    for (const r of inv.refunds) {
      if (inRange(r.date, filters.dateFrom, filters.dateTo)) curRefunds += r.amount;
      if (inRange(r.date, prevFrom, prevTo)) prevRefunds += r.amount;
    }
  }
  const curNetCollections = curCollected - curRefunds;
  const prevNetCollections = prevCollected - prevRefunds;
  const collectionsDelta = prevNetCollections > 0
    ? Math.round(((curNetCollections - prevNetCollections) / prevNetCollections) * 100)
    : 0;

  // 5. Total Outstanding Balance
  let totalOutstanding = 0;
  let unpaidCount = 0;
  for (const inv of db.invoices) {
    if (inv.voided) continue;
    const balance = invoiceTotals(inv, db.settings.taxRate).balance;
    if (balance > 0) {
      totalOutstanding += balance;
      unpaidCount++;
    }
  }

  const isNurse = role === "nurse";

  const metrics: KpiMetric[] = [
    {
      id: "today-appts",
      label: "Today's Appointments",
      value: todayBookedCount,
      formattedValue: todayBookedCount.toString(),
      deltaPercent: apptDelta,
      deltaText: `${apptDelta >= 0 ? "+" : ""}${apptDelta}% vs yesterday`,
      isPositiveDeltaGood: true,
      href: "/appointments",
      tone: "blue",
    },
    {
      id: "cancelled-today",
      label: "Cancelled Appointments (Today)",
      value: cancelledCount,
      formattedValue: cancelledCount.toString(),
      deltaText: cancelledCount > 0 ? `${cancelledPct}% of today's bookings` : "No cancellations today",
      isPositiveDeltaGood: false,
      href: "/appointments",
      tone: cancelledCount > 0 ? "red" : "green",
    },
    {
      id: "doctors-available",
      label: "Available Doctors",
      value: docsOnDuty,
      formattedValue: `${docsOnDuty} on duty`,
      deltaText: `${todaySessions.length} active sessions today`,
      isPositiveDeltaGood: true,
      href: "/sessions",
      tone: "blue",
    },
  ];

  // Financial KPIs only shown for non-nurse roles
  if (!isNurse) {
    metrics.push(
      {
        id: "net-collections",
        label: "Net Collections",
        value: curNetCollections,
        formattedValue: money(curNetCollections),
        deltaPercent: collectionsDelta,
        deltaText: `${collectionsDelta >= 0 ? "+" : ""}${collectionsDelta}% vs prev period`,
        isPositiveDeltaGood: true,
        href: "/reports",
        basisTooltip: `${ACCOUNTING_BASIS_NOTE} (Collected: ${money(curCollected)}, Refunds: ${money(curRefunds)}, Billed: ${money(curBilled)})`,
        subText: `Cash: ${money(curCollected)} · Refunds: ${money(curRefunds)}`,
        tone: "green",
      },
      {
        id: "outstanding-balance",
        label: "Outstanding Balance",
        value: totalOutstanding,
        formattedValue: money(totalOutstanding),
        deltaText: `${unpaidCount} unpaid/partially paid invoices`,
        isPositiveDeltaGood: false,
        href: "/invoices",
        basisTooltip: "Sum of unpaid balances across non-voided invoices",
        subText: `${unpaidCount} invoices pending payment`,
        tone: totalOutstanding > 50000 ? "amber" : "gray",
      }
    );
  }

  return metrics;
}

/** 2. Daily Net Collections Trend (Area Chart) */
export function getCollectionsTrend(db: DB, filters: DashboardFilters): CollectionsTrendPoint[] {
  const map = new Map<string, { netCollections: number; billed: number; collected: number; refunds: number }>();

  for (const inv of db.invoices) {
    if (inv.voided) continue;
    const invDate = inv.createdAt.slice(0, 10);
    if (inRange(invDate, filters.dateFrom, filters.dateTo)) {
      if (!map.has(invDate)) map.set(invDate, { netCollections: 0, billed: 0, collected: 0, refunds: 0 });
      map.get(invDate)!.billed += invoiceTotals(inv, db.settings.taxRate).total;
    }

    for (const p of inv.payments) {
      const d = p.date.slice(0, 10);
      if (inRange(d, filters.dateFrom, filters.dateTo)) {
        if (!map.has(d)) map.set(d, { netCollections: 0, billed: 0, collected: 0, refunds: 0 });
        const item = map.get(d)!;
        item.collected += p.amount;
        item.netCollections += p.amount;
      }
    }

    for (const r of inv.refunds) {
      const d = r.date.slice(0, 10);
      if (inRange(d, filters.dateFrom, filters.dateTo)) {
        if (!map.has(d)) map.set(d, { netCollections: 0, billed: 0, collected: 0, refunds: 0 });
        const item = map.get(d)!;
        item.refunds += r.amount;
        item.netCollections -= r.amount;
      }
    }
  }

  const result: CollectionsTrendPoint[] = [];
  let cur = filters.dateFrom;

  while (cur <= filters.dateTo) {
    const v = map.get(cur) ?? { netCollections: 0, billed: 0, collected: 0, refunds: 0 };
    result.push({
      date: format(parseISO(cur), "dd MMM"),
      netCollections: Math.max(0, v.netCollections),
      billed: v.billed,
      collected: v.collected,
      refunds: v.refunds,
    });
    cur = shiftDate(cur, 1);
  }

  return result;
}

/** 3. Appointment Volume by Status */
export function getAppointmentVolume(db: DB, filters: DashboardFilters): AppointmentVolumePoint[] {
  const map = new Map<string, { completed: number; waiting: number; cancelled: number; noShow: number }>();

  for (const a of db.appointments) {
    const ses = db.sessions.find((s) => s.id === a.sessionId);
    if (!ses || !inRange(ses.date, filters.dateFrom, filters.dateTo)) continue;

    const d = ses.date;
    if (!map.has(d)) {
      map.set(d, { completed: 0, waiting: 0, cancelled: 0, noShow: 0 });
    }
    const item = map.get(d)!;
    if (a.status === "Completed") item.completed++;
    else if (a.status === "Waiting" || a.status === "Checked In" || a.status === "Booked" || a.status === "In Consultation") item.waiting++;
    else if (a.status === "Cancelled") item.cancelled++;
    else if (a.status === "No-show") item.noShow++;
  }

  const result: AppointmentVolumePoint[] = [];
  let cur = filters.dateFrom;
  while (cur <= filters.dateTo) {
    const data = map.get(cur) ?? { completed: 0, waiting: 0, cancelled: 0, noShow: 0 };
    result.push({
      date: format(parseISO(cur), "dd MMM"),
      ...data,
      total: data.completed + data.waiting + data.cancelled + data.noShow,
    });
    cur = shiftDate(cur, 1);
  }

  return result;
}

/** 4. Revenue by Service Category (Donut) */
export function getRevenueByCategory(db: DB, filters: DashboardFilters): CategoryRevenuePoint[] {
  const map = new Map<string, number>();
  let grandTotal = 0;

  for (const inv of db.invoices) {
    if (inv.voided || !inRange(inv.createdAt, filters.dateFrom, filters.dateTo)) continue;
    for (const line of inv.lines) {
      const amt = line.qty * line.unitPrice;
      map.set(line.category, (map.get(line.category) ?? 0) + amt);
      grandTotal += amt;
    }
  }

  return Array.from(map.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** 5. Exactly 4 Operational Panels (max 5 rows each) */
export function getOperationalPanels(db: DB, role: Role) {
  const t = todayStr();

  // 1. Today's sessions (max 5)
  const todaySessions = db.sessions
    .filter((s) => s.date === t)
    .slice(0, 5)
    .map((s) => {
      const doc = db.doctors.find((d) => d.id === s.doctorId);
      const booked = sessionBooked(db, s.id);
      return {
        id: s.id,
        doctor: doc?.name ?? "Doctor",
        room: s.room,
        time: `${s.start}–${s.end}`,
        booked,
        max: s.max,
        status: s.status,
      };
    });

  // 2. Upcoming sessions (next 48h, max 5)
  const tomorrow = shiftDate(t, 1);
  const nextDay = shiftDate(t, 2);
  const upcomingSessions = db.sessions
    .filter((s) => s.date === tomorrow || s.date === nextDay)
    .slice(0, 5)
    .map((s) => {
      const doc = db.doctors.find((d) => d.id === s.doctorId);
      return {
        id: s.id,
        date: s.date,
        doctor: doc?.name ?? "Doctor",
        room: s.room,
        time: `${s.start}–${s.end}`,
        booked: sessionBooked(db, s.id),
        max: s.max,
      };
    });

  // 3. Recent payments (max 5)
  const recentPayments = db.invoices
    .filter((i) => !i.voided)
    .flatMap((i) => i.payments.map((p) => ({ ...p, invoiceNo: i.no })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // 4. Failed messages (max 5)
  const failedMessages = db.messages
    .filter((m) => m.status === "Failed")
    .slice(0, 5)
    .map((m) => {
      const pt = db.patients.find((p) => p.id === m.patientId);
      return {
        id: m.id,
        recipient: pt?.name ?? "Patient",
        mobile: pt?.mobile ?? "—",
        type: m.type,
        ts: m.ts,
      };
    });

  return {
    todaySessions,
    upcomingSessions,
    recentPayments,
    failedMessages,
  };
}

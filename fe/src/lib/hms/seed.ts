import { addDays, format, subYears } from "date-fns";
import type {
  Appointment, ApptStatus, AuditEntry, DB, Doctor, Expense,
  Invoice, InvoiceLine, Message, Patient, Payment, Service, Session, Specialty, User
} from "./types";

export const DB_VERSION = 5;

export function buildSeed(): DB {
  let s = 20261008;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const today = new Date();
  const day = (off: number) => format(addDays(today, off), "yyyy-MM-dd");
  const counters: Record<string, number> = {};
  const next = (k: string) => (counters[k] = (counters[k] ?? 0) + 1);
  const uid = (pref: string) => `${pref}${next(pref)}`;

  // ── Specialties ────────────────────────────────────────────────────────────
  const specialties: Specialty[] = [
    ["General Medicine", "Primary adult outpatient care", true],
    ["Cardiology", "Heart and circulatory conditions", true],
    ["Paediatrics", "Children and adolescents", true],
    ["Gynaecology", "Women's reproductive health", true],
    ["Dermatology", "Skin, hair and nail conditions", true],
    ["ENT", "Ear, nose and throat", false],
    ["Neurology", "Brain and nervous system disorders", true],
    ["Orthopaedics", "Musculoskeletal disorders and injuries", true],
    ["Ophthalmology", "Eye disorders and vision", true],
  ].map(([name, description, active], i) => ({
    id: `sp${i + 1}`,
    name: name as string,
    description: description as string,
    active: active as boolean,
  }));

  // ── Doctors ────────────────────────────────────────────────────────────────
  const docRaw: [string, string, number, string, boolean][] = [
    ["Dr. Nimal Perera",         "sp1", 2000, "MBBS, MD",              true],
    ["Dr. Shanika Fernando",     "sp2", 3500, "MBBS, MD (Cardiology)", true],
    ["Dr. Ruwan Jayasinghe",     "sp3", 2500, "MBBS, DCH, MD",         true],
    ["Dr. Dilani Wickramasinghe","sp4", 3000, "MBBS, MS (O&G)",        true],
    ["Dr. Kasun Herath",         "sp5", 2800, "MBBS, MD (Derm)",       true],
    ["Dr. Amaya Gunawardena",    "sp1", 1800, "MBBS",                  true],
    ["Dr. Pradeep Silva",        "sp2", 3800, "MBBS, MRCP",            true],
    ["Dr. Tharushi Bandara",     "sp3", 2400, "MBBS, DCH",             true],
    ["Dr. Roshan Aluthge",       "sp7", 4200, "MBBS, MD (Neuro)",      true],
    ["Dr. Indika Ranasinghe",    "sp8", 3600, "MBBS, MS (Ortho)",      true],
    ["Dr. Chamari Seneviratne",  "sp9", 2600, "MBBS, DO",              true],
    ["Dr. Prasad Mendis",        "sp1", 2200, "MBBS",                  false],
    ["Dr. Kavitha Wimalasiri",   "sp4", 3200, "MBBS, MS (O&G)",        true],
    ["Dr. Lasitha Goonasekara",  "sp6", 2800, "MBBS, MS (ENT)",        false],
  ];

  const doctors: Doctor[] = docRaw.map(([name, sp, fee, q, active], i) => ({
    id: `d${i + 1}`,
    code: `DR-${String(next("doctor")).padStart(4, "0")}`,
    name: name as string,
    specialtyId: sp as string,
    mobile: `07${int(0, 8)}${String(int(1000000, 9999999))}`,
    email: `${(name as string).split(" ")[1].toLowerCase()}@example-hospital.lk`,
    regNo: `SLMC ${int(10000, 39999)}`,
    qualifications: q as string,
    fee: fee as number,
    payout:
      i % 3 === 0
        ? { type: "percent" as const, value: 70 }
        : i % 3 === 1
          ? { type: "fixed" as const, value: Math.round((fee as number) * 0.75) }
          : { type: "none" as const },
    active: active as boolean,
  }));

  // ── Services ───────────────────────────────────────────────────────────────
  const svcRaw: [string, string, string, string | undefined, number, number | undefined][] = [
    ["CON-001", "Consultation",              "Consultation",        undefined,    0,    15],
    ["ECG-001", "ECG (12-lead)",             "Cardiac diagnostics", "ECG",        1500, 15],
    ["ECH-001", "ECHO (2D)",                 "Cardiac diagnostics", "Ultrasound", 6500, 30],
    ["ECH-002", "ECHO Stress Test",          "Cardiac diagnostics", "Ultrasound", 9500, 60],
    ["XR-001",  "X-ray Chest PA",            "Radiology",           "X-ray",      2200, 10],
    ["XR-002",  "X-ray Limb",                "Radiology",           "X-ray",      2400, 10],
    ["US-001",  "Ultrasound Abdomen",        "Radiology",           "Ultrasound", 4500, 20],
    ["US-002",  "Ultrasound Pelvis",         "Radiology",           "Ultrasound", 4800, 20],
    ["LAB-001", "Full Blood Count",          "Laboratory",          undefined,    900,  undefined],
    ["LAB-002", "Fasting Blood Sugar",       "Laboratory",          undefined,    450,  undefined],
    ["LAB-003", "Lipid Profile",             "Laboratory",          undefined,    2100, undefined],
    ["LAB-004", "Thyroid Function (TFT)",    "Laboratory",          undefined,    2800, undefined],
    ["LAB-005", "Urine Full Report",         "Laboratory",          undefined,    600,  undefined],
    ["LAB-006", "HbA1c",                    "Laboratory",          undefined,    1600, undefined],
    ["PHY-001", "Physiotherapy session",     "Physiotherapy",       undefined,    2500, 45],
    ["PHY-002", "Physiotherapy assessment",  "Physiotherapy",       undefined,    1500, 30],
    ["NEB-001", "Nebulization",              "Procedures",          undefined,    800,  20],
    ["DRS-001", "Dressing (small)",          "Procedures",          undefined,    600,  15],
    ["DRS-002", "Dressing (large)",          "Procedures",          undefined,    900,  20],
    ["INJ-001", "IV Cannulation",            "Procedures",          undefined,    700,  10],
  ];

  const sixtyAgo = format(addDays(today, -60), "yyyy-MM-dd");
  const services: Service[] = svcRaw.map(([code, name, category, modality, price, duration], i) => ({
    id: `sv${i + 1}`,
    code: code as string,
    name: name as string,
    category: category as string,
    modality: modality as string | undefined,
    price: price as number,
    duration: duration as number | undefined,
    description: code === "CON-001" ? "Uses the doctor's consultation fee" : undefined,
    active: i !== 13, // sv14 (ECH-002) inactive for demo
    history: [{ date: sixtyAgo, from: null, to: price as number, by: "System" }],
  }));
  // Price history on ECG
  services[1].history.push({ date: format(addDays(today, -20), "yyyy-MM-dd"), from: 1350, to: 1500, by: "Achala Admin" });
  services[1].history[0].to = 1350;
  // Price history on FBC
  services[8].history.push({ date: format(addDays(today, -10), "yyyy-MM-dd"), from: 800, to: 900, by: "Achala Admin" });
  services[8].history[0].to = 800;

  // ── Users ──────────────────────────────────────────────────────────────────
  const users: User[] = [
    { id: "u1", name: "Achala Admin",      username: "admin",      contact: "admin@example-hospital.lk", role: "admin",        active: true,  createdAt: day(-180) },
    { id: "u2", name: "Mahesh Manager",    username: "manager",    contact: "0771234567",                role: "manager",      active: true,  grantPL: false, createdAt: day(-150) },
    { id: "u3", name: "Rashmi Reception",  username: "reception",  contact: "0712345678",                role: "receptionist", active: true,  createdAt: day(-120) },
    { id: "u4", name: "Nadeesha Nurse",    username: "nurse",      contact: "0759876543",                role: "nurse",        active: true,  createdAt: day(-90) },
    { id: "u5", name: "Former Cashier",    username: "cashier.old",contact: "0700000000",                role: "receptionist", active: false, createdAt: day(-200), lastActive: day(-45) },
    { id: "u6", name: "Priya Manager2",   username: "manager2",   contact: "0776543210",                role: "manager",      active: true,  grantPL: true,  createdAt: day(-60) },
    { id: "u7", name: "Sampath Nurse2",   username: "nurse2",     contact: "0768765432",                role: "nurse",        active: true,  createdAt: day(-30) },
  ];

  // ── Patients ───────────────────────────────────────────────────────────────
  const first = [
    "Kamal","Sunil","Nadeesha","Tharindu","Ishara","Chamari","Lahiru","Sanduni","Ravindu","Hiruni",
    "Asanka","Malsha","Dinesh","Piumi","Gayan","Nethmi","Sajith","Kavindi","Roshan","Yashodha",
    "Chathura","Anushka","Buddhika","Madhavi","Thilini","Saman","Amara","Dulani","Nuwan","Sachith",
    "Roshani","Hasitha","Chaminda","Nirmali","Dilshan","Harshani","Rukshan","Priyantha","Shanuka","Dilrukshi",
  ];
  const last = [
    "Perera","Silva","Fernando","Jayawardena","Rathnayake","Dissanayake","Kumara","Wijesinghe",
    "Abeysekara","Senanayake","Karunaratne","Weerasinghe","Amarasinghe","Pathirana","Wickrama",
    "Bandara","Seneviratne","Ranaweera","Gunasekara","Mendis",
  ];
  const towns = [
    "Colombo 05","Nugegoda","Maharagama","Kottawa","Dehiwala","Battaramulla","Kelaniya","Moratuwa",
    "Homagama","Piliyandala","Kaduwela","Rajagiriya","Boralesgamuwa","Thalawathugoda","Kotikawatta",
  ];

  const patients: Patient[] = Array.from({ length: 80 }, (_, i) => {
    const age = int(1, 84);
    const approx = i % 9 === 0;
    return {
      id: `p${i + 1}`,
      code: `PT-${String(next("patient")).padStart(6, "0")}`,
      name: `${pick(first)} ${pick(last)}`,
      dob: approx ? undefined : format(addDays(subYears(today, age), -int(0, 300)), "yyyy-MM-dd"),
      approxAge: approx ? age : undefined,
      mobile: i % 7 === 3 && i > 3 ? "" : `07${int(0, 8)}${String(int(1000000, 9999999))}`,
      sex: pick(["Male", "Female"] as const),
      address: `${int(1, 250)}, ${pick(["Temple Rd", "Main St", "Lake Rd", "Park Ave", "Hospital Rd"])}, ${pick(towns)}`,
      guardian: age < 16 ? `Parent — 07${int(10000000, 89999999)}` : undefined,
      smsConsent: rnd() > 0.15,
      createdAt: day(-int(10, 300)),
    };
  });
  // Shared family mobile numbers (near-duplicates scenario)
  patients.forEach((p, i) => { if (!p.mobile) p.mobile = patients[i - 1].mobile; });
  // A few near-duplicate names for warning demo
  patients[60].name = patients[5].name + " (Jr)"; // similar name
  patients[70].mobile = patients[20].mobile; // shared family number

  // ── Sessions ───────────────────────────────────────────────────────────────
  const activeDoctors = doctors.filter(d => d.active);
  const sessions: Session[] = [];
  for (let off = -60; off <= 14; off++) {
    activeDoctors.forEach((d, i) => {
      if ((off + 60 + i) % 3 !== 0) return;
      const morning = i % 2 === 0;
      sessions.push({
        id: `s${next("session")}`,
        doctorId: d.id,
        date: day(off),
        start: morning ? "08:30" : "16:00",
        end: morning ? "11:30" : "19:00",
        room: `OPD-${(i % 5) + 1}`,
        max: pick([15, 20, 20, 25]),
        status: off < -1 ? "Completed" : off === 0 ? "Open" : "Scheduled",
        nextQueue: 1,
        seriesId: `ser-${d.id}-${morning ? "AM" : "PM"}`,
      });
    });
  }
  // One delayed today, one cancelled future, one cancelled in past
  const todays = sessions.filter((x) => x.date === day(0));
  if (todays[1]) todays[1].status = "Delayed";
  const futureSes = sessions.find(x => x.date === day(3) && x.status === "Scheduled");
  if (futureSes) futureSes.status = "Cancelled";
  const pastCancelled = sessions.find(x => x.date === day(-5) && x.status === "Completed");
  if (pastCancelled) pastCancelled.status = "Cancelled";

  // ── Appointments + Invoices ────────────────────────────────────────────────
  const appointments: Appointment[] = [];
  const invoices: Invoice[] = [];
  const staff = ["Rashmi Reception", "Achala Admin", "Priya Manager2"];

  for (const ses of sessions) {
    const off = Math.round((new Date(ses.date).getTime() - new Date(day(0)).getTime()) / 86400000);
    const n = off < 0 ? int(3, 10) : off === 0 ? int(4, 8) : int(0, 5);
    const doc = doctors.find((d) => d.id === ses.doctorId)!;
    const used = new Set<string>();

    for (let k = 0; k < n; k++) {
      let p = pick(patients);
      let tries = 0;
      while (used.has(p.id) && tries < 20) { p = pick(patients); tries++; }
      used.add(p.id);

      let status: ApptStatus = "Booked";
      const r = rnd();
      if (off < 0) status = r < 0.78 ? "Completed" : r < 0.90 ? "No-show" : "Cancelled";
      if (off === 0) status = k < 2 ? "Completed" : k === 2 ? "In Consultation" : r < 0.35 ? "Waiting" : r < 0.55 ? "Checked In" : "Booked";
      if (off > 0 && r < 0.08) status = "Cancelled";

      const created = format(addDays(new Date(ses.date), -int(0, 4)), "yyyy-MM-dd") + `T0${int(7, 9)}:${int(10, 59)}:00`;
      const msgStatus = ses.status === "Cancelled" ? "Not sent" as const :
        !p.smsConsent ? "Opted out" as const :
        rnd() < 0.08 ? "Failed" as const :
        rnd() < 0.5 ? "Delivered" as const : "Sent" as const;

      const a: Appointment = {
        id: `a${next("appt")}`,
        ref: `BK-${format(new Date(ses.date), "yyMMdd")}-${String(counters.appt).padStart(4, "0")}`,
        patientId: p.id,
        sessionId: ses.id,
        queueNo: ses.nextQueue++,
        source: rnd() < 0.55 ? "Telephone" : "Walk-in",
        status,
        message: msgStatus,
        createdAt: created,
        cancelReason: status === "Cancelled" ? pick(["Patient request", "Doctor unavailable", "Emergency", "Rescheduled"]) : undefined,
      };
      appointments.push(a);

      const billed = off <= 0 ? status !== "No-show" : rnd() < 0.30 && status !== "Cancelled";
      if (!billed) continue;

      const lines: InvoiceLine[] = [{ serviceId: "sv1", name: `Consultation — ${doc.name}`, category: "Consultation", qty: 1, unitPrice: doc.fee, doctorId: doc.id }];
      if (rnd() < 0.40) {
        const sv = pick(services.slice(1).filter(sv => sv.active));
        lines.push({ serviceId: sv.id, name: sv.name, category: sv.category, qty: 1, unitPrice: sv.price });
      }
      if (rnd() < 0.15) {
        const sv = pick(services.slice(7).filter(sv => sv.active));
        lines.push({ serviceId: sv.id, name: sv.name, category: sv.category, qty: 1, unitPrice: sv.price });
      }

      const total = lines.reduce((t, l) => t + l.qty * l.unitPrice, 0);
      const discount = rnd() < 0.08 ? pick([200, 300, 500]) : 0;
      const payments: Payment[] = [];
      const refunds = [];

      const invId = `i${next("invoice")}`;
      const invNo = `INV-${String(counters.invoice).padStart(6, "0")}`;
      const net = total - discount;

      if (status === "Cancelled") {
        const rcptNo = `RCT-${String(next("receipt")).padStart(6, "0")}`;
        payments.push({ id: uid("pay"), receiptNo: rcptNo, amount: net, method: "Cash", date: created, by: pick(staff) });
        refunds.push({ id: uid("rf"), amount: net, reason: "Booking cancelled by patient", date: created, by: "Achala Admin", approvedBy: "Achala Admin" });
      } else if (off < 0) {
        const pr = rnd();
        if (pr < 0.78) {
          // Full payment
          const rcptNo = `RCT-${String(next("receipt")).padStart(6, "0")}`;
          payments.push({ id: uid("pay"), receiptNo: rcptNo, amount: net, method: pick(["Cash", "Cash", "Card", "Bank transfer"] as const), date: created, by: pick(staff) });
        } else if (pr < 0.88) {
          // Partial payment
          const partial = Math.round(net / 2);
          const rcptNo = `RCT-${String(next("receipt")).padStart(6, "0")}`;
          payments.push({ id: uid("pay"), receiptNo: rcptNo, amount: partial, method: "Cash", date: created, by: pick(staff) });
        }
        // else: unpaid (older visits that never paid)
      } else {
        // Today or future
        const pr = rnd();
        if (pr < 0.60) {
          const rcptNo = `RCT-${String(next("receipt")).padStart(6, "0")}`;
          payments.push({ id: uid("pay"), receiptNo: rcptNo, amount: net, method: pick(["Cash", "Cash", "Card"] as const), date: created, by: pick(staff) });
        } else if (pr < 0.80) {
          const partial = Math.round(net * 0.5);
          const rcptNo = `RCT-${String(next("receipt")).padStart(6, "0")}`;
          payments.push({ id: uid("pay"), receiptNo: rcptNo, amount: partial, method: "Cash", date: created, by: pick(staff) });
        }
        // else: unpaid
      }

      // Random refund on some paid invoices
      if (payments.length > 0 && refunds.length === 0 && rnd() < 0.04 && off < -5) {
        const refAmt = Math.round(payments[0].amount * 0.5);
        refunds.push({ id: uid("rf"), amount: refAmt, reason: pick(["Service not rendered", "Overcharged", "Patient request"]), date: day(off + 1), by: "Achala Admin", approvedBy: "Achala Admin" });
      }

      const inv: Invoice = {
        id: invId,
        no: invNo,
        patientId: p.id,
        appointmentId: a.id,
        lines,
        discount,
        payments,
        refunds,
        createdAt: created,
        createdBy: pick(staff),
      };

      // Void a very small number
      if (rnd() < 0.02 && off < -10 && payments.length === 0) {
        inv.voided = { reason: "Duplicate entry", by: "Achala Admin", date: day(off + 1) };
      }

      a.invoiceId = invId;
      invoices.push(inv);
    }
  }

  // ── Expenses ───────────────────────────────────────────────────────────────
  const expCats = ["Utilities", "Medical supplies", "Salaries", "Maintenance", "Cleaning", "Stationery", "Rent", "Equipment"];
  const expenses: Expense[] = [];
  for (let off = -60; off <= 0; off += 2) {
    const c = pick(expCats);
    expenses.push({
      id: uid("expense"),
      date: day(off),
      category: c,
      description: `${c} — ${pick(["monthly", "weekly", "ad hoc", "vendor invoice", "purchase order"])}`,
      amount: c === "Salaries" ? int(80, 160) * 1000 : c === "Rent" ? 150000 : int(3, 40) * 500,
      method: pick(["Cash", "Bank transfer"] as const),
      reference: rnd() < 0.5 ? `REF-${int(10000, 99999)}` : undefined,
      by: pick(["Mahesh Manager", "Achala Admin", "Priya Manager2"]),
    });
  }

  // ── Messages ───────────────────────────────────────────────────────────────
  const messages: Message[] = [];
  for (const a of appointments.slice(0, 120)) {
    if (a.message === "Opted out" || a.message === "Not sent") continue;
    const p = patients.find(x => x.id === a.patientId)!;
    const ses = sessions.find(x => x.id === a.sessionId)!;
    const doc = doctors.find(d => d.id === ses?.doctorId);
    if (!ses || !doc) continue;
    messages.push({
      id: uid("msg"),
      ts: a.createdAt,
      patientId: a.patientId,
      appointmentId: a.id,
      type: "booking_confirm",
      text: `Dear ${p.name.split(" ")[0]}, your appointment with ${doc.name} on ${format(new Date(ses.date), "dd MMM yyyy")} at ${ses.start} (Room ${ses.room}) has been confirmed. Ref: ${a.ref}. [DEMO: no real SMS sent]`,
      status: a.message === "Failed" ? "Failed" : a.message === "Delivered" ? "Delivered" : "Sent",
      simulatedNote: "Simulated — no real SMS sent",
    });
  }

  // ── Audit Log ──────────────────────────────────────────────────────────────
  const auditLog: AuditEntry[] = [
    {
      id: uid("audit"), ts: format(addDays(today, -20), "yyyy-MM-dd") + "T10:30:00",
      userId: "u1", userName: "Achala Admin",
      action: "price_change", entity: "service", entityId: "sv2",
      detail: "ECG price changed from LKR 1,350 to LKR 1,500",
      oldValue: "1350", newValue: "1500",
    },
    {
      id: uid("audit"), ts: format(addDays(today, -10), "yyyy-MM-dd") + "T09:15:00",
      userId: "u1", userName: "Achala Admin",
      action: "price_change", entity: "service", entityId: "sv9",
      detail: "Full Blood Count price changed from LKR 800 to LKR 900",
      oldValue: "800", newValue: "900",
    },
    {
      id: uid("audit"), ts: format(addDays(today, -15), "yyyy-MM-dd") + "T14:00:00",
      userId: "u1", userName: "Achala Admin",
      action: "activate", entity: "specialty", entityId: "sp7",
      detail: "Specialty 'Neurology' activated",
    },
    {
      id: uid("audit"), ts: format(addDays(today, -45), "yyyy-MM-dd") + "T11:00:00",
      userId: "u1", userName: "Achala Admin",
      action: "deactivate", entity: "user", entityId: "u5",
      detail: "User 'cashier.old' deactivated",
    },
    {
      id: uid("audit"), ts: format(addDays(today, -5), "yyyy-MM-dd") + "T16:30:00",
      userId: "u3", userName: "Rashmi Reception",
      action: "void", entity: "invoice", entityId: "i1",
      detail: "Invoice INV-000001 voided — Duplicate entry",
    },
    {
      id: uid("audit"), ts: format(addDays(today, -3), "yyyy-MM-dd") + "T09:45:00",
      userId: "u1", userName: "Achala Admin",
      action: "create", entity: "user", entityId: "u6",
      detail: "User 'manager2' created with role Manager (P&L access granted)",
    },
    {
      id: uid("audit"), ts: format(addDays(today, -1), "yyyy-MM-dd") + "T08:00:00",
      userId: "u1", userName: "Achala Admin",
      action: "update", entity: "settings", entityId: "settings",
      detail: "Hospital settings updated — receipt footer changed",
    },
  ];

  // Add void entries for voided invoices
  for (const inv of invoices.filter(i => i.voided)) {
    auditLog.push({
      id: uid("audit"),
      ts: inv.voided!.date + "T12:00:00",
      userId: "u1",
      userName: inv.voided!.by,
      action: "void",
      entity: "invoice",
      entityId: inv.id,
      detail: `Invoice ${inv.no} voided — ${inv.voided!.reason}`,
    });
  }

  return {
    version: DB_VERSION,
    specialties,
    doctors,
    sessions,
    services,
    users,
    patients,
    appointments,
    invoices,
    expenses,
    messages,
    auditLog,
    settings: {
      hospitalName: "Olympus Lanka Hospital",
      currency: "LKR",
      taxRate: null,
      address: "Hospital Road, Thissamaharama",
      phone: "+94 47 223 9800",
      email: "info@olympuslanka.lk",
      invoicePrefix: "INV",
      receiptPrefix: "RCT",
      bookingPrefix: "BK",
      receiptFooter: "Thank you for choosing Olympus Lanka Hospital. This is a DEMO — no real payment processed.",
      invoiceFooter: "Payment is due at the time of service. For queries call 011 234 5678.",
      smsTemplateBooking: "Dear {name}, your appointment with {doctor} on {date} at {time} (Room {room}) is confirmed. Ref: {ref}. [DEMO]",
      smsTemplateSessionChange: "Dear {name}, your appointment with {doctor} on {date} has been updated. New time: {time}. [DEMO]",
    },
    counters,
    auth: { userId: null, module: null },
  };
}

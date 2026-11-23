import { format, addDays, parseISO } from "date-fns";
import type { DB, InvoiceLine } from "@/lib/hms/types";
import { inRange } from "@/lib/hms/logic";

export type CollectionSection = "opd" | "channeling" | "modality";

/**
 * Section mapping (single place to change it):
 *  - OPD        = general medicines (pharmacy dispenses)
 *  - Channeling = doctor consultations (pre-booked and walk-in)
 *  - Modality   = every other billed service (ECG, ECHO, X-ray, Ultrasound,
 *                 plus Laboratory, Physiotherapy and Procedures)
 */
export function classifyLine(line: InvoiceLine): Exclude<CollectionSection, "opd"> {
  return line.category === "Consultation" ? "channeling" : "modality";
}

export const SECTION_LABEL: Record<CollectionSection, string> = {
  opd: "OPD",
  channeling: "Channeling",
  modality: "Modality",
};

export const SECTION_HINT: Record<CollectionSection, string> = {
  opd: "General medicines (pharmacy)",
  channeling: "Doctor consultations — pre-booked & walk-in",
  modality: "ECG, ECHO, X-ray, Ultrasound & other services",
};

export interface NetCollectionDay {
  date: string;
  opd: number;
  channeling: number;
  modality: number;
  total: number;
}

export interface NetCollectionBreakdown {
  total: number;
  opd: number;
  channeling: number;
  modality: number;
  daily: NetCollectionDay[];
}

type Totals = Record<CollectionSection, number>;
const zero = (): Totals => ({ opd: 0, channeling: 0, modality: 0 });

/**
 * Net collection (cash collected − refunds) split into OPD / Channeling / Modality.
 * Invoice payments and refunds are allocated across the invoice's lines in proportion to line value.
 * Pharmacy dispenses count fully as OPD on their dispense date.
 */
export function getNetCollectionBreakdown(db: DB, dateFrom: string, dateTo: string): NetCollectionBreakdown {
  const byDay = new Map<string, Totals>();
  const bucket = (day: string) => {
    let t = byDay.get(day);
    if (!t) { t = zero(); byDay.set(day, t); }
    return t;
  };

  const allocate = (day: string, amount: number, weights: Totals) => {
    const sum = weights.channeling + weights.modality;
    const t = bucket(day);
    if (sum <= 0) { t.channeling += amount; return; }
    t.channeling += (amount * weights.channeling) / sum;
    t.modality += (amount * weights.modality) / sum;
  };

  for (const inv of db.invoices) {
    if (inv.voided) continue;
    const weights = zero();
    for (const l of inv.lines) weights[classifyLine(l)] += l.qty * l.unitPrice;

    for (const p of inv.payments) {
      const day = p.date.slice(0, 10);
      if (inRange(day, dateFrom, dateTo)) allocate(day, p.amount, weights);
    }
    for (const r of inv.refunds) {
      const day = r.date.slice(0, 10);
      if (inRange(day, dateFrom, dateTo)) allocate(day, -r.amount, weights);
    }
  }

  for (const d of db.dispenses) {
    if (d.status !== "Completed") continue;
    const day = d.date.slice(0, 10);
    if (inRange(day, dateFrom, dateTo)) bucket(day).opd += d.total;
  }

  const daily: NetCollectionDay[] = [];
  const sums = zero();
  let cur = dateFrom;
  while (cur <= dateTo) {
    const t = byDay.get(cur) ?? zero();
    const row = {
      date: format(parseISO(cur), "dd MMM"),
      opd: Math.round(t.opd),
      channeling: Math.round(t.channeling),
      modality: Math.round(t.modality),
      total: 0,
    };
    row.total = row.opd + row.channeling + row.modality;
    sums.opd += row.opd;
    sums.channeling += row.channeling;
    sums.modality += row.modality;
    daily.push(row);
    cur = format(addDays(parseISO(cur), 1), "yyyy-MM-dd");
  }

  return { ...sums, total: sums.opd + sums.channeling + sums.modality, daily };
}

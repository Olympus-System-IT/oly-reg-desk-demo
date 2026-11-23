import { describe, expect, it } from "vitest";
import { format, subDays } from "date-fns";
import { buildSeed } from "@/lib/hms/seed";
import { inRange, invoiceTotals } from "@/lib/hms/logic";
import { classifyLine, getNetCollectionBreakdown } from "@/features/net-collection/services/netCollection";

describe("Net collection breakdown (OPD / Channeling / Modality)", () => {
  const db = buildSeed();
  const to = format(new Date(), "yyyy-MM-dd");
  const from = format(subDays(new Date(), 29), "yyyy-MM-dd");

  it("classifies consultation as Channeling and other services as Modality", () => {
    expect(classifyLine({ serviceId: "sv1", name: "x", category: "Consultation", qty: 1, unitPrice: 1 })).toBe("channeling");
    expect(classifyLine({ serviceId: "sv2", name: "x", category: "Radiology", qty: 1, unitPrice: 1 })).toBe("modality");
  });

  it("sections add up to the total and match invoice net collections + pharmacy sales", () => {
    const b = getNetCollectionBreakdown(db, from, to);
    expect(b.opd + b.channeling + b.modality).toBe(b.total);
    expect(b.daily.reduce((t, d) => t + d.total, 0)).toBe(b.total);

    let invoiceNet = 0;
    for (const inv of db.invoices) {
      if (inv.voided) continue;
      for (const p of inv.payments) if (inRange(p.date, from, to)) invoiceNet += p.amount;
      for (const r of inv.refunds) if (inRange(r.date, from, to)) invoiceNet -= r.amount;
    }
    const pharmacy = db.dispenses
      .filter((d) => d.status === "Completed" && inRange(d.date, from, to))
      .reduce((t, d) => t + d.total, 0);
    // rounding per day/section can drift by < 1 LKR per cell
    expect(Math.abs(b.total - (invoiceNet + pharmacy))).toBeLessThan(b.daily.length * 3 + 1);
    expect(Math.abs(b.opd - pharmacy)).toBeLessThan(1);
  });

  it("zero-fills one row per day", () => {
    expect(getNetCollectionBreakdown(db, from, to).daily.length).toBe(30);
  });
});

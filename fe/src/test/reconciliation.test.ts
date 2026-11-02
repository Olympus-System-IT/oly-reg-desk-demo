import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/hms/seed";
import { invoiceTotals, computePnL, todayStr } from "@/lib/hms/logic";
import { permsFor, can } from "@/lib/hms/permissions";

describe("Accounting Reconciliation", () => {
  it("proves dashboard totals match report figures and P&L inputs", () => {
    const db = buildSeed();
    const t = todayStr();

    // Direct invoice summation
    let totalBilled = 0;
    let totalPaid = 0;
    let totalRefunded = 0;
    let totalOutstanding = 0;
    let todayCollected = 0;

    for (const inv of db.invoices) {
      if (inv.voided) continue;
      const calc = invoiceTotals(inv, db.settings.taxRate);
      totalBilled += calc.total;
      totalPaid += calc.paid;
      totalRefunded += calc.refunded;
      totalOutstanding += calc.balance;

      for (const p of inv.payments) {
        if (p.date.startsWith(t)) {
          todayCollected += p.amount;
        }
      }
    }

    // Dashboard calculations
    const dashCollected = db.invoices
      .flatMap((i) => i.payments)
      .filter((p) => p.date.startsWith(t))
      .reduce((x, p) => x + p.amount, 0);

    const dashOutstanding = db.invoices.reduce((x, i) => x + invoiceTotals(i).balance, 0);

    expect(dashCollected).toBe(todayCollected);
    expect(dashOutstanding).toBe(totalOutstanding);

    // Full history P&L
    const allPnl = computePnL(db, "2020-01-01", "2030-12-31");
    expect(allPnl.cashCollected).toBe(totalPaid);
    expect(allPnl.refunds).toBe(totalRefunded);
    expect(allPnl.outstanding).toBe(totalOutstanding);
    expect(allPnl.grossRevenue - allPnl.discounts - allPnl.refunds).toBe(allPnl.netRevenue);
    expect(allPnl.grossProfit - allPnl.opEx).toBe(allPnl.netProfit);
  });
});

describe("Permissions Matrix", () => {
  it("enforces role boundaries correctly", () => {
    const admin = { id: "u1", name: "Admin", username: "admin", contact: "", role: "admin" as const, active: true };
    const manager = { id: "u2", name: "Manager", username: "mgr", contact: "", role: "manager" as const, active: true };
    const receptionist = { id: "u3", name: "Rec", username: "rec", contact: "", role: "receptionist" as const, active: true };
    const nurse = { id: "u4", name: "Nurse", username: "nur", contact: "", role: "nurse" as const, active: true };

    expect(can(admin, "sfa.access")).toBe(true);
    expect(can(admin, "users.manage")).toBe(true);
    expect(can(admin, "pl.view")).toBe(true);
    expect(can(admin, "refund.approve")).toBe(true);

    expect(can(manager, "sfa.access")).toBe(false);
    expect(can(manager, "users.manage")).toBe(false);
    expect(can(manager, "pl.view")).toBe(false); // only with grantPL
    expect(can({ ...manager, grantPL: true }, "pl.view")).toBe(true);

    expect(can(receptionist, "billing.collect")).toBe(true);
    expect(can(receptionist, "bookings.manage")).toBe(true);
    expect(can(receptionist, "pl.view")).toBe(false);
    expect(can(receptionist, "users.manage")).toBe(false);

    expect(can(nurse, "queue.update")).toBe(true);
    expect(can(nurse, "sessions.view")).toBe(true);
    expect(can(nurse, "billing.view")).toBe(false);
    expect(can(nurse, "billing.collect")).toBe(false);
  });
});

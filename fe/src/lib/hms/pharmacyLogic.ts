import { differenceInDays, format, parseISO } from "date-fns";
import type { DB, Medicine, MedicineBatch, PayMethod, PharmacyDispense, Prescription } from "./types";
import { money } from "./logic";

export const todayDateStr = () => format(new Date(), "yyyy-MM-dd");

/**
 * Returns available non-expired stock for a medicine across all active batches.
 */
export function getMedicineStock(db: DB, medicineId: string): number {
  const today = todayDateStr();
  return db.batches
    .filter((b) => b.medicineId === medicineId && b.quantity > 0 && b.expiryDate >= today)
    .reduce((sum, b) => sum + b.quantity, 0);
}

/**
 * Returns all batches for a medicine sorted by Expiry Date ascending (FEFO).
 */
export function getMedicineBatches(db: DB, medicineId: string, onlyAvailable = false): MedicineBatch[] {
  const today = todayDateStr();
  return db.batches
    .filter((b) => b.medicineId === medicineId && (!onlyAvailable || (b.quantity > 0 && b.expiryDate >= today)))
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

export type ExpiryStatus = {
  status: "Expired" | "Critical" | "Warning" | "Good" | "Depleted";
  label: string;
  tone: "red" | "amber" | "blue" | "gray";
  daysRemaining: number;
};

/**
 * Calculates expiry classification and remaining days.
 */
export function getBatchExpiryStatus(expiryDate: string, quantity: number): ExpiryStatus {
  if (quantity <= 0) {
    return { status: "Depleted", label: "Depleted", tone: "gray", daysRemaining: 0 };
  }
  const today = new Date();
  const exp = parseISO(expiryDate);
  const days = differenceInDays(exp, today);

  if (days < 0) {
    return { status: "Expired", label: `Expired (${Math.abs(days)}d ago)`, tone: "red", daysRemaining: days };
  }
  if (days <= 30) {
    return { status: "Critical", label: `Expires in ${days}d`, tone: "red", daysRemaining: days };
  }
  if (days <= 90) {
    return { status: "Warning", label: `Expires in ${days}d`, tone: "amber", daysRemaining: days };
  }
  return { status: "Good", label: `Good (${days}d left)`, tone: "blue", daysRemaining: days };
}

export type StockStatus = {
  status: "In Stock" | "Low Stock" | "Out of Stock";
  tone: "blue" | "amber" | "red";
};

export function getStockStatus(medicine: Medicine, availableStock: number): StockStatus {
  if (availableStock <= 0) {
    return { status: "Out of Stock", tone: "red" };
  }
  if (availableStock <= medicine.reorderLevel) {
    return { status: "Low Stock", tone: "amber" };
  }
  return { status: "In Stock", tone: "blue" };
}

/**
 * Auto-allocates stock using FEFO (First Expiring First Out) from non-expired batches.
 */
export function allocateFefoBatches(db: DB, medicineId: string, requestedQty: number) {
  const availableBatches = getMedicineBatches(db, medicineId, true);
  let remainingNeeded = requestedQty;
  const allocations: { batchId: string; batchNo: string; expiryDate: string; qty: number; unitPrice: number }[] = [];

  for (const batch of availableBatches) {
    if (remainingNeeded <= 0) break;
    const take = Math.min(batch.quantity, remainingNeeded);
    allocations.push({
      batchId: batch.id,
      batchNo: batch.batchNo,
      expiryDate: batch.expiryDate,
      qty: take,
      unitPrice: batch.unitPrice,
    });
    remainingNeeded -= take;
  }

  return {
    allocations,
    fulfilled: requestedQty - remainingNeeded,
    shortage: remainingNeeded,
  };
}

/**
 * Calculates top-level metrics for the Pharmacy Dashboard.
 */
export function getPharmacyDashboardMetrics(db: DB) {
  const today = todayDateStr();

  // Today's completed dispenses
  const todayDispenses = db.dispenses.filter(
    (d) => d.status === "Completed" && d.date.slice(0, 10) === today
  );
  const todayRevenue = todayDispenses.reduce((acc, d) => acc + d.total, 0);

  // Pending Prescriptions
  const pendingRxCount = db.prescriptions.filter((p) => p.status === "Pending").length;

  // Active Medicines
  const activeMedicines = db.medicines.filter((m) => m.active);

  // Stock Valuation
  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let lowStockCount = 0;

  for (const med of activeMedicines) {
    const stock = getMedicineStock(db, med.id);
    if (stock <= med.reorderLevel) {
      lowStockCount++;
    }
  }

  for (const batch of db.batches) {
    if (batch.quantity > 0 && batch.expiryDate >= today) {
      totalCostValuation += batch.quantity * batch.unitCost;
      totalRetailValuation += batch.quantity * batch.unitPrice;
    }
  }

  // Batches alerts
  let expiringSoonCount = 0;
  let expiredBatchesCount = 0;

  for (const b of db.batches) {
    if (b.quantity > 0) {
      const expStatus = getBatchExpiryStatus(b.expiryDate, b.quantity);
      if (expStatus.status === "Expired") {
        expiredBatchesCount++;
      } else if (expStatus.status === "Critical" || expStatus.status === "Warning") {
        expiringSoonCount++;
      }
    }
  }

  return {
    todayRevenue,
    todayDispenseCount: todayDispenses.length,
    pendingRxCount,
    activeMedicinesCount: activeMedicines.length,
    totalCostValuation,
    totalRetailValuation,
    lowStockCount,
    expiringSoonCount,
    expiredBatchesCount,
  };
}

/**
 * 14-day daily dispense revenue series for trend chart.
 */
export function getPharmacyRevenueTrend(db: DB, days = 14) {
  const map = new Map<string, number>();
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(format(d, "yyyy-MM-dd"), 0);
  }

  for (const disp of db.dispenses) {
    if (disp.status !== "Completed") continue;
    const dateKey = disp.date.slice(0, 10);
    if (map.has(dateKey)) {
      map.set(dateKey, (map.get(dateKey) ?? 0) + disp.total);
    }
  }

  return Array.from(map.entries()).map(([date, amount]) => ({
    date: format(parseISO(date), "dd MMM"),
    rawDate: date,
    revenue: amount,
  }));
}

/**
 * Category breakdown of active medicines and current stock valuation.
 */
export function getPharmacyCategoryValuation(db: DB) {
  const today = todayDateStr();
  const categoryMap = new Map<string, { count: number; value: number }>();

  for (const med of db.medicines) {
    if (!categoryMap.has(med.category)) {
      categoryMap.set(med.category, { count: 0, value: 0 });
    }
    const entry = categoryMap.get(med.category)!;
    entry.count++;
  }

  for (const b of db.batches) {
    if (b.quantity <= 0 || b.expiryDate < today) continue;
    const med = db.medicines.find((m) => m.id === b.medicineId);
    if (!med) continue;
    const entry = categoryMap.get(med.category);
    if (entry) {
      entry.value += b.quantity * b.unitPrice;
    }
  }

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      medicationsCount: data.count,
      valuation: data.value,
    }))
    .sort((a, b) => b.valuation - a.valuation);
}


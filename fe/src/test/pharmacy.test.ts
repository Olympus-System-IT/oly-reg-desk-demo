import { describe, it, expect, beforeEach } from "vitest";
import { buildSeed } from "@/lib/hms/seed";
import {
  getMedicineStock,
  getMedicineBatches,
  getBatchExpiryStatus,
  allocateFefoBatches,
  getPharmacyDashboardMetrics,
} from "@/lib/hms/pharmacyLogic";
import { can, modulesFor } from "@/lib/hms/permissions";
import { resetDemo, getDB, mutate } from "@/lib/hms/store";
import type { User } from "@/lib/hms/types";

describe("Pharmacy Module Logic & Unit Tests", () => {
  beforeEach(() => {
    resetDemo();
  });

  describe("FEFO (First Expiring First Out) Batch Allocation", () => {
    it("allocates medication batches in chronological order of expiry", () => {
      const db = getDB();
      // Find a medicine with batches (e.g. med1 Amoxicillin)
      const batches = getMedicineBatches(db, "med1", true);
      expect(batches.length).toBeGreaterThan(0);

      // Verify batches are strictly sorted by expiry date ascending
      for (let i = 0; i < batches.length - 1; i++) {
        expect(batches[i].expiryDate <= batches[i + 1].expiryDate).toBe(true);
      }

      // Request 10 units
      const fefo = allocateFefoBatches(db, "med1", 10);
      expect(fefo.fulfilled).toBe(10);
      expect(fefo.shortage).toBe(0);
      expect(fefo.allocations.length).toBeGreaterThan(0);
      // The first allocated batch must match the earliest expiring batch
      expect(fefo.allocations[0].batchId).toBe(batches[0].id);
    });

    it("correctly splits requirement across multiple batches when needed", () => {
      const db = getDB();
      // Total available stock
      const totalStock = getMedicineStock(db, "med1");
      expect(totalStock).toBeGreaterThan(0);

      // Request more than the first batch has
      const batches = getMedicineBatches(db, "med1", true);
      const firstBatchQty = batches[0].quantity;

      if (batches.length > 1) {
        const reqQty = firstBatchQty + 10;
        const fefo = allocateFefoBatches(db, "med1", reqQty);
        expect(fefo.fulfilled).toBe(reqQty);
        expect(fefo.allocations.length).toBeGreaterThanOrEqual(2);
        expect(fefo.allocations[0].qty).toBe(firstBatchQty);
      }
    });

    it("identifies stock shortage when requested amount exceeds total stock", () => {
      const db = getDB();
      const totalStock = getMedicineStock(db, "med1");
      const excessiveQty = totalStock + 5000;

      const fefo = allocateFefoBatches(db, "med1", excessiveQty);
      expect(fefo.fulfilled).toBe(totalStock);
      expect(fefo.shortage).toBe(5000);
    });
  });

  describe("Shelf-Life and Expiry Status Classification", () => {
    it("detects expired batches with negative days remaining", () => {
      const pastDate = "2024-01-01";
      const status = getBatchExpiryStatus(pastDate, 50);
      expect(status.status).toBe("Expired");
      expect(status.tone).toBe("red");
      expect(status.daysRemaining).toBeLessThan(0);
    });

    it("detects critical batches expiring within 30 days", () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 15);
      const soonStr = soon.toISOString().slice(0, 10);

      const status = getBatchExpiryStatus(soonStr, 30);
      expect(status.status).toBe("Critical");
      expect(status.tone).toBe("red");
      expect(status.daysRemaining).toBeLessThanOrEqual(30);
    });

    it("classifies depleted batches with zero quantity", () => {
      const status = getBatchExpiryStatus("2028-12-31", 0);
      expect(status.status).toBe("Depleted");
      expect(status.tone).toBe("gray");
    });

    it("classifies healthy shelf-life batches with blue tone (adhering to blue theme)", () => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 2);
      const futureStr = nextYear.toISOString().slice(0, 10);

      const status = getBatchExpiryStatus(futureStr, 100);
      expect(status.status).toBe("Good");
      expect(status.tone).toBe("blue");
    });
  });

  describe("Pharmacy Permissions & Role Boundaries", () => {
    it("grants full pharmacy access and dispensing authority to Admin", () => {
      const admin: User = {
        id: "u1",
        name: "Admin",
        username: "admin",
        contact: "",
        role: "admin",
        active: true,
      };

      expect(can(admin, "pharmacy.access")).toBe(true);
      expect(can(admin, "pharmacy.dispense")).toBe(true);
      expect(can(admin, "pharmacy.inventory")).toBe(true);
      expect(can(admin, "pharmacy.manage")).toBe(true);
      expect(modulesFor(admin)).toContain("pharmacy");
    });

    it("grants pharmacy workspace to Pharmacist role", () => {
      const pharmacist: User = {
        id: "u8",
        name: "Pharmacist",
        username: "pharmacist",
        contact: "",
        role: "pharmacist",
        active: true,
      };

      expect(can(pharmacist, "pharmacy.access")).toBe(true);
      expect(can(pharmacist, "pharmacy.dispense")).toBe(true);
      expect(can(pharmacist, "pharmacy.inventory")).toBe(true);
      expect(can(pharmacist, "pharmacy.manage")).toBe(true);
      expect(modulesFor(pharmacist)).toContain("pharmacy");
    });

    it("restricts dispensary operations from nurse role", () => {
      const nurse: User = {
        id: "u4",
        name: "Nurse",
        username: "nurse",
        contact: "",
        role: "nurse",
        active: true,
      };

      expect(can(nurse, "pharmacy.access")).toBe(false);
      expect(can(nurse, "pharmacy.dispense")).toBe(false);
      expect(can(nurse, "pharmacy.manage")).toBe(false);
      expect(modulesFor(nurse)).not.toContain("pharmacy");
    });
  });

  describe("Prescription Dispensing & Stock Mutation", () => {
    it("deducts inventory stock and updates prescription status to Dispensed", () => {
      const db = getDB();
      const pendingRx = db.prescriptions.find((p) => p.status === "Pending");
      expect(pendingRx).toBeDefined();

      if (pendingRx) {
        const itemToDispense = pendingRx.items[0];
        const medId = itemToDispense.medicineId;
        const initialStock = getMedicineStock(db, medId);

        // Simulate dispensing mutation
        mutate((d) => {
          const rx = d.prescriptions.find((p) => p.id === pendingRx.id);
          if (rx) {
            rx.status = "Dispensed";
            rx.dispensedAt = new Date().toISOString();
            rx.dispensedBy = "Pharmacist Test";
          }

          // Deduct from batch
          const batch = d.batches.find((b) => b.medicineId === medId && b.quantity >= itemToDispense.quantity);
          if (batch) {
            batch.quantity -= itemToDispense.quantity;
          }
        });

        const updatedDb = getDB();
        const updatedRx = updatedDb.prescriptions.find((p) => p.id === pendingRx.id);
        expect(updatedRx?.status).toBe("Dispensed");

        const updatedStock = getMedicineStock(updatedDb, medId);
        expect(updatedStock).toBe(initialStock - itemToDispense.quantity);
      }
    });
  });

  describe("Purchase Orders & Goods Receiving (GRN)", () => {
    it("confirms GRN receipt and adds fresh batches into inventory", () => {
      const db = getDB();
      const initialBatchCount = db.batches.length;

      mutate((d) => {
        const newBatchNo = "BAT-TEST-GRN-999";
        d.batches.push({
          id: "bat-test-new",
          medicineId: "med1",
          batchNo: newBatchNo,
          expiryDate: "2028-05-15",
          quantity: 250,
          initialQuantity: 250,
          unitCost: 11,
          unitPrice: 18,
          supplierId: "sup1",
          receivedDate: "2026-11-05",
        });
      });

      const updatedDb = getDB();
      expect(updatedDb.batches.length).toBe(initialBatchCount + 1);
      const added = updatedDb.batches.find((b) => b.batchNo === "BAT-TEST-GRN-999");
      expect(added).toBeDefined();
      expect(added?.quantity).toBe(250);
    });
  });
});


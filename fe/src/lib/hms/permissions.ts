import type { ModuleKey, Role, User } from "./types";

export type Perm =
  | "sfa.access"
  | "billing.access"
  | "pharmacy.access"
  | "pharmacy.dispense"
  | "pharmacy.inventory"
  | "pharmacy.manage"
  | "setup.manage"
  | "users.manage"
  | "dashboard.view"
  | "reports.view"
  | "pl.view"
  | "patients.view"
  | "patients.manage"
  | "bookings.manage"
  | "billing.view"
  | "billing.collect"
  | "refund.approve"
  | "void.approve"
  | "queue.update"
  | "expenses.manage"
  | "sessions.view"
  | "booking.override";

const ROLE_PERMS: Record<Role, Perm[]> = {
  admin: [
    "sfa.access", "billing.access", "pharmacy.access", "pharmacy.dispense", "pharmacy.inventory", "pharmacy.manage",
    "setup.manage", "users.manage", "dashboard.view", "reports.view", "pl.view",
    "patients.view", "patients.manage", "bookings.manage", "billing.view", "billing.collect", "refund.approve",
    "void.approve", "queue.update", "expenses.manage", "sessions.view", "booking.override",
  ],
  manager: [
    "billing.access", "pharmacy.access", "pharmacy.inventory", "dashboard.view", "reports.view",
    "expenses.manage", "sessions.view", "patients.view", "billing.view", "queue.update",
  ],
  pharmacist: [
    "pharmacy.access", "pharmacy.dispense", "pharmacy.inventory", "pharmacy.manage",
    "dashboard.view", "patients.view", "reports.view",
  ],
  receptionist: ["billing.access", "dashboard.view", "patients.view", "patients.manage", "bookings.manage", "billing.view", "billing.collect", "sessions.view", "queue.update"],
  nurse: ["billing.access", "dashboard.view", "sessions.view", "patients.view", "queue.update"],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  pharmacist: "Pharmacist",
  receptionist: "Receptionist / Cashier",
  nurse: "Nurse",
};

export function permsFor(user: User | null | undefined): Set<Perm> {
  if (!user || !user.active) return new Set();
  const set = new Set(ROLE_PERMS[user.role]);
  if (user.role === "manager" && user.grantPL) set.add("pl.view");
  return set;
}

export function can(user: User | null | undefined, perm: Perm) {
  return permsFor(user).has(perm);
}

export function modulesFor(user: User | null | undefined): ModuleKey[] {
  const out: ModuleKey[] = [];
  if (can(user, "sfa.access")) out.push("sfa");
  if (can(user, "billing.access")) out.push("billing");
  if (can(user, "pharmacy.access")) out.push("pharmacy");
  return out;
}

export const MODULE_LABEL: Record<ModuleKey, { name: string; desc: string }> = {
  sfa: { name: "SFA", desc: "Administration — doctors, consultant types, services, schedules, users and settings" },
  billing: { name: "Billing", desc: "Reception, POS and patient operations — bookings, queues, invoices, expenses" },
  pharmacy: { name: "Pharmacy", desc: "Prescription dispensing, drug inventory, stock alerts, batches and purchases" },
};

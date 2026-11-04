export type Role = "admin" | "manager" | "receptionist" | "nurse" | "pharmacist";
export type ModuleKey = "sfa" | "billing" | "pharmacy";

export interface Specialty {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export type PayoutRule = { type: "none" } | { type: "fixed"; value: number } | { type: "percent"; value: number };

export interface Doctor {
  id: string;
  code: string;
  name: string;
  specialtyId: string;
  mobile: string;
  email?: string;
  regNo?: string;
  qualifications?: string;
  fee: number;
  payout: PayoutRule;
  active: boolean;
}

export type SessionStatus = "Scheduled" | "Open" | "Delayed" | "Completed" | "Cancelled";

export interface Session {
  id: string;
  doctorId: string;
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string;
  room: string;
  max: number;
  status: SessionStatus;
  nextQueue: number;
  seriesId?: string;
  notes?: string;
}

export interface PriceChange {
  date: string;
  from: number | null;
  to: number;
  by: string;
}

export interface Service {
  id: string;
  code: string;
  name: string;
  category: string;
  modality?: string;
  description?: string;
  price: number;
  duration?: number;
  active: boolean;
  history: PriceChange[];
}

export interface User {
  id: string;
  name: string;
  username: string;
  contact: string;
  role: Role;
  active: boolean;
  grantPL?: boolean;
  createdAt?: string;
  lastActive?: string;
}

export interface Patient {
  id: string;
  code: string;
  name: string;
  dob?: string;
  approxAge?: number;
  mobile: string;
  sex?: "Male" | "Female" | "Other";
  address?: string;
  guardian?: string;
  smsConsent: boolean;
  createdAt: string;
}

export type ApptStatus = "Booked" | "Checked In" | "Waiting" | "In Consultation" | "Completed" | "Cancelled" | "No-show";
export type PaymentStatus = "Unpaid" | "Partially Paid" | "Paid" | "Partially Refunded" | "Refunded" | "Voided";
export type MessageStatus = "Sent" | "Failed" | "Not sent" | "Opted out" | "Pending" | "Delivered";

export interface Appointment {
  id: string;
  ref: string;
  patientId: string;
  sessionId: string;
  queueNo: number;
  source: "Telephone" | "Walk-in";
  status: ApptStatus;
  invoiceId?: string;
  message: MessageStatus;
  createdAt: string;
  overrideReason?: string;
  cancelReason?: string;
}

export interface InvoiceLine {
  serviceId: string;
  name: string;
  category: string;
  qty: number;
  unitPrice: number;
  doctorId?: string;
}

export type PayMethod = "Cash" | "Card" | "Bank transfer";

export interface Payment {
  id: string;
  receiptNo: string;
  amount: number;
  method: PayMethod;
  date: string; // ISO
  reference?: string;
  by: string;
}

export interface Refund {
  id: string;
  amount: number;
  reason: string;
  date: string;
  by: string;
  approvedBy?: string;
}

export interface Invoice {
  id: string;
  no: string;
  patientId: string;
  appointmentId?: string;
  lines: InvoiceLine[];
  discount: number;
  payments: Payment[];
  refunds: Refund[];
  voided?: { reason: string; by: string; date: string };
  createdAt: string;
  createdBy: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  method: PayMethod;
  reference?: string;
  by: string;
}

export type AuditAction =
  | "create" | "update" | "delete" | "activate" | "deactivate"
  | "price_change" | "void" | "refund" | "override" | "reset_password" | "login";

export interface AuditEntry {
  id: string;
  ts: string; // ISO
  userId: string;
  userName: string;
  action: AuditAction;
  entity: string; // e.g. "invoice", "service", "user"
  entityId: string;
  detail: string; // human-readable description
  oldValue?: string;
  newValue?: string;
}

export type SmsType = "booking_confirm" | "session_change" | "session_cancel" | "ebill" | "manual";

export interface Message {
  id: string;
  ts: string; // ISO
  patientId: string;
  appointmentId?: string;
  invoiceId?: string;
  type: SmsType;
  text: string;
  status: MessageStatus;
  retryOf?: string; // id of original message if this is a retry
  simulatedNote?: string;
}

export interface Settings {
  hospitalName: string;
  currency: string;
  taxRate: number | null;
  address: string;
  phone: string;
  email?: string;
  invoicePrefix: string;
  receiptPrefix: string;
  bookingPrefix: string;
  receiptFooter: string;
  invoiceFooter: string;
  smsTemplateBooking: string;
  smsTemplateSessionChange: string;
}

// ── Pharmacy Module Models ───────────────────────────────────────────────────

export type DosageForm =
  | "Tablet"
  | "Capsule"
  | "Syrup"
  | "Suspension"
  | "Injection"
  | "Ointment"
  | "Cream"
  | "Drops"
  | "Inhaler"
  | "Infusion"
  | "Other";

export interface Medicine {
  id: string;
  code: string;
  name: string;
  genericName: string;
  category: string;
  dosageForm: DosageForm;
  strength: string;
  unit: string;
  unitPrice: number;
  unitCost: number;
  reorderLevel: number;
  requiresPrescription: boolean;
  active: boolean;
  rackLocation?: string;
  description?: string;
  manufacturer?: string;
}

export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNo: string;
  expiryDate: string; // yyyy-MM-dd
  quantity: number;
  initialQuantity: number;
  unitCost: number;
  unitPrice: number;
  supplierId?: string;
  receivedDate: string; // yyyy-MM-dd
}

export type PrescriptionStatus = "Pending" | "Dispensed" | "Partially Dispensed" | "Cancelled";

export interface PrescriptionItem {
  medicineId: string;
  medicineName: string;
  dosage: string;
  duration: string;
  quantity: number;
  unitPrice: number;
  instructions?: string;
}

export interface Prescription {
  id: string;
  no: string;
  patientId: string;
  doctorId?: string;
  doctorName?: string;
  date: string; // yyyy-MM-dd
  diagnosis?: string;
  notes?: string;
  status: PrescriptionStatus;
  items: PrescriptionItem[];
  dispensedAt?: string;
  dispensedBy?: string;
  dispenseId?: string;
}

export interface PharmacyDispenseItem {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNo: string;
  dosage?: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface PharmacyDispense {
  id: string;
  no: string;
  prescriptionId?: string;
  patientId: string;
  patientName: string;
  patientMobile?: string;
  date: string; // ISO
  items: PharmacyDispenseItem[];
  subtotal: number;
  discount: number;
  total: number;
  payMethod: PayMethod;
  cashReceived?: number;
  change?: number;
  by: string;
  status: "Completed" | "Voided";
  notes?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  active: boolean;
}

export type PurchaseOrderStatus = "Draft" | "Ordered" | "Received" | "Cancelled";

export interface PurchaseOrderItem {
  medicineId: string;
  medicineName: string;
  qtyOrdered: number;
  qtyReceived?: number;
  unitCost: number;
  batchNo?: string;
  expiryDate?: string;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  no: string;
  supplierId: string;
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes?: string;
  by: string;
}

export interface DB {
  version: number;
  specialties: Specialty[];
  doctors: Doctor[];
  sessions: Session[];
  services: Service[];
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  invoices: Invoice[];
  expenses: Expense[];
  messages: Message[];
  auditLog: AuditEntry[];
  settings: Settings;
  medicines: Medicine[];
  batches: MedicineBatch[];
  prescriptions: Prescription[];
  dispenses: PharmacyDispense[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  counters: Record<string, number>;
  auth: { userId: string | null; module: ModuleKey | null };
}

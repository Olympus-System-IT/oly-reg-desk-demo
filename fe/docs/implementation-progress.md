# Implementation Progress Checklist

_Hospital Management System (HMS) Implementation Status_

---

## 1. Baseline & Compilation
- [x] Initial codebase scan & breakage analysis
- [x] Fixed `seed.ts` `InvoiceLine[]` type inference
- [x] Fixed `book.tsx` `Appointment` type declaration & `invoiceId` mutation
- [x] Resolved missing `/invoices/$id` route definition
- [x] `tsc --noEmit` passing with 0 errors
- [x] `npm run build` succeeds cleanly across all routes
- [x] Vitest test suites passing (routing + reconciliation)

---

## 2. Screens & Features Implementation Matrix

### Core Shell & Navigation
- [x] Login page (`/`) with demo quick-login credentials
- [x] Module selector (`/modules`) with role-based availability
- [x] Authenticated Shell (`/_shell`) with responsive sidebar, breadcrumbs, and user dropdown
- [x] Dynamic module switcher (SFA vs Billing) in top navigation bar

### SFA Module (Admin Only)
- [x] **Dashboard** (`/dashboard`): Today's sessions, live appointments, cash collected, outstanding
- [x] **Specialties** (`/specialties`): Add/edit specialties, active toggles, doctor count
- [x] **Doctors Directory** (`/doctors`): Search, fee structure, payout configuration
- [x] **Doctor Detail** (`/doctors/$id`): Profile, consultation fees, scheduled sessions, past appointments
- [x] **Doctor Sessions** (`/sessions`): Calendar and list views, room conflict detection, scheduling wizard
- [x] **Session Detail** (`/sessions/$id`): Live patient queue management, attendance, session cancellation & SMS broadcasting
- [x] **Services & Modalities** (`/services`): Catalog, category filters, price change modal with audit history
- [x] **User Management** (`/users`): Staff accounts, role assignments, P&L access toggle (`grantPL`)
- [x] **Settings & Audit Log** (`/settings`): Hospital profile, currency, numbering prefixes, templates, and searchable audit log
- [x] **Approvals Queue** (`/approvals`): Authorization queue for refunds, voids, and capacity overrides

### Billing Module (Reception, Cashier & Clinical)
- [x] **Dashboard** (`/dashboard`): Operational metrics, waiting queue count, revenue summaries
- [x] **New Booking Wizard** (`/book`): Step-by-step patient select/create, session pick, queue assignment, optional immediate payment
- [x] **Patients Directory** (`/patients`): Searchable patient list, quick registration dialog with validation
- [x] **Patient Profile** (`/patients/$id`): Full clinical profile, demographics, visit history, past invoices
- [x] **Appointments** (`/appointments`): Filter by doctor, status, date, cancel/no-show actions
- [x] **Queue Management** (`/queue`): Real-time OPD waiting room list, status advancement (Waiting -> In Consultation -> Completed)
- [x] **Point of Sale (POS)** (`/pos`): Item catalog, basket totals, discounts, instant receipt print
- [x] **Invoices Ledger** (`/invoices`): Filterable invoice list, payment badges, balance summaries
- [x] **Invoice Detail** (`/invoices/$id`):
  - [x] Line items breakdown with unit prices
  - [x] Collect subsequent payments against SAME invoice
  - [x] Issue refunds with mandatory reason & audit tracking
  - [x] Void invoice with confirmation & audit log
  - [x] 80mm thermal receipt print layout
  - [x] A4 full invoice print layout
  - [x] E-Bill digital link sharing & simulated SMS trigger
- [x] **Expenses Management** (`/expenses`):
  - [x] Expense transaction table with search & filters
  - [x] Category breakdown Recharts visualization
  - [x] Record/edit disbursement modal with Zod validation
  - [x] Delete expense with confirmation dialog & audit entry
  - [x] Export expenses as CSV
- [x] **Reports Hub & P&L** (`/reports`):
  - [x] Profit & Loss (P&L) statement with accrual breakdown & chart
  - [x] Daily collections report by payment method (Cash, Card, Transfer)
  - [x] Appointments summary by doctor and specialty
  - [x] Outstanding balances aging report
  - [x] Service revenue volume & total analysis
  - [x] Cancellations and refunds audit report
  - [x] Doctor fees & payout payables report
  - [x] Message delivery history report
  - [x] CSV export for all report types
  - [x] Print-friendly view
- [x] **SMS & Messages Centre** (`/messages`):
  - [x] Outbound communication history across all statuses (Delivered, Sent, Pending, Failed)
  - [x] Message preview dialog (sanitized, non-clinical)
  - [x] Retry failed messages without duplicating bookings
  - [x] Compose simulated manual SMS modal
  - [x] Honest disclaimer banner for simulated SMS gateway

---

## 3. Data Integrity & Verification
- [x] Seed PRNG stability with 60-90 days of realistic transactional data
- [x] Automated test for accounting reconciliation (`reconciliation.test.ts`)
- [x] Strict permission gating per role (`can(user, perm)`) on all routes & actions
- [x] Non-PII URL routing and clean parameter bindings
- [x] Print layout testing: `.no-print` classes hiding sidebar, header, and action buttons

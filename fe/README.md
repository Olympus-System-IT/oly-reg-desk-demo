# Hospital Management System (HMS) — Outpatient & Billing Platform

A modern, high-performance Outpatient Clinic and Hospital Management web application built with **TanStack Start**, **React 19**, **Tailwind CSS v4**, **shadcn/ui**, and **Recharts**.

---

## 1. Quick Start & Setup

The web application source code is located in the `fe` directory.

```bash
# Navigate to the frontend directory
cd fe

# Install dependencies (if not already installed)
npm install

# Run the local development server (starts on http://localhost:3000)
npm run dev

# Run type check
npx tsc --noEmit

# Run unit and reconciliation test suites
npm run test

# Build for production
npm run build
```

---

## 2. Demo Authentication & Roles

The system contains built-in demo credentials for quick role switching directly on the login screen (`/`). All demo accounts share the fictional demo password `demo1234`:

| Role | Demo Username | Contact / Email | Access Permissions & Responsibilities |
|------|---------------|-----------------|----------------------------------------|
| **Admin** | `admin` | `admin@example-hospital.lk` | Full access to **SFA** (Administration), **Billing**, and **Pharmacy** modules. Manages doctors, schedules, services, users, settings, approvals, and full P&L. |
| **Admin** | `admin` | `admin@example-hospital.lk` | Full access to **SFA** (Administration), **Billing**, and **Pharmacy** modules. Manages doctors, schedules, services, users, settings, approvals, and full P&L. |
| **Manager** | `manager` | `0771234567` | Access to **Billing** and **Pharmacy** modules: dashboards, reports, session schedules, patient operations, inventory, and expenses. P&L accessible only when `grantPL` is enabled. |
| **Pharmacist** | `pharmacist` | `0781122334` | Full access to **Pharmacy** module: prescription dispensing, counter OTC cashiering, drug catalog & batch FEFO expiry tracker, suppliers, and purchase orders. |
| **Receptionist / Cashier** | `reception` | `0712345678` | Access to **Billing** module: patient registration, appointment booking, queue management, POS cashiering, collecting payments, and receipts. |
| **Nurse** | `nurse` | `0759876543` | Access to **Billing** module: doctor sessions, waiting queue advancement, and patient attendance. **No financial or pricing data is displayed.** |
| **Deactivated (Test)** | `cashier.old` | `0700000000` | Inactive staff account for verifying deactivated user rejection (`active: false`). |

### Demo Mode Flag & Redirect Safety
- **Demo Mode Flag (`NEXT_PUBLIC_DEMO_MODE`)**: Controls whether the collapsible demo role chips appear below the login form. Setting this flag to `false` removes all prototype shortcuts.
- **Open-Redirect Safety (`sanitizeRedirectUrl`)**: Any `?next=` or `?returnTo=` parameter is strictly validated before redirection. Absolute URLs (`https://evil.example`), protocol-relative paths (`//evil.example`), and malformed schemes are discarded in favor of default verified application routes.

---

## 3. Module & Route Map

### SFA (Administration Module — Admin Only)
- `/dashboard` — SFA executive dashboard with doctor duties, queue loads, and financial summaries.
- `/specialties` — Medical specialties directory and management.
- `/doctors` — Doctor profiles, consultation fees, and payout rules (percentage vs. fixed).
- `/doctors/$id` — Doctor profile, scheduled consultation sessions, and patient appointment history.
- `/sessions` — Doctor session calendar & list, recurring schedule generation, room conflict prevention.
- `/sessions/$id` — Live session view, patient attendance, queue advancement, and session cancellation.
- `/services` — Diagnostic services, modalities, and price change history with audit log.
- `/users` — System user accounts, role management, and P&L access permission toggle.
- `/approvals` — Queue for authorizing refunds, voided invoices, and session capacity overrides.
- `/reports` — Comprehensive Reports & P&L statements with CSV export and print view.
- `/settings` — Hospital metadata, numbering prefixes (INV, RCT, BK), SMS templates, and searchable audit trail.

### Billing (Reception, POS & Patient Operations)
- `/dashboard` — Daily operational dashboard for clinic reception.
- `/book` — Multi-step appointment booking wizard with queue number allocation and optional upfront payment.
- `/patients` — Patient directory, search by name/NIC/mobile, and quick registration dialog.
- `/patients/$id` — Patient demographics, appointment timeline, and billing invoice history.
- `/appointments` — Master appointments schedule with status filtering (Booked, Waiting, Completed, Cancelled).
- `/queue` — Today's live OPD waiting room queue with real-time patient call-in controls.
- `/pos` — Outpatient Point of Sale with instant item selection, discounts, and payment collection.
- `/invoices` — Invoice ledger with payment status badges, balances due, and search.
- `/invoices/$id` — Invoice detail view, multi-payment collection against the same invoice, refunds, voids, and print layouts (80mm thermal, A4 invoice, digital e-bill).
- `/expenses` — Operational disbursements ledger, category breakdown chart, and CSV export.
- `/messages` — SMS Centre tracking outbound patient notifications, delivery statuses, retry controls, and manual compose.

### Pharmacy (Prescriptions, Dispensary & Inventory Module)
- `/pharmacy` — Pharmacy operational dashboard with dispensary queues, stock valuations, and safety alerts.
- `/pharmacy/dispense` — Prescription dispensing counter POS with FEFO batch allocation and receipt printing.
- `/pharmacy/prescriptions` — Clinical prescriptions directory, diagnosis tracking, and doctor order logs.
- `/pharmacy/inventory` — Medications master catalog, generic mappings, unit pricing, margins, and rack locations.
- `/pharmacy/batches` — Batch & expiry tracker with shelf-life alerts and stock audit adjustments.
- `/pharmacy/suppliers` — Pharmaceutical suppliers directory and Purchase Orders with Goods Received (GRN).
- `/pharmacy/history` — Archived dispensing transactions ledger and printable receipts.
- `/pharmacy/reports` — Pharmacy financial analytics, COGS, gross margins, fast-moving drugs, and expiry risk audit.

---

## 4. Accounting Basis & Single Source of Truth

The application implements a **simplified accrual accounting model**:
- **Gross Service Revenue**: Derived from all confirmed invoice line items.
- **Adjustments**: Explicit deduction of discounts and approved refunds.
- **Net Revenue**: $\text{Gross Revenue} - \text{Discounts} - \text{Refunds}$.
- **Doctor Fees**: Direct costs calculated per doctor payout rule (either fixed per consultation or percentage of consultation fee).
- **Gross Profit**: $\text{Net Revenue} - \text{Doctor Fees}$.
- **Operating Expenses**: Sum of all recorded operational disbursements in the period.
- **Net Profit**: $\text{Gross Profit} - \text{Operating Expenses}$.
- **Cash Collections & Receivables**: Billed revenue, cash collected to date, and outstanding balances are tracked as independent metrics. Dashboard figures, report totals, and P&L inputs are derived from the exact same records (`logic.ts`).

---

## 5. Production Integration & Architecture Notes

1. **Atomic Queue Number Allocation**:
   - In production, session queue numbers must be allocated via an atomic database sequence (`SELECT nextval(...)` or `UPDATE sessions SET next_queue = next_queue + 1 RETURNING next_queue`) within a transaction to guarantee monotonic, gapless, and collision-free numbers under concurrent reception submissions.
2. **Server-Side Authorization**:
   - In addition to UI guards (`Guard` / `can()`), all API routes and database mutations must enforce server-side session authentication and role validation.
3. **Payment Gateway Integration**:
   - The POS and invoice collection interfaces are currently configured in demo mode with a visible honest disclaimer. In production, integrate webhook listeners for real-time payment gateway callbacks with idempotency keys.
4. **SMS Gateway & Delivery Webhooks**:
   - SMS notifications are currently simulated. In production, connect an SMS provider (e.g., Twilio, Dialog SMS Gateway) using server-side API keys, mapping provider delivery receipts to update message statuses to `Delivered` or `Failed`.
5. **Secure E-Bill Sharing**:
   - E-bills use cryptographically signed tokens (`/ebill/$id?token=...`) with short expiration windows to allow patient viewing without requiring patient portal authentication while preventing enumeration.
6. **Timezone Handling**:
   - All server timestamps are persisted in ISO 8601 UTC format. Client displays format dates in the clinic's local timezone (`Asia/Colombo` default) configured in Settings.
7. **Production Identity Provider & Session Management**:
   - In production, replace the demo `authService` with an enterprise identity provider (OIDC / OAuth 2.0 / SAML) or server-issued signed session tokens stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies. Passwords must never enter browser storage.
8. **Rate Limiting & Account Lockout**:
   - Enforce IP- and username-bucketed sliding window rate limits (e.g. max 5 failed attempts per 5-minute window) at the API gateway / edge layer, backed by Redis or database counters with automated lockout notifications.
9. **Multi-Factor Authentication (MFA)**:
   - Clinical staff, administrators, and cashier users must mandate second-factor authentication (TOTP or SMS OTP) before accessing financial or patient health information (PHI).
10. **Password Reset & Audit Trail**:
   - Password reset requires cryptographically secure, time-limited, single-use tokens dispatched through server-side email/SMS gateways. All sign-in attempts, session revocations, and role changes must be recorded in an immutable audit ledger.

---

## 6. Operations Dashboard Architecture

### Metric Definitions & Single Source of Truth
- **Billed Revenue**: Value of all rendered outpatient consultations and diagnostic services less discounts and voided bills.
- **Cash Collected**: Gross sum of verified payments collected across Cash, Card, and Bank Transfer.
- **Refunds**: Authorized patient refunds counted once and never double-deducted.
- **Net Collections**: $\text{Cash Collected} - \text{Refunds}$.
- **Outstanding Receivables**: Remaining balance due on confirmed, non-voided invoices.
- **Today's Appointments**: Total scheduled outpatient appointments for today's active sessions.
- **Waiting Patients**: Number of registered patients currently waiting in consultation queues.
- **Available Doctors**: Physicians currently holding active consultation sessions today.

### Kept Widgets & Hard Caps
The operations dashboard is strictly capped at **5 KPI cards, 3 charts, and 4 panels** to eliminate noise and maintain high scannability:
1. **5 KPI Cards**:
   - *Today's appointments* (with delta vs yesterday)
   - *Waiting patients* (active queue load)
   - *Available doctors* (on-duty count vs total)
   - *Today's net collections* (collections with cash collected & refunds tooltip split)
   - *Outstanding invoice balance* (unpaid receivables balance)
2. **3 Charts**:
   - *Daily net collections* (Area chart, brand blue, split breakdown in tooltip)
   - *Appointment volume* (Stacked bar by status with daily/weekly period toggle)
   - *Revenue by service category* (Donut chart with amount/percentage and click-through to `/reports`)
3. **4 Panels** (Compact lists, max 5 rows, with "View all" link):
   - *Today's doctor sessions* (doctor, time, room, status, booked/max capacity)
   - *Upcoming sessions* (next 48 hours preview)
   - *Recent payments* (receipt no., method, amount, status)
   - *Failed booking messages* (SMS exception alert with simulated retry action)

### Widget-by-Role Matrix

| Widget | Type | Admin | Manager | Receptionist | Nurse |
|--------|------|-------|---------|--------------|-------|
| **Today's Appointments** | KPI Card | Yes | Yes | Yes | Yes |
| **Waiting Patients** | KPI Card | Yes | Yes | Yes | Yes |
| **Available Doctors** | KPI Card | Yes | Yes | Yes | Yes |
| **Today's Net Collections** | KPI Card | Yes | Yes | Yes | **Hidden** |
| **Outstanding Invoice Balance** | KPI Card | Yes | Yes | Yes | **Hidden** |
| **Daily Net Collections** | Chart (Area) | Yes | Yes | Yes | **Hidden** |
| **Revenue by Service Category** | Chart (Donut) | Yes | Yes | Yes | **Hidden** |
| **Appointment Volume** | Chart (Stacked Bar) | Yes | Yes | Yes | Yes |
| **Today's Doctor Sessions** | Panel | Yes | Yes | Yes | Yes |
| **Upcoming Sessions** | Panel | Yes | Yes | Yes | Yes |
| **Recent Payments** | Panel | Yes | Yes | Yes | **Hidden** |
| **Failed Booking Messages** | Panel | Yes | Yes | Yes | Yes |

### Animation & Accessibility Standards
- **Count-Up Animation**: Numerical and monetary metrics count up smoothly via `useCountUp` (~800ms ease-out).
- **Reduced Motion Support**: All animations and transitions strictly respect `prefers-reduced-motion` via `useReducedMotion`, instantly rendering final values.
- **Accessible Alternatives**: Charts include text descriptions, ARIA attributes, and accessible table toggles.
- **Direct Labeling**: Statuses, deltas, and chart legends incorporate explicit text descriptions alongside color indicators.



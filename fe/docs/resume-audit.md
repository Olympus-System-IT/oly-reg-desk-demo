# Resume Audit — Hospital Management System

_Date: 2026-10-10 · Auditor: Senior Product Designer & Senior Next.js/TanStack Engineer_

---

## 1. Stack and Versions

| Layer | Library / Tool | Version | Notes |
|-------|----------------|---------|-------|
| Framework | **TanStack Start** (file-based routing) | `@tanstack/react-start` 1.168.60 | Nitro engine + Vite client |
| Runtime | React | 19.2.0 | React 19 concurrent client components |
| Styling | **Tailwind CSS v4** | 4.2.1 (`@tailwindcss/vite`) | `@theme` tokens, IBM Plex Sans font |
| UI Primitives | **shadcn/ui** | Radix UI (New York style) | 46 primitives installed |
| Charts | **Recharts** | 2.15.4 | Used for P&L, category breakdown, revenue series |
| Icons | **Lucide React** | 0.575.0 | Complete medical & POS icon set |
| Forms & Validation | **React Hook Form** + **Zod** | RHF 7.71.2 · Zod 3.25.76 | Schema validation on all modals & forms |
| Date Utilities | **date-fns** | 4.1.0 | Date formatting, differenceInYears, relative dates |
| Toast Notifications | **sonner** | 2.0.7 | Success, error, and status feedback |
| State & Persistence | Custom External Store | `useSyncExternalStore` | `localStorage` persistence (`hms-demo-db`) + deterministic seed |

---

## 2. Folder Conventions

- `fe/src/routes/`: File-based route definitions (`_shell.*.tsx` for authenticated shell, `index.tsx` for login, `modules.tsx` for module selector).
- `fe/src/components/ui/`: Standard shadcn/ui components (Button, Dialog, Input, Table, etc.).
- `fe/src/components/hms/`:
  - `app-shell.tsx`: Main navigation sidebar, module switcher, user menu, breadcrumbs.
  - `common.tsx`: Shared UI components (`PageHeader`, `StatusBadge`, `Panel`, `Stat`, `Field`, `NativeSelect`, `Empty`, `Denied`, `Guard`, `TableWrap`, `ConfirmDialog`, `PageLoader`, `TableSkeleton`, `StatSkeleton`).
- `fe/src/lib/hms/`:
  - `types.ts`: TypeScript data contracts for all 14 entities and DB schema.
  - `permissions.ts`: RBAC permission definitions, `can()`, `permsFor()`, `modulesFor()`.
  - `seed.ts`: Deterministic seeded PRNG generator.
  - `store.ts`: Reactive state store with `localStorage` persistence, `mutate()`, `resetDemo()`.
  - `logic.ts`: Accounting formulas (`invoiceTotals`, `computePnL`), formatters (`money`, `fmtDate`), scheduling utilities (`findConflict`, `sessionBookable`).
- `fe/src/test/`: Vitest test suites for routing, permission boundaries, and accounting reconciliation.

---

## 3. Navigation Source of Truth

### SFA (Administration Module — Admin Only)
| Group | Label | Icon | Route | Required Permission | Visibility |
|-------|-------|------|-------|---------------------|------------|
| Overview | Dashboard | `LayoutDashboard` | `/dashboard` | `dashboard.view` | Admin |
| Setup | Specialties | `Tags` | `/specialties` | `setup.manage` | Admin |
| Setup | Doctors | `Stethoscope` | `/doctors` | `setup.manage` | Admin |
| Setup | Doctor sessions | `CalendarClock` | `/sessions` | `sessions.view` | Admin |
| Setup | Services & Modalities | `FlaskConical` | `/services` | `setup.manage` | Admin |
| Administration | Users | `Users` | `/users` | `users.manage` | Admin |
| Administration | Approvals | `ShieldCheck` | `/approvals` | `refund.approve` | Admin |
| Administration | Reports & P&L | `BarChart3` | `/reports` | `reports.view` | Admin |
| Administration | Settings | `Settings` | `/settings` | `setup.manage` | Admin |

### Billing (Reception & Cashier Module)
| Group | Label | Icon | Route | Required Permission | Visibility |
|-------|-------|------|-------|---------------------|------------|
| Overview | Dashboard | `LayoutDashboard` | `/dashboard` | `dashboard.view` | Admin, Manager |
| Reception | New booking | `CalendarPlus` | `/book` | `bookings.manage` | Admin, Receptionist |
| Reception | Patients | `UserPlus` | `/patients` | `patients.view` | Admin, Manager, Receptionist, Nurse |
| Reception | Appointments | `ClipboardList` | `/appointments` | `patients.view` | Admin, Manager, Receptionist, Nurse |
| Reception | Queue | `ListOrdered` | `/queue` | `queue.update` | Admin, Manager, Receptionist, Nurse |
| Reception | Doctor sessions | `CalendarClock` | `/sessions` | `sessions.view` | Admin, Manager, Receptionist, Nurse |
| Reception | SMS Centre | `MessageSquare` | `/messages` | `patients.view` | Admin, Receptionist, Manager |
| Cashier | POS | `CreditCard` | `/pos` | `billing.collect` | Admin, Receptionist |
| Cashier | Invoices | `Receipt` | `/invoices` | `billing.view` | Admin, Manager, Receptionist |
| Cashier | Expenses | `Wallet` | `/expenses` | `expenses.manage` | Admin, Manager |
| Cashier | Reports | `BarChart3` | `/reports` | `reports.view` | Admin, Manager |

---

## 4. Route Status Matrix

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/` | `index.tsx` | COMPLETE | Login & demo role selection |
| `/modules` | `modules.tsx` | COMPLETE | Module picker (SFA vs Billing) |
| `/dashboard` | `_shell.dashboard.tsx` | COMPLETE | Live KPI cards, queue count, today collections, outstanding |
| `/specialties` | `_shell.specialties.tsx` | COMPLETE | List, add/edit specialty modal, activate/deactivate |
| `/doctors` | `_shell.doctors.tsx` | COMPLETE | Doctor directory, search, fee & payout rule configuration |
| `/doctors/$id` | `_shell.doctors.$id.tsx` | COMPLETE | Profile, consultation fee, session history, scheduled appointments |
| `/sessions` | `_shell.sessions.tsx` | COMPLETE | Calendar & list views, conflict prevention, schedule new sessions |
| `/sessions/$id` | `_shell.sessions.$id.tsx` | COMPLETE | Live session attendance, queue advancement, session cancellation |
| `/services` | `_shell.services.tsx` | COMPLETE | Services & modalities, price edit with audit history |
| `/users` | `_shell.users.tsx` | COMPLETE | User management, role assignment, P&L access grant toggle |
| `/settings` | `_shell.settings.tsx` | COMPLETE | Hospital details, prefixes, templates, and full audit log viewer |
| `/book` | `_shell.book.tsx` | COMPLETE | Multi-step booking wizard, patient select/add, pay now option |
| `/patients` | `_shell.patients.tsx` | COMPLETE | Searchable patient directory, quick register dialog |
| `/patients/$id` | `_shell.patients.$id.tsx` | COMPLETE | Demographics, appointment history, invoices list |
| `/appointments` | `_shell.appointments.tsx` | COMPLETE | Searchable appointments, status filter, cancel/no-show actions |
| `/queue` | `_shell.queue.tsx` | COMPLETE | Today's OPD queue, call next patient, status transitions |
| `/pos` | `_shell.pos.tsx` | COMPLETE | Outpatient point of sale, item basket, discount, receipt print |
| `/invoices` | `_shell.invoices.tsx` | COMPLETE | Filterable invoice ledger, balance badges, links to details |
| `/invoices/$id` | `_shell.invoices.$id.tsx` | COMPLETE | Line items, collect payment towards balance, refund, void, 80mm/A4/E-Bill print |
| `/expenses` | `_shell.expenses.tsx` | COMPLETE | Expense ledger, category chart, add/edit modal, CSV export |
| `/reports` | `_shell.reports.tsx` | COMPLETE | Reports hub: P&L statement, daily collections, doctor payables, CSV export |
| `/messages` | `_shell.messages.tsx` | COMPLETE | SMS history, simulated carrier delivery, retry failed, compose SMS |
| `/approvals` | `_shell.approvals.tsx` | COMPLETE | Queue for refunds, invoice voids, and booking capacity overrides |

---

## 5. Design System Implementation

- **Color Tokens**:
  - Primary Blue `#1729C4` for buttons, active sidebar links, key badges.
  - Brand Red `#DD0607` for destructive actions, voids, refunds, cancel warnings.
  - Success Green for Paid, Completed, Delivered states.
  - Amber for Waiting, Partially Paid, Delayed, Pending states.
- **Typography**: IBM Plex Sans with high tabular numeric legibility (`tabular` class).
- **Responsive Layout**: Designed for 1440px desktop, 1024px tablet, 768px small tablet, 390px mobile.
- **Print View**: Clean print layouts hiding navigation and action bars (`.no-print { display: none !important; }`), formatted 80mm thermal receipt and A4 invoice views.

---

## 6. Accounting & Reconciliation Verification

- **Accounting Basis**: Simplified accrual accounting. Confirmed invoices minus discounts and refunds yield Net Revenue. Doctor fees represent direct expenses. Net Revenue minus Doctor Fees minus Operating Expenses equals Net Profit.
- **Single Source of Truth**:
  - `invoiceTotals(inv)` derives status, balance, paid, and refunds for POS, Invoices, Dashboard, and Reports.
  - Dashboard today's collections reconciles with Daily Collections Report.
  - Total outstanding balance matches across Dashboard, Invoices list, Outstanding Report, and P&L inputs.
  - Automated Vitest verification in `reconciliation.test.ts` validates 100% mathematical consistency.

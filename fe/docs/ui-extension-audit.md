# UI Extension Audit — Hospital Management System

_Generated: 2026-10-10 · Auditor: Antigravity_

---

## 1. Stack and Versions

| Layer | Library | Version |
|-------|---------|---------|
| Framework | **TanStack Start** (TanStack Router file-based) | `@tanstack/react-start` 1.168.60 |
| Runtime | React | 19.2.0 |
| Styling | **Tailwind CSS v4** | 4.2.1 (via `@tailwindcss/vite`) |
| Component primitives | **shadcn/ui** (new-york style) | All Radix primitives installed |
| Charts | **Recharts** | 2.15.4 |
| Icons | **Lucide React** | 0.575.0 |
| Forms | **React Hook Form** + **Zod** | RHF 7.71.2 · Zod 3.25.76 |
| Date utilities | **date-fns** | 4.1.0 |
| Calendar UI | **react-day-picker** | 9.14.0 |
| Toast | **sonner** | 2.0.7 |
| State management | Custom `useSyncExternalStore` store with `localStorage` persistence (no Redux/Zustand) |
| Routing | TanStack Router -- file-based routing, auto-generates `routeTree.gen.ts` |
| Build | Vite 8.1.5 via `@lovable.dev/vite-tanstack-config` |
| Testing | Vitest + Testing Library |
| Package manager | pnpm (lock file present) |

Note: This is NOT Next.js App Router. All components are client components by nature (browser SPA with optional SSR via Nitro).

---

## 2. Folder Structure

```
fe/src/
  routes/                     TanStack Router file-based routes
    __root.tsx                  Shell + error/404 components
    index.tsx                   Login page (/)
    modules.tsx                 Module picker (/modules)
    _shell.tsx                  Authenticated shell layout (/_shell)
    _shell.dashboard.tsx        /dashboard  EXISTS
    _shell.queue.tsx            /queue      EXISTS
    [all other routes]          MISSING -- return 404
  components/
    ui/                         46 shadcn/ui primitives (full set)
    hms/
      app-shell.tsx             Sidebar, header, breadcrumbs, module switcher
      common.tsx                PageHeader, StatusBadge, Panel, Stat, Field,
                                NativeSelect, Empty, Denied, Guard, TableWrap
  lib/
    hms/
      types.ts                  All entity types (DB, 14 entity interfaces)
      permissions.ts            Perm union, ROLE_PERMS, can(), modulesFor()
      seed.ts                   Deterministic seeded-PRNG generator (DB_VERSION 3)
      store.ts                  In-memory store with localStorage, mutate(), resetDemo()
      logic.ts                  money(), invoiceTotals(), patientAge(), sessionBooked(),
                                sessionLabel(), findConflict(), sessionBookable(), inRange()
    utils.ts                    cn() helper
  styles.css                    Tailwind v4 @theme, :root tokens, .dark, @media print
  routeTree.gen.ts              Auto-generated -- do NOT edit
```

---

## 3. Sidebar Navigation Inventory

### SFA Module (Admin-only)

| Label | href | Permission | Page exists? |
|-------|------|------------|-------------|
| Dashboard | `/dashboard` | `dashboard.view` | YES |
| Specialties | `/specialties` | `setup.manage` | NO |
| Doctors | `/doctors` | `setup.manage` | NO |
| Doctor sessions | `/sessions` | `sessions.view` | NO |
| Services & Modalities | `/services` | `setup.manage` | NO |
| Users | `/users` | `users.manage` | NO |
| Reports & P&L | `/reports` | `reports.view` | NO |
| Settings | `/settings` | `setup.manage` | NO |

### Billing Module (all roles)

| Label | href | Permission | Page exists? |
|-------|------|------------|-------------|
| Dashboard | `/dashboard` | `dashboard.view` | YES (shared) |
| New booking | `/book` | `bookings.manage` | NO |
| Patients | `/patients` | `patients.view` | NO |
| Appointments | `/appointments` | `patients.view` | NO |
| Queue | `/queue` | `queue.update` | YES |
| Doctor sessions | `/sessions` | `sessions.view` | NO (shared) |
| POS | `/pos` | `billing.collect` | NO |
| Invoices | `/invoices` | `billing.view` | NO |
| Expenses | `/expenses` | `expenses.manage` | NO |
| Reports | `/reports` | `reports.view` | NO (shared) |

---

## 4. 404 Inventory

### Primary routes (sidebar links)
| Route | File to create |
|-------|---------------|
| `/specialties` | `_shell.specialties.tsx` |
| `/doctors` | `_shell.doctors.tsx` |
| `/sessions` | `_shell.sessions.tsx` |
| `/services` | `_shell.services.tsx` |
| `/users` | `_shell.users.tsx` |
| `/reports` | `_shell.reports.tsx` |
| `/settings` | `_shell.settings.tsx` |
| `/book` | `_shell.book.tsx` |
| `/patients` | `_shell.patients.tsx` |
| `/appointments` | `_shell.appointments.tsx` |
| `/pos` | `_shell.pos.tsx` |
| `/invoices` | `_shell.invoices.tsx` |
| `/expenses` | `_shell.expenses.tsx` |

### Detail routes
| Route | File to create |
|-------|---------------|
| `/doctors/$id` | `_shell.doctors.$id.tsx` |
| `/patients/$id` | `_shell.patients.$id.tsx` |
| `/invoices/$id` | `_shell.invoices.$id.tsx` |
| `/sessions/$id` | `_shell.sessions.$id.tsx` |

---

## 5. Design System

### Color Tokens
- `--primary` ~ #1729C4 blue: brand primary, buttons, active nav
- `--brand-red` / `--destructive` ~ #DD0607: destructive actions, brand red accent
- `--success`: Paid, Completed, Active badges
- `--warning`: Delayed, Partially Paid, Waiting badges
- `--danger-soft`: error badge backgrounds
- `--info-soft`: info/blue badge backgrounds
- Font: IBM Plex Sans

### Pattern Summary
- PageHeader: title + description + actions row
- Panel: rounded-lg border bg-card shadow-xs
- Stat: KPI card with label + value + optional link
- StatusBadge: rounded-full colored pill with dot
- DataTable: overflow-x-auto table with divide-y rows
- Print: @media print hides .no-print elements

---

## 6. Data Layer

### Current Seed (DB_VERSION 3)
- 6 specialties, 8 doctors, 11 services, 5 users, 42 patients
- Sessions: -28 to +10 days
- Invoices with payments, some partial, some refunded
- Expenses: -28 to 0 days, ~15 records

### Missing / Needs Extension
- `AuditEntry` type and `auditLog` array
- `Message` entity (SMS log) -- currently inline MessageStatus on Appointment
- `reference` field on Expense
- More patients (~80), more services (~20), more invoice statuses
- Receipt separate numbering
- More realistic session history

---

## 7. Existing Shared Components

| Component | Notes |
|-----------|-------|
| PageHeader | title, description, actions slot |
| Panel | card container |
| Stat | KPI card with optional link |
| StatusBadge | color-coded pill |
| Field | form field wrapper with label/error |
| Guard | permission gate |
| Empty | empty state |
| TableWrap | overflow-x-auto wrapper |
| All shadcn/ui | Button, Input, Dialog, Sheet, Tabs, Badge, Calendar, Chart, Table, Select, Form, etc. |

### Missing (to add)
- `ConfirmDialog` (reason textarea for destructive actions)
- Generic sortable/filterable table (extend TableWrap pattern)
- `DateRangePicker`
- `ChartCard` (Recharts wrapper with title/loading/empty)

---

## 8. Gaps and Inconsistencies

1. 42 patients is below target; seed needs expansion
2. No messages table -- SMS status is inline on Appointment
3. No audit log table
4. Session series not modeled as entity
5. Receipt numbering missing (only Invoice no exists)
6. Expense lacks reference field
7. InvoiceLine.doctorId typed as string but seeded with undefined-cast
8. DB_VERSION must be bumped when adding new fields
9. Dashboard not role-aware for nurse (shows Denied via Guard, which is correct)
10. TITLES breadcrumb map missing some segments

---

## Implementation Plan

### Execution Order

**Step 1**: Extend types + seed (DB_VERSION 4)
- Add AuditEntry, Message types; auditLog + messages arrays to DB
- Add reference to Expense; fix InvoiceLine doctorId type  
- Expand patients to ~80, services to ~20
- Add Failed messages for retry demo
- Add audit log entries

**Step 2**: Shared components
- ConfirmDialog with optional reason textarea
- ChartCard (Recharts wrapper)
- DateRangePicker

**Step 3**: SFA screens (Admin only)
- /specialties: list + CRUD dialog
- /doctors: list + form + /doctors/$id detail tabs
- /sessions: list/calendar + session form + conflict detection
- /services: list + form + price history
- /users: list + CRUD + activate/deactivate
- /settings: hospital form + audit log viewer
- /reports: P&L + daily collections + appointments

**Step 4**: Billing screens
- /patients: search + registration + /patients/$id
- /book: wizard (patient -> session -> payment -> receipt)
- /appointments: list + filters
- /pos: invoice builder + payment + receipt
- /invoices: list + /invoices/$id detail
- /expenses: list + form + chart

**Step 5**: Print routes (minimal layout)

**Step 6**: Dashboard enhancements (charts, role-aware)

**Step 7**: TypeScript check + verification

### Assumptions
1. TanStack Start (not Next.js) -- no Server Components distinction
2. DB_VERSION bump discards localStorage (by design)
3. /sessions and /reports are shared routes -- role-aware UI within same file
4. Print routes use flat route files without _shell layout
5. SMS "Delivered" not generated (no simulated webhook)
6. Queue numbers: preserved from seed, never reused after cancellation
7. Recurring sessions: seriesId groups sessions; full recurrence UI is deferred

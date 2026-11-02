# Dashboard Audit & Architecture Plan

_Date: 2026-10-10 · Role: Senior Product Designer, Data-Visualization Specialist & Senior Next.js/TanStack Engineer_

---

## 1. Dashboard Routes Inventory

| Route | File Path | Existing Implementation | Roles & Access |
|-------|-----------|-------------------------|----------------|
| `/dashboard` | `fe/src/routes/_shell.dashboard.tsx` | Renders 5 static `Stat` cards (`Today's appointments`, `Waiting`, `Doctors on duty`, `Collected today`, `Outstanding`). Leaves ~85% of screen empty. | Gated by `dashboard.view`. Currently visible to Admin & Manager. Should also support Receptionist & Nurse with role-tailored operational data. |
| `/queue` | `fe/src/routes/_shell.queue.tsx` | Today's OPD attendance queues by doctor session. | Gated by `queue.update`. Accessible to Admin, Manager, Receptionist, Nurse. |

---

## 2. Existing Components & Design System Tokens

### Primitives & Common Components
- `PageHeader` (`fe/src/components/hms/common.tsx`): Title, description, and action button container.
- `Stat` (`common.tsx`): Basic stat card with label, value, hint, and link.
- `Panel` (`common.tsx`): Card wrapper with header and border.
- `StatusBadge` (`common.tsx`): Pill badge supporting tones (`blue`, `green`, `amber`, `red`, `gray`).
- `TableWrap`, `Empty`, `Denied`, `Guard`, `ConfirmDialog`.
- All Radix UI / shadcn primitives (Dialog, Select, Tabs, Popover, Switch, Tooltip).

### Design System Tokens
- **Primary Brand Blue**: `#1729C4` (`--primary`). Active elements, primary chart series, focus rings.
- **Brand Red**: `#DD0607` (`--destructive`). Refunds, voids, cancellations, failed messages.
- **Success Green**: `#10b981` / `--success`. Paid status, completed visits, positive deltas.
- **Warning Amber**: `#f59e0b` / `--warning`. Waiting status, delayed sessions, high capacity warnings.
- **Secondary Blues / Slate**: `#3b82f6`, `#60a5fa`, `#93c5fd`, `#64748b` for chart category palettes.
- **Typography**: IBM Plex Sans with tabular numeral rendering (`font-variant-numeric: tabular-nums`).

---

## 3. Installed Packages & Capabilities

- **Charts**: `recharts` 2.15.4 installed and fully operational (`AreaChart`, `BarChart`, `PieChart`, `ComposedChart`, `ResponsiveContainer`, `Tooltip`, `Legend`).
- **Icons**: `lucide-react` 0.575.0 (complete medical, navigation, financial icons).
- **Date Utilities**: `date-fns` 4.1.0 (`format`, `addDays`, `subDays`, `differenceInDays`, `parseISO`).
- **Animation Framework**: No bloated third-party animation libraries needed. We will implement:
  - Recharts built-in animation (`isAnimationActive`, `animationDuration={800}`, `animationEasing="ease-out"`).
  - Micro-hook `useInView` via standard `IntersectionObserver` to trigger animations only when scrolled into view.
  - Micro-hook `useCountUp` via `requestAnimationFrame` for smooth metric count-ups.
  - Micro-hook `useReducedMotion` checking `window.matchMedia('(prefers-reduced-motion: reduce)')` to disable all animation for accessibility.
  - Tailwind v4 CSS keyframes for staggered card entrances.

---

## 4. Data Layer & History Depth

- **Deterministic Seed (`seed.ts`)**:
  - 80 patients with realistic age and address distributions.
  - 14 doctors across 9 medical specialties with consultation fees and payout rules.
  - 75 days of doctor sessions (-60 days to +14 days).
  - Hundreds of appointments covering `Booked`, `Waiting`, `In Consultation`, `Completed`, `Cancelled`, `No-show`.
  - Invoices with multiple line items, discounts, payments across Cash/Card/Bank transfer, refunds, and voids.
  - 90 days of categorized operational expenses.
  - Outbound SMS message logs with `Delivered`, `Sent`, `Pending`, `Failed` statuses.
- **Single Source of Truth**:
  - All figures derive directly from `db.appointments`, `db.sessions`, `db.invoices`, `db.expenses`, `db.messages`.
  - No hardcoded totals exist on the dashboard.

---

## 5. Empty-Space & Breakpoint Analysis

- **1440px Desktop**: The existing 5 `Stat` cards span a single row (~110px). The remaining ~750px vertical viewport and entire lower screen is empty whitespace.
- **1024px Tablet**: 2 rows of stat cards, leaving ~70% of the screen blank.
- **768px Small Tablet & 390px Mobile**: Leaves the page sparse with no operational insights or charts.
- **Target Solution**: Dense, 12-column responsive layout filled with 6 KPI cards, 12 interactive charts, and 6 operational panels.

---

## 6. Widget Architecture Plan

### KPI Header (6 Cards)
1. **Today's Appointments** (count, sparkline, delta vs previous period)
2. **Waiting Patients** (active queue load, delta)
3. **Doctors On Duty** (available rooms & active sessions)
4. **Net Collections** (period cash less refunds, sparkline, delta, accounting basis tooltip)
5. **Outstanding Receivables** (uncollected invoice balances)
6. **Cancellation & No-show Rate** (percentage with threshold warning)

### Hero Charts (Row 1 & 2)
- **Daily Net Collections** (8 cols): Area chart with gradient fill, compare overlay, average line.
- **Revenue by Service Category** (4 cols): Donut chart with center total and interactive legend.
- **Appointment Volume by Status** (6 cols): Stacked daily/weekly bar chart.
- **Billed vs Collected vs Refunds** (6 cols): Composed bar + line chart with red refund series.

### Secondary Charts & Visualizations (Row 3 & 4)
- **Peak-Hours Heatmap** (4 cols): Weekday x Hour density matrix.
- **Appointments by Specialty** (4 cols): Horizontal sorted bar chart.
- **Doctor Session Utilisation** (4 cols): Capacity gauge / progress bullets with amber overload warnings.
- **Payment Method Mix** (4 cols): Cash vs Card vs Bank Transfer donut.
- **Receivables Ageing** (4 cols): Aging buckets (0-7d, 8-30d, 31-60d, 60d+).
- **Message Delivery Status** (4 cols): Bar/Donut with "Simulated SMS" banner.

### Operational Panels (Row 5 & 6)
- **Today's Doctor Sessions** (6 cols): Live doctor, room, time, booked/max progress, live status.
- **Live Queue Snapshot** (6 cols): Current patient waiting room funnel and next-in-line list.
- **Upcoming Sessions** (4 cols): Next 48 hours session schedule.
- **Recent Payments** (4 cols): Real-time receipt ticker with payment methods.
- **Failed Messages & Approvals** (4 cols): Retry action for failed SMS and pending refund alerts.
- **Top Services & Top Doctors by Revenue** (6 cols each): Ranked revenue drivers with inline progress.
- **Revenue vs Expenses Trend** (Gated for Admin / Manager with P&L grant).

---

## 7. Role-Based Permissions & Data Sanitization

- **Admin**: Full access to all clinical, operational, financial, expense, and approval widgets.
- **Manager**: Full operational, queue, collections, and receivables access. Revenue vs Expenses displayed only if `grantPL` is active.
- **Receptionist / Cashier**: Bookings, queue, session status, own collections, and receivables. No expenses, P&L, or staff approvals.
- **Nurse**: Sessions, queue, appointment volume, peak hours, doctor utilisation. **Zero financial data, zero money figures displayed.**

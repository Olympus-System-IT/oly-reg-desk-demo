# Dashboard Cleanup & Inventory Audit

_Date: 2026-10-10 · Role: Senior Product Designer & Senior Next.js/TanStack Engineer_

---

## 1. Inventory & Decisions (KEEP vs REMOVE)

| Widget / Item | Type | Component File | Selector / Service | Other Importers | Roles | Decision | Rationale |
|---------------|------|----------------|--------------------|-----------------|-------|----------|-----------|
| **Today's Appointments** | KPI Card | `KpiCard.tsx` | `getDashboardSummary` | Dashboard only | All | **KEEP** | Core operational metric for clinic flow |
| **Waiting Patients** | KPI Card | `KpiCard.tsx` | `getDashboardSummary` | Dashboard only | All | **KEEP** | Immediate queue load indicator |
| **Available Doctors** | KPI Card | `KpiCard.tsx` | `getDashboardSummary` | Dashboard only | All | **KEEP** | On-duty physician availability |
| **Today's Net Collections** | KPI Card | `KpiCard.tsx` | `getDashboardSummary` | Dashboard only | Non-nurse | **KEEP** | Net collections with cash/refund breakdown in tooltip |
| **Outstanding Balance** | KPI Card | `KpiCard.tsx` | `getDashboardSummary` | Dashboard only | Non-nurse | **KEEP** | Uncollected receivables total |
| **Cancellation / No-Show Rate** | KPI Card | `KpiCard.tsx` | `getDashboardSummary` | Dashboard only | All | **REMOVE** | Exceeds 5 KPI limit; details available in Reports |
| **Sparklines on KPI Cards** | KPI Graphic | `Sparkline.tsx` | `getDashboardSummary` | Dashboard only | All | **REMOVE** | Visual clutter; prompt requires removal |
| **Daily Net Collections** | Chart | `CollectionsAreaChart.tsx` | `getCollectionsTrend` | Dashboard only | Non-nurse | **KEEP** | Primary financial timeline; stripped of overlays |
| **Appointment Volume** | Chart | `AppointmentVolumeChart.tsx` | `getAppointmentVolume` | Dashboard only | All | **KEEP** | Primary clinical volume trend (daily/weekly) |
| **Revenue by Category** | Chart | `RevenueDonut.tsx` | `getRevenueByCategory` | Dashboard only | Non-nurse | **KEEP** | Category breakdown with click-through to `/reports` |
| **Peak-Hours Heatmap** | Chart | `PeakHoursHeatmap.tsx` | `getPeakHoursHeatmap` | Dashboard only | All | **REMOVE** | Heavy visualization; better suited to specialized report |
| **Appointments by Specialty** | Chart | `SpecialtyBarChart.tsx` | `getSpecialtyVolume` | Dashboard only | All | **REMOVE** | Redundant with Reports Hub; removes visual noise |
| **Doctor Utilisation** | Chart | `UtilisationChart.tsx` | `getDoctorUtilisation` | Dashboard only | All | **REMOVE** | Capacity details accessible via Doctor Sessions |
| **Billed vs Collected vs Refunds** | Chart | `BilledVsCollectedChart.tsx` | `getBilledVsCollected` | Dashboard only | Non-nurse | **REMOVE** | Replaced by clean tooltip on Daily Net Collections |
| **Payment Method Mix** | Chart | `PaymentMixChart.tsx` | `getPaymentMix` | Dashboard only | Non-nurse | **REMOVE** | Covered in Daily Collections Report |
| **Receivables Ageing** | Chart | `AgeingChart.tsx` | `getReceivablesAgeing` | Dashboard only | Non-nurse | **REMOVE** | Covered in Outstanding Balances Report |
| **Message Delivery Status** | Chart | `MessageStatusChart.tsx` | `getMessageDeliveryStatus` | Dashboard only | All | **REMOVE** | Telemetry covered in SMS Centre |
| **OPD Queue Funnel** | Chart | `QueueFunnel.tsx` | `getQueueFunnel` | Dashboard only | All | **REMOVE** | Redundant with Waiting KPI and Queue page |
| **Top Diagnostic Services** | Ranked List | `RankedList.tsx` | `getTopServices` | Dashboard only | Non-nurse | **REMOVE** | Covered in Service Revenue Report |
| **Top Performing Consultants** | Ranked List | `RankedList.tsx` | `getTopDoctors` | Dashboard only | Non-nurse | **REMOVE** | Covered in Doctor Fees / Payables Report |
| **Revenue vs Operating Costs (P&L)** | Chart | `RevenueVsExpensesChart.tsx` | `getRevenueVsExpenses` | Dashboard only | Admin/Manager | **REMOVE** | P&L statement available in Reports Hub |
| **Today's Doctor Sessions** | Panel | `TodaySessionsPanel.tsx` | `getOperationalPanels` | Dashboard only | All | **KEEP** | Immediate duty schedule (max 5 rows) |
| **Upcoming Sessions** | Panel | `UpcomingSessionsPanel.tsx` | `getOperationalPanels` | Dashboard only | All | **KEEP** | Next 48h schedule (max 5 rows) |
| **Recent Payments Ticker** | Panel | `RecentPaymentsPanel.tsx` | `getOperationalPanels` | Dashboard only | Non-nurse | **KEEP** | Real-time cash desk audit (max 5 rows) |
| **Failed Messages Panel** | Panel | `FailedMessagesPanel.tsx` | `getOperationalPanels` | Dashboard only | All | **KEEP** | Immediate exception alert with Retry action (max 5 rows) |
| **Alerts Panel** | Panel | `AlertsPanel.tsx` | `getOperationalPanels` | Dashboard only | All | **REMOVE** | Removes banner clutter; status reflected in session badges |
| **Live Queue Snapshot** | Panel | `LiveQueuePanel.tsx` | `getOperationalPanels` | Dashboard only | All | **REMOVE** | Direct queue management lives on `/queue` |
| **Pending Approvals** | Panel | `PendingApprovalsPanel.tsx` | `getOperationalPanels` | Dashboard only | Admin | **REMOVE** | Approvals managed in dedicated `/approvals` queue |
| **Compare Toggle & Granularity** | Filter | `DashboardFilters.tsx` | None | Dashboard only | All | **REMOVE** | Simplify to clean date presets |

---

## 2. Component Files to Delete

1. `fe/src/features/dashboard/components/kpi/Sparkline.tsx`
2. `fe/src/features/dashboard/components/charts/BilledVsCollectedChart.tsx`
3. `fe/src/features/dashboard/components/charts/PeakHoursHeatmap.tsx`
4. `fe/src/features/dashboard/components/charts/SpecialtyBarChart.tsx`
5. `fe/src/features/dashboard/components/charts/UtilisationChart.tsx`
6. `fe/src/features/dashboard/components/charts/PaymentMixChart.tsx`
7. `fe/src/features/dashboard/components/charts/AgeingChart.tsx`
8. `fe/src/features/dashboard/components/charts/MessageStatusChart.tsx`
9. `fe/src/features/dashboard/components/charts/QueueFunnel.tsx`
10. `fe/src/features/dashboard/components/charts/RankedList.tsx`
11. `fe/src/features/dashboard/components/charts/RevenueVsExpensesChart.tsx`
12. `fe/src/features/dashboard/components/panels/AlertsPanel.tsx`
13. `fe/src/features/dashboard/components/panels/LiveQueuePanel.tsx`
14. `fe/src/features/dashboard/components/panels/PendingApprovalsPanel.tsx`

---

## 3. Selector Functions to Delete from `services/dashboard.ts`

- `getBilledVsCollected`
- `getSpecialtyVolume`
- `getDoctorUtilisation`
- `getPeakHoursHeatmap`
- `getPaymentMix`
- `getReceivablesAgeing`
- `getMessageDeliveryStatus`
- `getQueueFunnel`
- `getTopServices`
- `getTopDoctors`
- `getRevenueVsExpenses`

*(Note: Selector functions in `logic.ts` such as `computePnL`, `revenueByCategory`, `doctorPayout`, etc. will be strictly preserved because `/reports` and `/expenses` depend on them).*

---

## 4. Rebalanced 12-Column Desktop Layout

```
[ Page header: title · compact date-range control · refresh ]
[ KPI ][ KPI ][ KPI ][ KPI ][ KPI ]                       <- 5 cards
[ Daily net collections (8 cols, ~320px) ][ Revenue by service category (4 cols, ~320px) ]
[ Appointment volume (6 cols, ~300px) ][ Today's doctor sessions (6 cols) ]
[ Upcoming sessions (4) ][ Recent payments (4) ][ Failed booking messages (4) ]
```

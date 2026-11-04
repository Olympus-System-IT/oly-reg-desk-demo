"use client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  CreditCard,
  ClipboardList,
  AlertTriangle,
  Pill,
  TrendingUp,
  Boxes,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Guard, PageHeader, Panel, StatusBadge } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDB } from "@/lib/hms/store";
import { money } from "@/lib/hms/logic";
import {
  getPharmacyDashboardMetrics,
  getPharmacyRevenueTrend,
  getPharmacyCategoryValuation,
  getMedicineStock,
  getBatchExpiryStatus,
  todayDateStr,
} from "@/lib/hms/pharmacyLogic";

export const Route = createFileRoute("/_shell/pharmacy/")({
  head: () => ({
    meta: [
      { title: "Pharmacy Dashboard — Hospital Management System" },
      { name: "description", content: "Pharmacy dispensary flow, medication inventory valuation, and expiry alerts." },
    ],
  }),
  component: () => (
    <Guard perm="pharmacy.access" what="pharmacy dashboard">
      <PharmacyDashboard />
    </Guard>
  ),
});

function PharmacyDashboard() {
  const db = useDB();

  const metrics = useMemo(() => getPharmacyDashboardMetrics(db), [db]);
  const revenueTrend = useMemo(() => getPharmacyRevenueTrend(db, 14), [db]);
  const categoryValuation = useMemo(() => getPharmacyCategoryValuation(db).slice(0, 6), [db]);

  const pendingPrescriptions = useMemo(
    () => db.prescriptions.filter((p) => p.status === "Pending").slice(0, 6),
    [db]
  );

  const criticalAlerts = useMemo(() => {
    const list: {
      id: string;
      title: string;
      subtitle: string;
      type: "expired" | "expiring_soon" | "low_stock";
      badge: string;
      tone: "red" | "amber";
    }[] = [];

    // Expired or near expiry batches
    const today = todayDateStr();
    for (const b of db.batches) {
      if (b.quantity <= 0) continue;
      const med = db.medicines.find((m) => m.id === b.medicineId);
      const expStatus = getBatchExpiryStatus(b.expiryDate, b.quantity);

      if (expStatus.status === "Expired") {
        list.push({
          id: `alert-exp-${b.id}`,
          title: `${med?.name ?? "Medicine"} (${b.batchNo})`,
          subtitle: `Expired ${Math.abs(expStatus.daysRemaining)} days ago · ${b.quantity} ${med?.unit ?? "units"} in quarantine`,
          type: "expired",
          badge: "Expired",
          tone: "red",
        });
      } else if (expStatus.status === "Critical" || expStatus.status === "Warning") {
        list.push({
          id: `alert-near-${b.id}`,
          title: `${med?.name ?? "Medicine"} (${b.batchNo})`,
          subtitle: `Expires in ${expStatus.daysRemaining} days (${b.expiryDate}) · ${b.quantity} ${med?.unit ?? "units"} remaining`,
          type: "expiring_soon",
          badge: `Expires in ${expStatus.daysRemaining}d`,
          tone: expStatus.status === "Critical" ? "red" : "amber",
        });
      }
    }

    // Low stock medicines
    for (const med of db.medicines) {
      if (!med.active) continue;
      const stock = getMedicineStock(db, med.id);
      if (stock <= med.reorderLevel) {
        list.push({
          id: `alert-stock-${med.id}`,
          title: med.name,
          subtitle: `Current stock: ${stock} ${med.unit} · Reorder threshold: ${med.reorderLevel}`,
          type: "low_stock",
          badge: stock === 0 ? "Out of Stock" : "Low Stock",
          tone: stock === 0 ? "red" : "amber",
        });
      }
    }

    return list.slice(0, 6);
  }, [db]);

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <PageHeader
        title="Pharmacy Operations Dashboard"
        description="Prescription queue, counter POS dispensing, inventory valuation, and batch safety tracker."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link to="/pharmacy/dispense" search={{ rxId: undefined }}>
                <CreditCard className="mr-1.5 size-4" /> Dispense / POS
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/pharmacy/prescriptions">
                <ClipboardList className="mr-1.5 size-4" /> Prescriptions
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/pharmacy/inventory">
                <Pill className="mr-1.5 size-4" /> Medications Master
              </Link>
            </Button>
          </div>
        }
      />

      {/* 5 KPI Summary Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Today's Revenue</span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {money(metrics.todayRevenue)}
          </div>
          <div className="mt-1 flex items-center text-xs text-muted-foreground">
            <span>{metrics.todayDispenseCount} dispensed today</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Rx</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {metrics.pendingRxCount}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Waiting in dispensary queue
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Inventory Value</span>
            <Boxes className="size-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {money(metrics.totalCostValuation)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Retail: {money(metrics.totalRetailValuation)}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Low Stock Alerts</span>
            <AlertTriangle className="size-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {metrics.lowStockCount}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Items below reorder limit
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Expiry Alerts</span>
            <ShieldAlert className="size-4 text-destructive" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {metrics.expiringSoonCount + metrics.expiredBatchesCount}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {metrics.expiredBatchesCount > 0 ? (
              <span className="text-destructive font-medium">{metrics.expiredBatchesCount} expired</span>
            ) : (
              <span>0 expired · {metrics.expiringSoonCount} near expiry</span>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 14-day Dispense Sales Trend */}
        <div className="rounded-xl border bg-card p-5 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Dispense Sales Trend</h3>
              <p className="text-xs text-muted-foreground">Daily pharmacy gross collections over the past 14 days</p>
            </div>
            <Badge variant="outline" className="text-xs">
              14-Day Velocity
            </Badge>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="pharmacyRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1729C4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1729C4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `Rs ${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                />
                <Tooltip
                  formatter={(val: any) => [money(Number(val)), "Revenue"]}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                  contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1729C4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#pharmacyRevGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Drug Categories Valuation */}
        <div className="rounded-xl border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Stock by Category</h3>
              <p className="text-xs text-muted-foreground">Inventory valuation breakdown</p>
            </div>
            <Link to="/pharmacy/inventory" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3.5">
            {categoryValuation.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{cat.category}</span>
                  <span className="text-muted-foreground">{money(cat.valuation)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(
                        100,
                        metrics.totalRetailValuation > 0
                          ? Math.round((cat.valuation / metrics.totalRetailValuation) * 100)
                          : 0
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {cat.medicationsCount} medication items
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Panels Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Pending Prescriptions Queue */}
        <Panel
          title="Pending Prescriptions Queue"
          actions={
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link to="/pharmacy/prescriptions">
                All Prescriptions <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          }
        >
          {pendingPrescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <PackageCheck className="size-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium">All prescriptions dispensed</p>
              <p className="text-xs">No pending orders in the queue right now.</p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingPrescriptions.map((rx) => {
                const pat = db.patients.find((p) => p.id === rx.patientId);
                return (
                  <div key={rx.id} className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">{rx.no}</span>
                        <span className="text-xs font-medium text-foreground truncate">
                          {pat?.name ?? "Unknown Patient"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground truncate">
                        {rx.doctorName ? `Prescribed by ${rx.doctorName}` : "OPD Prescription"} · {rx.diagnosis ?? "General"}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{rx.items.length} items</span>
                        <span>·</span>
                        <span>{rx.items.map((i) => i.medicineName).slice(0, 2).join(", ")}{rx.items.length > 2 ? "…" : ""}</span>
                      </div>
                    </div>
                    <Button size="sm" asChild className="shrink-0 text-xs">
                      <Link to="/pharmacy/dispense" search={{ rxId: rx.id }}>
                        Dispense
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Right: Expiry & Stock Safety Alerts */}
        <Panel
          title="Stock Safety & Expiry Alerts"
          actions={
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link to="/pharmacy/batches">
                Batch Tracker <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          }
        >
          {criticalAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <CheckCircle2 className="size-8 text-primary mb-2" />
              <p className="text-sm font-medium">Inventory is in good standing</p>
              <p className="text-xs">No expired batches or critical low-stock alerts.</p>
            </div>
          ) : (
            <div className="divide-y">
              {criticalAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">{alert.title}</span>
                      <StatusBadge status={alert.badge} tone={alert.tone} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{alert.subtitle}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="shrink-0 text-xs">
                    <Link to={alert.type === "low_stock" ? "/pharmacy/suppliers" : "/pharmacy/batches"}>
                      {alert.type === "low_stock" ? "Order Stock" : "Review Batch"}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}


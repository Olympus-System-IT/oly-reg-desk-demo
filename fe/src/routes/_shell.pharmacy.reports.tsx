"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { format, subDays, parseISO } from "date-fns";
import {
  BarChart3,
  Printer,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Boxes,
  ShieldAlert,
} from "lucide-react";
import { Guard, PageHeader, Panel, TableWrap, NativeSelect } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDB } from "@/lib/hms/store";
import { money } from "@/lib/hms/logic";
import {
  getMedicineStock,
  getBatchExpiryStatus,
  todayDateStr,
} from "@/lib/hms/pharmacyLogic";

export const Route = createFileRoute("/_shell/pharmacy/reports")({
  head: () => ({
    meta: [
      { title: "Pharmacy Reports — Hospital Management System" },
      { name: "description", content: "Comprehensive pharmacy financial, dispensing, and inventory reports." },
    ],
  }),
  component: () => (
    <Guard perm="reports.view" what="pharmacy financial and operational reports">
      <PharmacyReportsPage />
    </Guard>
  ),
});

function PharmacyReportsPage() {
  const db = useDB();

  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [reportTab, setReportTab] = useState<"daily" | "fastMoving" | "category" | "expiry">("daily");

  const setPreset = (days: number) => {
    setDateFrom(format(subDays(new Date(), days - 1), "yyyy-MM-dd"));
    setDateTo(format(new Date(), "yyyy-MM-dd"));
  };

  // Filtered dispenses in period
  const relevantDispenses = useMemo(() => {
    return db.dispenses.filter((d) => {
      if (d.status !== "Completed") return false;
      const dateOnly = d.date.slice(0, 10);
      return dateOnly >= dateFrom && dateOnly <= dateTo;
    });
  }, [db.dispenses, dateFrom, dateTo]);

  // Overall financial calculations
  const financials = useMemo(() => {
    let grossRevenue = 0;
    let discounts = 0;
    let netRevenue = 0;
    let totalCogs = 0;
    let totalItemsCount = 0;

    for (const d of relevantDispenses) {
      grossRevenue += d.subtotal;
      discounts += d.discount;
      netRevenue += d.total;

      for (const item of d.items) {
        totalItemsCount += item.qty;
        const med = db.medicines.find((m) => m.id === item.medicineId);
        const batch = db.batches.find((b) => b.id === item.batchId);
        const cost = batch?.unitCost ?? med?.unitCost ?? 0;
        totalCogs += item.qty * cost;
      }
    }

    const grossProfit = netRevenue - totalCogs;
    const marginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    return {
      grossRevenue,
      discounts,
      netRevenue,
      totalCogs,
      grossProfit,
      marginPct,
      totalItemsCount,
      transactionsCount: relevantDispenses.length,
    };
  }, [relevantDispenses, db.medicines, db.batches]);

  // 1. Daily breakdown
  const dailyBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { transactions: number; items: number; gross: number; discount: number; net: number; cogs: number }
    >();

    for (const d of relevantDispenses) {
      const day = d.date.slice(0, 10);
      if (!map.has(day)) {
        map.set(day, { transactions: 0, items: 0, gross: 0, discount: 0, net: 0, cogs: 0 });
      }
      const entry = map.get(day)!;
      entry.transactions++;
      entry.gross += d.subtotal;
      entry.discount += d.discount;
      entry.net += d.total;

      for (const it of d.items) {
        entry.items += it.qty;
        const med = db.medicines.find((m) => m.id === it.medicineId);
        const batch = db.batches.find((b) => b.id === it.batchId);
        const cost = batch?.unitCost ?? med?.unitCost ?? 0;
        entry.cogs += it.qty * cost;
      }
    }

    return Array.from(map.entries())
      .map(([date, data]) => ({
        date,
        ...data,
        profit: data.net - data.cogs,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [relevantDispenses, db.medicines, db.batches]);

  // 2. Fast moving medications
  const fastMoving = useMemo(() => {
    const map = new Map<string, { name: string; generic: string; category: string; units: number; revenue: number }>();

    for (const d of relevantDispenses) {
      for (const it of d.items) {
        const med = db.medicines.find((m) => m.id === it.medicineId);
        if (!map.has(it.medicineId)) {
          map.set(it.medicineId, {
            name: it.medicineName,
            generic: med?.genericName ?? "",
            category: med?.category ?? "General",
            units: 0,
            revenue: 0,
          });
        }
        const entry = map.get(it.medicineId)!;
        entry.units += it.qty;
        entry.revenue += it.total;
      }
    }

    return Array.from(map.entries())
      .map(([id, data]) => ({
        id,
        currentStock: getMedicineStock(db, id),
        ...data,
      }))
      .sort((a, b) => b.units - a.units);
  }, [relevantDispenses, db]);

  // 3. Category valuation
  const categorySummary = useMemo(() => {
    const today = todayDateStr();
    const map = new Map<string, { count: number; costVal: number; retailVal: number }>();

    for (const med of db.medicines) {
      if (!map.has(med.category)) {
        map.set(med.category, { count: 0, costVal: 0, retailVal: 0 });
      }
      const entry = map.get(med.category)!;
      entry.count++;
    }

    for (const b of db.batches) {
      if (b.quantity <= 0 || b.expiryDate < today) continue;
      const med = db.medicines.find((m) => m.id === b.medicineId);
      if (!med) continue;
      const entry = map.get(med.category);
      if (entry) {
        entry.costVal += b.quantity * b.unitCost;
        entry.retailVal += b.quantity * b.unitPrice;
      }
    }

    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        ...data,
        margin: data.retailVal - data.costVal,
      }))
      .sort((a, b) => b.retailVal - a.retailVal);
  }, [db.medicines, db.batches]);

  // 4. Expiry risk report (batches expiring <= 90 days or expired)
  const expiryRisk = useMemo(() => {
    const list = [];
    for (const b of db.batches) {
      if (b.quantity <= 0) continue;
      const exp = getBatchExpiryStatus(b.expiryDate, b.quantity);
      if (exp.status === "Expired" || exp.status === "Critical" || exp.status === "Warning") {
        const med = db.medicines.find((m) => m.id === b.medicineId);
        list.push({
          batchId: b.id,
          batchNo: b.batchNo,
          medName: med?.name ?? "Unknown",
          genericName: med?.genericName ?? "",
          quantity: b.quantity,
          expiryDate: b.expiryDate,
          daysRemaining: exp.daysRemaining,
          status: exp.status,
          label: exp.label,
          tone: exp.tone,
          financialRisk: b.quantity * b.unitCost,
        });
      }
    }
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [db.batches, db.medicines]);

  // CSV export
  const exportCsv = () => {
    let rows: string[][] = [];
    let filename = `pharmacy-report-${dateFrom}-to-${dateTo}.csv`;

    if (reportTab === "daily") {
      rows.push(["Date", "Transactions", "Items Sold", "Gross Revenue (LKR)", "Discounts", "Net Revenue", "COGS", "Profit"]);
      for (const row of dailyBreakdown) {
        rows.push([row.date, String(row.transactions), String(row.items), String(row.gross), String(row.discount), String(row.net), String(row.cogs), String(row.profit)]);
      }
    } else if (reportTab === "fastMoving") {
      rows.push(["Medication", "Generic Name", "Category", "Units Sold", "Revenue (LKR)", "Current Stock"]);
      for (const row of fastMoving) {
        rows.push([row.name, row.generic, row.category, String(row.units), String(row.revenue), String(row.currentStock)]);
      }
    } else if (reportTab === "category") {
      rows.push(["Category", "Medication Count", "Cost Valuation (LKR)", "Retail Valuation", "Unrealized Margin"]);
      for (const row of categorySummary) {
        rows.push([row.category, String(row.count), String(row.costVal), String(row.retailVal), String(row.margin)]);
      }
    } else {
      rows.push(["Batch No", "Medication", "Remaining Qty", "Expiry Date", "Days Remaining", "Status", "Financial Cost Exposure"]);
      for (const row of expiryRisk) {
        rows.push([row.batchNo, row.medName, String(row.quantity), row.expiryDate, String(row.daysRemaining), row.status, String(row.financialRisk)]);
      }
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Pharmacy Financial & Stock Reports"
        description="Comprehensive accounting insights for dispensary sales volume, cost of sales (COGS), profit margins, and shelf-life expiry audit."
        actions={
          <div className="flex items-center gap-2 no-print">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 size-3.5" /> Print Report
            </Button>
            <Button size="sm" onClick={exportCsv}>
              <Download className="mr-1.5 size-3.5" /> Export CSV
            </Button>
          </div>
        }
      />

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-2xs no-print">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">Period:</span>
          <Button variant="outline" size="sm" onClick={() => setPreset(7)} className="h-7 text-xs">
            Last 7 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreset(30)} className="h-7 text-xs">
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreset(90)} className="h-7 text-xs">
            Last 90 Days
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 w-36 text-xs"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 w-36 text-xs"
          />
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Gross Sales</span>
            <DollarSign className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular">
            {money(financials.netRevenue)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {financials.transactionsCount} sales · {financials.totalItemsCount} units
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Cost of Goods (COGS)</span>
            <Boxes className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular">
            {money(financials.totalCogs)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Direct inventory cost
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Gross Profit</span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-primary tabular">
            {money(financials.grossProfit)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Revenue minus COGS
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Gross Margin</span>
            <Percent className="size-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular">
            {financials.marginPct.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Average profit ratio
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={reportTab} onValueChange={(v) => setReportTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-2xl no-print">
          <TabsTrigger value="daily" className="text-xs">
            Daily Sales Ledger
          </TabsTrigger>
          <TabsTrigger value="fastMoving" className="text-xs">
            Fast-Moving Drugs
          </TabsTrigger>
          <TabsTrigger value="category" className="text-xs">
            Category Valuation
          </TabsTrigger>
          <TabsTrigger value="expiry" className="text-xs">
            Expiry Risk Audit
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Daily Sales Ledger */}
        <TabsContent value="daily" className="mt-4">
          <TableWrap>
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium text-center">Transactions</th>
                  <th className="py-3 px-4 font-medium text-center">Units Sold</th>
                  <th className="py-3 px-4 font-medium text-right">Gross Billed</th>
                  <th className="py-3 px-4 font-medium text-right">Discounts</th>
                  <th className="py-3 px-4 font-medium text-right">Net Collected</th>
                  <th className="py-3 px-4 font-medium text-right">Est. COGS</th>
                  <th className="py-3 px-4 font-medium text-right">Est. Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dailyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No sales recorded in the selected period.
                    </td>
                  </tr>
                ) : (
                  dailyBreakdown.map((row) => (
                    <tr key={row.date} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">{row.date}</td>
                      <td className="py-3 px-4 text-center tabular text-foreground">{row.transactions}</td>
                      <td className="py-3 px-4 text-center tabular text-foreground">{row.items}</td>
                      <td className="py-3 px-4 text-right tabular text-muted-foreground">{money(row.gross)}</td>
                      <td className="py-3 px-4 text-right tabular text-muted-foreground">
                        {row.discount > 0 ? `-${money(row.discount)}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular text-foreground">{money(row.net)}</td>
                      <td className="py-3 px-4 text-right tabular text-muted-foreground">{money(row.cogs)}</td>
                      <td className="py-3 px-4 text-right font-bold tabular text-primary">{money(row.profit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableWrap>
        </TabsContent>

        {/* Tab 2: Fast-Moving Drugs */}
        <TabsContent value="fastMoving" className="mt-4">
          <TableWrap>
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-medium">Rank</th>
                  <th className="py-3 px-4 font-medium">Medication</th>
                  <th className="py-3 px-4 font-medium">Generic Name</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium text-center">Units Dispensed</th>
                  <th className="py-3 px-4 font-medium text-right">Revenue Generated</th>
                  <th className="py-3 px-4 font-medium text-center">Current Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fastMoving.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No dispensing activity in the selected period.
                    </td>
                  </tr>
                ) : (
                  fastMoving.map((med, i) => (
                    <tr key={med.id} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-mono font-bold text-muted-foreground">#{i + 1}</td>
                      <td className="py-3 px-4 font-bold text-foreground">{med.name}</td>
                      <td className="py-3 px-4 text-muted-foreground italic">{med.generic}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{med.category}</td>
                      <td className="py-3 px-4 text-center font-bold text-primary tabular">{med.units}</td>
                      <td className="py-3 px-4 text-right font-semibold tabular text-foreground">{money(med.revenue)}</td>
                      <td className="py-3 px-4 text-center tabular text-muted-foreground">{med.currentStock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableWrap>
        </TabsContent>

        {/* Tab 3: Category Valuation */}
        <TabsContent value="category" className="mt-4">
          <TableWrap>
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-medium">Drug Category</th>
                  <th className="py-3 px-4 font-medium text-center">Formulary Items</th>
                  <th className="py-3 px-4 font-medium text-right">Total Cost Value</th>
                  <th className="py-3 px-4 font-medium text-right">Total Retail Value</th>
                  <th className="py-3 px-4 font-medium text-right">Unrealized Gross Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categorySummary.map((cat) => (
                  <tr key={cat.category} className="hover:bg-muted/20">
                    <td className="py-3 px-4 font-bold text-foreground">{cat.category}</td>
                    <td className="py-3 px-4 text-center tabular text-muted-foreground">{cat.count} items</td>
                    <td className="py-3 px-4 text-right tabular text-muted-foreground">{money(cat.costVal)}</td>
                    <td className="py-3 px-4 text-right font-semibold tabular text-foreground">{money(cat.retailVal)}</td>
                    <td className="py-3 px-4 text-right font-bold tabular text-primary">{money(cat.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </TabsContent>

        {/* Tab 4: Expiry Risk Audit */}
        <TabsContent value="expiry" className="mt-4">
          <TableWrap>
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-medium">Batch Number</th>
                  <th className="py-3 px-4 font-medium">Medication</th>
                  <th className="py-3 px-4 font-medium text-center">Units at Risk</th>
                  <th className="py-3 px-4 font-medium">Expiry Date</th>
                  <th className="py-3 px-4 font-medium text-center">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Financial Exposure (Cost)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expiryRisk.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No batches nearing expiry or expired.
                    </td>
                  </tr>
                ) : (
                  expiryRisk.map((it) => (
                    <tr key={it.batchId} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">{it.batchNo}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{it.medName}</div>
                        <div className="text-[11px] text-muted-foreground">{it.genericName}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-foreground tabular">{it.quantity}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{it.expiryDate}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          it.tone === "red" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          <span className="size-1.5 rounded-full bg-current" />
                          {it.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular text-destructive">
                        {money(it.financialRisk)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableWrap>
        </TabsContent>
      </Tabs>
    </div>
  );
}


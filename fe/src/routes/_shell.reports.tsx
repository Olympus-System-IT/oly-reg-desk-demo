"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  FileText,
  DollarSign,
  AlertCircle,
  Users,
  MessageSquare,
  Search,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Guard, PageHeader, Panel, Stat, TableWrap, Empty, NativeSelect, StatusBadge } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDB, useCurrentUser } from "@/lib/hms/store";
import { NetCollectionBreakdown } from "@/features/net-collection/NetCollectionBreakdown";
import { can } from "@/lib/hms/permissions";
import {
  money,
  fmtDate,
  fmtDateTime,
  invoiceTotals,
  computePnL,
  dailyRevenueSeries,
  inRange,
  doctorPayout,
} from "@/lib/hms/logic";

export const Route = createFileRoute("/_shell/reports")({
  head: () => ({ meta: [{ title: "Reports & Analytics — Hospital Management System" }] }),
  component: () => <Guard perm="reports.view" what="reports"><ReportsPage /></Guard>,
});

type ReportTab =
  | "pnl"
  | "collections"
  | "appointments"
  | "outstanding"
  | "services"
  | "refunds"
  | "doctor-fees"
  | "messages";

function ReportsPage() {
  const db = useDB();
  const user = useCurrentUser();
  const hasPL = can(user, "pl.view");

  const todayStr = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState<ReportTab>(hasPL ? "pnl" : "collections");
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgoStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [search, setSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");

  // 1. P&L Data
  const pnlData = useMemo(() => {
    return computePnL(db, dateFrom, dateTo);
  }, [db, dateFrom, dateTo]);

  const pnlChartData = useMemo(() => {
    return [
      { name: "Gross Revenue", amount: pnlData.grossRevenue },
      { name: "Net Revenue", amount: pnlData.netRevenue },
      { name: "Doctor Fees", amount: pnlData.doctorFees },
      { name: "Operating Expenses", amount: pnlData.opEx },
      { name: "Net Profit", amount: pnlData.netProfit },
    ];
  }, [pnlData]);

  // 2. Collections by Payment Method
  const collectionsData = useMemo(() => {
    const list: {
      date: string;
      receiptNo: string;
      invoiceNo: string;
      patientName: string;
      method: string;
      reference?: string;
      amount: number;
      cashier: string;
    }[] = [];

    for (const inv of db.invoices) {
      if (inv.voided) continue;
      const patient = db.patients.find((p) => p.id === inv.patientId);
      for (const p of inv.payments) {
        if (!inRange(p.date, dateFrom, dateTo)) continue;
        list.push({
          date: p.date,
          receiptNo: p.receiptNo,
          invoiceNo: inv.no,
          patientName: patient?.name ?? "Guest",
          method: p.method,
          reference: p.reference,
          amount: p.amount,
          cashier: p.by,
        });
      }
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [db.invoices, db.patients, dateFrom, dateTo]);

  const collectionsByMethod = useMemo(() => {
    const totals: Record<string, number> = { Cash: 0, Card: 0, "Bank transfer": 0 };
    for (const c of collectionsData) {
      totals[c.method] = (totals[c.method] ?? 0) + c.amount;
    }
    return totals;
  }, [collectionsData]);

  // 3. Appointments Report
  const appointmentsReport = useMemo(() => {
    return db.appointments
      .filter((a) => {
        const ses = db.sessions.find((s) => s.id === a.sessionId);
        if (!ses || !inRange(ses.date, dateFrom, dateTo)) return false;
        if (selectedDoctor !== "all" && ses.doctorId !== selectedDoctor) return false;
        const doc = db.doctors.find((d) => d.id === ses.doctorId);
        if (selectedSpecialty !== "all" && doc?.specialtyId !== selectedSpecialty) return false;
        return true;
      })
      .map((a) => {
        const p = db.patients.find((x) => x.id === a.patientId);
        const ses = db.sessions.find((s) => s.id === a.sessionId)!;
        const doc = db.doctors.find((d) => d.id === ses?.doctorId);
        const spec = db.specialties.find((s) => s.id === doc?.specialtyId);
        return {
          id: a.id,
          ref: a.ref,
          queueNo: a.queueNo,
          patient: p?.name ?? "—",
          mobile: p?.mobile ?? "—",
          doctor: doc?.name ?? "—",
          specialty: spec?.name ?? "—",
          date: ses.date,
          time: ses.start,
          status: a.status,
          source: a.source,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.appointments, db.sessions, db.doctors, db.specialties, db.patients, dateFrom, dateTo, selectedDoctor, selectedSpecialty]);

  // 4. Outstanding Balances Report
  const outstandingReport = useMemo(() => {
    return db.invoices
      .filter((inv) => !inv.voided)
      .map((inv) => {
        const t = invoiceTotals(inv, db.settings.taxRate);
        const patient = db.patients.find((p) => p.id === inv.patientId);
        return {
          id: inv.id,
          no: inv.no,
          date: inv.createdAt,
          patientName: patient?.name ?? "—",
          patientMobile: patient?.mobile ?? "—",
          total: t.total,
          paid: t.paid,
          balance: t.balance,
          status: t.status,
        };
      })
      .filter((inv) => inv.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [db.invoices, db.patients, db.settings.taxRate]);

  // 5. Service Revenue Report
  const serviceRevenueReport = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string; count: number; total: number }>();
    for (const inv of db.invoices) {
      if (inv.voided || !inRange(inv.createdAt, dateFrom, dateTo)) continue;
      for (const line of inv.lines) {
        if (!map.has(line.serviceId)) {
          map.set(line.serviceId, {
            id: line.serviceId,
            name: line.name,
            category: line.category,
            count: 0,
            total: 0,
          });
        }
        const item = map.get(line.serviceId)!;
        item.count += line.qty;
        item.total += line.qty * line.unitPrice;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [db.invoices, dateFrom, dateTo]);

  // 6. Cancellations & Refunds Report
  const cancellationsAndRefunds = useMemo(() => {
    const refundsList = db.invoices
      .filter((inv) => inRange(inv.createdAt, dateFrom, dateTo))
      .flatMap((inv) =>
        inv.refunds.map((r) => ({
          type: "Refund" as const,
          date: r.date,
          docRef: inv.no,
          entity: db.patients.find((p) => p.id === inv.patientId)?.name ?? "—",
          amount: r.amount,
          reason: r.reason,
          by: r.by,
        })),
      );

    const cancelsList = db.appointments
      .filter((a) => a.status === "Cancelled" && inRange(a.createdAt, dateFrom, dateTo))
      .map((a) => {
        const p = db.patients.find((x) => x.id === a.patientId);
        return {
          type: "Cancellation" as const,
          date: a.createdAt,
          docRef: a.ref,
          entity: p?.name ?? "—",
          amount: 0,
          reason: a.cancelReason ?? "Patient cancellation",
          by: "Reception",
        };
      });

    return [...refundsList, ...cancelsList].sort((a, b) => b.date.localeCompare(a.date));
  }, [db.invoices, db.appointments, db.patients, dateFrom, dateTo]);

  // 7. Doctor Fees / Payables Report
  const doctorFeesReport = useMemo(() => {
    return db.doctors.map((doc) => {
      const payoutAmount = doctorPayout(db, doc.id, dateFrom, dateTo);
      const spec = db.specialties.find((s) => s.id === doc.specialtyId);
      const apptCount = db.appointments.filter((a) => {
        const s = db.sessions.find((ses) => ses.id === a.sessionId);
        return s && s.doctorId === doc.id && inRange(s.date, dateFrom, dateTo) && a.status === "Completed";
      }).length;
      return {
        id: doc.id,
        name: doc.name,
        specialty: spec?.name ?? "—",
        fee: doc.fee,
        payoutRule: doc.payout.type === "percent" ? `${doc.payout.value}%` : doc.payout.type === "fixed" ? money(doc.payout.value) : "None",
        completedConsultations: apptCount,
        payableAmount: payoutAmount,
      };
    }).sort((a, b) => b.payableAmount - a.payableAmount);
  }, [db, dateFrom, dateTo]);

  // 8. Messages Report
  const messagesReport = useMemo(() => {
    return db.messages
      .filter((m) => inRange(m.ts, dateFrom, dateTo))
      .map((m) => {
        const p = db.patients.find((pt) => pt.id === m.patientId);
        return {
          id: m.id,
          date: m.ts,
          patient: p?.name ?? "—",
          mobile: p?.mobile ?? "—",
          type: m.type,
          status: m.status,
          text: m.text,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.messages, db.patients, dateFrom, dateTo]);

  // Export active report as CSV
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `report_${activeTab}_${dateFrom}_${dateTo}.csv`;

    if (activeTab === "pnl") {
      headers = ["Metric", "Amount (LKR)"];
      rows = [
        ["Gross Service Revenue", pnlData.grossRevenue],
        ["Discounts", pnlData.discounts],
        ["Refunds", pnlData.refunds],
        ["Net Revenue", pnlData.netRevenue],
        ["Doctor Payables", pnlData.doctorFees],
        ["Gross Profit", pnlData.grossProfit],
        ["Operating Expenses", pnlData.opEx],
        ["Net Profit", pnlData.netProfit],
        ["Cash Collected to Date", pnlData.cashCollected],
        ["Outstanding Receivables", pnlData.outstanding],
      ];
    } else if (activeTab === "collections") {
      headers = ["Date", "Receipt #", "Invoice #", "Patient", "Method", "Reference", "Amount", "Cashier"];
      rows = collectionsData.map((c) => [
        c.date,
        c.receiptNo,
        c.invoiceNo,
        `"${c.patientName}"`,
        c.method,
        `"${c.reference || ""}"`,
        c.amount,
        `"${c.cashier}"`,
      ]);
    } else if (activeTab === "appointments") {
      headers = ["Ref", "Queue", "Patient", "Mobile", "Doctor", "Consultant Type", "Date", "Time", "Status"];
      rows = appointmentsReport.map((a) => [
        a.ref,
        a.queueNo,
        `"${a.patient}"`,
        a.mobile,
        `"${a.doctor}"`,
        `"${a.specialty}"`,
        a.date,
        a.time,
        a.status,
      ]);
    } else if (activeTab === "outstanding") {
      headers = ["Invoice #", "Date", "Patient", "Mobile", "Total", "Paid", "Balance Due", "Status"];
      rows = outstandingReport.map((o) => [
        o.no,
        o.date,
        `"${o.patientName}"`,
        o.patientMobile,
        o.total,
        o.paid,
        o.balance,
        o.status,
      ]);
    } else if (activeTab === "services") {
      headers = ["Service Name", "Category", "Units Sold", "Total Revenue"];
      rows = serviceRevenueReport.map((s) => [
        `"${s.name}"`,
        `"${s.category}"`,
        s.count,
        s.total,
      ]);
    } else if (activeTab === "refunds") {
      headers = ["Type", "Date", "Document Ref", "Entity", "Amount", "Reason", "Handled By"];
      rows = cancellationsAndRefunds.map((cr) => [
        cr.type,
        cr.date,
        cr.docRef,
        `"${cr.entity}"`,
        cr.amount,
        `"${cr.reason}"`,
        cr.by,
      ]);
    } else if (activeTab === "doctor-fees") {
      headers = ["Doctor", "Consultant Type", "Consultation Fee", "Payout Rule", "Completed Visits", "Payable Total"];
      rows = doctorFeesReport.map((d) => [
        `"${d.name}"`,
        `"${d.specialty}"`,
        d.fee,
        `"${d.payoutRule}"`,
        d.completedConsultations,
        d.payableAmount,
      ]);
    } else if (activeTab === "messages") {
      headers = ["Date", "Patient", "Mobile", "Type", "Status", "Content"];
      rows = messagesReport.map((m) => [
        m.date,
        `"${m.patient}"`,
        m.mobile,
        m.type,
        m.status,
        `"${m.text.replace(/"/g, '""')}"`,
      ]);
    }

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded as CSV");
  };

  const handleDownloadReport = (type: "daily" | "monthly") => {
    const filename =
      type === "daily"
        ? "Olympus-Lanka-Daily-Financial-Report.pdf"
        : "Olympus-Lanka-Monthly-Financial-Report.pdf";
    const link = document.createElement("a");
    link.href = `/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(
      `Olympus Lanka Hospital ${type === "daily" ? "Daily" : "Monthly"} Financial Report downloaded as PDF`
    );
  };

  return (
    <>
      <PageHeader
        title="Reports & Analytics Hub"
        description="Comprehensive accounting, collections, clinical activity, and message performance."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => handleDownloadReport("daily")}>
              <Download className="mr-1.5 size-4" /> Daily Report (PDF)
            </Button>
            <Button size="sm" onClick={() => handleDownloadReport("monthly")}>
              <Download className="mr-1.5 size-4" /> Monthly Report (PDF)
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 size-4" /> Print View
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="mr-1.5 size-4" /> Export CSV
            </Button>
          </div>
        }
      />

      {/* Date Filter Bar */}
      <Panel className="mb-5 no-print">
        <div className="flex flex-wrap items-center gap-3 p-3 text-sm">
          <span className="font-medium text-foreground">Date Range:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
            aria-label="From date"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
            aria-label="To date"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom(thirtyDaysAgoStr);
              setDateTo(todayStr);
            }}
          >
            Last 30 Days
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom(todayStr);
              setDateTo(todayStr);
            }}
          >
            Today
          </Button>
        </div>
      </Panel>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)}>
        <TabsList className="mb-5 flex flex-wrap h-auto gap-1">
          {hasPL && <TabsTrigger value="pnl">Profit & Loss (P&L)</TabsTrigger>}
          <TabsTrigger value="collections">Daily Collections</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding Balances</TabsTrigger>
          <TabsTrigger value="services">Service Revenue</TabsTrigger>
          <TabsTrigger value="refunds">Cancellations & Refunds</TabsTrigger>
          <TabsTrigger value="doctor-fees">Doctor Payables</TabsTrigger>
          <TabsTrigger value="messages">Message Log</TabsTrigger>
        </TabsList>

        {/* 1. P&L TAB */}
        {hasPL && (
          <TabsContent value="pnl" className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 no-print">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Formal Financial Reports · Thissamaharama Centre</h3>
                  <p className="text-xs text-muted-foreground">
                    Audited formal reports with Olympus Lanka Hospital logo, Hospital Charge margins, and statutory sign-offs.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" asChild>
                  <a href="/financial-report-template.html" target="_blank" rel="noopener noreferrer">
                    <Eye className="mr-1.5 size-4" /> Preview Formal Report
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadReport("daily")}>
                  <Download className="mr-1.5 size-4" /> Daily Report (PDF)
                </Button>
                <Button size="sm" onClick={() => handleDownloadReport("monthly")}>
                  <Download className="mr-1.5 size-4" /> Monthly Report (PDF)
                </Button>
              </div>
            </div>

            <NetCollectionBreakdown dateFrom={dateFrom} dateTo={dateTo} />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Gross Revenue" value={money(pnlData.grossRevenue)} hint="Before discounts & reversals" />
              <Stat label="Net Revenue" value={money(pnlData.netRevenue)} hint="Gross less discounts & refunds" />
              <Stat label="Operating Expenses" value={money(pnlData.opEx)} hint={`${pnlData.expenseCount} expense records`} />
              <Stat
                label="Net Profit"
                value={money(pnlData.netProfit)}
                hint={pnlData.netProfit >= 0 ? "Profitable" : "Operating deficit"}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <Panel title="Revenue vs Costs Breakdown" className="lg:col-span-2">
                <div className="p-4 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pnlChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                      <YAxis fontSize={11} tickFormatter={(val) => `LKR ${(val / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(val: number) => money(val)} />
                      <Bar dataKey="amount" fill="#1729C4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="P&L Summary Table">
                <div className="p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Service Revenue</span>
                    <span className="tabular font-medium">{money(pnlData.grossRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Discounts</span>
                    <span className="tabular">-{money(pnlData.discounts)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Refunds & Reversals</span>
                    <span className="tabular">-{money(pnlData.refunds)}</span>
                  </div>
                  <div className="border-t pt-1.5 flex justify-between font-semibold">
                    <span>Net Revenue</span>
                    <span className="tabular">{money(pnlData.netRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Doctor Fees / Direct Costs</span>
                    <span className="tabular">-{money(pnlData.doctorFees)}</span>
                  </div>
                  <div className="border-t pt-1.5 flex justify-between font-semibold">
                    <span>Gross Profit</span>
                    <span className="tabular">{money(pnlData.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Operating Expenses</span>
                    <span className="tabular">-{money(pnlData.opEx)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-base">
                    <span>Net Profit</span>
                    <span className={`tabular ${pnlData.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                      {money(pnlData.netProfit)}
                    </span>
                  </div>
                  <div className="border-t pt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Cash Collected (Period):</span>
                      <span className="tabular text-foreground">{money(pnlData.cashCollected)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receivables Outstanding:</span>
                      <span className="tabular text-foreground">{money(pnlData.outstanding)}</span>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground">Accounting Basis & Integrity Note:</span>
              <p>
                Simplified accrual basis: Gross revenue represents confirmed outpatient appointments and services rendered.
                Adjustments deduct upfront discounts and refunds. Doctor fees reflect agreed payout rules (fixed fee or % share).
                Cash collections and outstanding receivables are reconciled separately from billed revenue.
              </p>
            </div>
          </TabsContent>
        )}

        {/* 2. DAILY COLLECTIONS TAB */}
        <TabsContent value="collections" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat
              label="Total Collections"
              value={money(collectionsData.reduce((s, c) => s + c.amount, 0))}
              hint={`${collectionsData.length} payments`}
            />
            <Stat label="Cash" value={money(collectionsByMethod.Cash || 0)} />
            <Stat label="Credit / Debit Card" value={money(collectionsByMethod.Card || 0)} />
            <Stat label="Bank Transfer" value={money(collectionsByMethod["Bank transfer"] || 0)} />
          </div>

          <div className="rounded-lg border bg-card shadow-xs">
            <TableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Receipt #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Cashier</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {collectionsData.slice(0, 100).map((c, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDateTime(c.date)}</td>
                      <td className="px-4 py-2 font-mono text-xs">{c.receiptNo}</td>
                      <td className="px-4 py-2 font-mono text-xs">{c.invoiceNo}</td>
                      <td className="px-4 py-2 font-medium">{c.patientName}</td>
                      <td className="px-4 py-2">{c.method}</td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{c.reference || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.cashier}</td>
                      <td className="px-4 py-2 text-right font-medium tabular text-success">{money(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {collectionsData.length === 0 && <Empty title="No collections found in this date range" />}
            {collectionsData.length > 100 && (
              <p className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
                Showing first 100 of {collectionsData.length} entries. Use CSV export for full records.
              </p>
            )}
          </div>
        </TabsContent>

        {/* 3. APPOINTMENTS TAB */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="flex flex-wrap gap-3 no-print">
            <NativeSelect
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-56"
              aria-label="Filter by doctor"
            >
              <option value="all">All Doctors</option>
              {db.doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-56"
              aria-label="Filter by consultant type"
            >
              <option value="all">All Consultant Types</option>
              {db.specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </NativeSelect>
          </div>

          <div className="rounded-lg border bg-card shadow-xs">
            <TableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Ref #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Queue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Doctor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Consultant Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {appointmentsReport.slice(0, 100).map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{a.ref}</td>
                      <td className="px-4 py-2 font-semibold tabular">#{a.queueNo}</td>
                      <td className="px-4 py-2">
                        <div>{a.patient}</div>
                        <div className="text-xs text-muted-foreground">{a.mobile}</div>
                      </td>
                      <td className="px-4 py-2 font-medium">{a.doctor}</td>
                      <td className="px-4 py-2 text-muted-foreground">{a.specialty}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                        {fmtDate(a.date)} · {a.time}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{a.source}</td>
                      <td className="px-4 py-2 text-right">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {appointmentsReport.length === 0 && <Empty title="No appointments match current filters" />}
          </div>
        </TabsContent>

        {/* 4. OUTSTANDING BALANCES TAB */}
        <TabsContent value="outstanding" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Total Outstanding"
              value={money(outstandingReport.reduce((s, o) => s + o.balance, 0))}
              hint="Uncollected receivables"
            />
            <Stat label="Unpaid Invoices" value={outstandingReport.length} />
            <Stat
              label="Total Billed Value"
              value={money(outstandingReport.reduce((s, o) => s + o.total, 0))}
            />
          </div>

          <div className="rounded-lg border bg-card shadow-xs">
            <TableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Balance Due</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {outstandingReport.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{inv.no}</td>
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(inv.date)}</td>
                      <td className="px-4 py-2 font-medium">{inv.patientName}</td>
                      <td className="px-4 py-2 text-muted-foreground">{inv.patientMobile}</td>
                      <td className="px-4 py-2 text-right tabular">{money(inv.total)}</td>
                      <td className="px-4 py-2 text-right tabular text-success">{money(inv.paid)}</td>
                      <td className="px-4 py-2 text-right tabular font-bold text-destructive">{money(inv.balance)}</td>
                      <td className="px-4 py-2 text-right">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {outstandingReport.length === 0 && <Empty title="No outstanding balances found" />}
          </div>
        </TabsContent>

        {/* 5. SERVICE REVENUE TAB */}
        <TabsContent value="services" className="space-y-4">
          <div className="rounded-lg border bg-card shadow-xs">
            <TableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Service Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Volume</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {serviceRevenueReport.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">{s.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{s.category}</td>
                      <td className="px-4 py-2.5 text-right tabular">{s.count}</td>
                      <td className="px-4 py-2.5 text-right font-medium tabular text-foreground">{money(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {serviceRevenueReport.length === 0 && <Empty title="No service revenue in selected period" />}
          </div>
        </TabsContent>

        {/* 6. CANCELLATIONS & REFUNDS TAB */}
        <TabsContent value="refunds" className="space-y-4">
          <div className="rounded-lg border bg-card shadow-xs">
            <TableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Doc Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Patient / Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Staff</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Refund Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cancellationsAndRefunds.map((cr, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <StatusBadge
                          status={cr.type}
                          tone={cr.type === "Refund" ? "amber" : "red"}
                        />
                      </td>
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDateTime(cr.date)}</td>
                      <td className="px-4 py-2 font-mono text-xs">{cr.docRef}</td>
                      <td className="px-4 py-2 font-medium">{cr.entity}</td>
                      <td className="px-4 py-2 text-destructive font-medium">{cr.reason}</td>
                      <td className="px-4 py-2 text-muted-foreground">{cr.by}</td>
                      <td className="px-4 py-2 text-right font-medium tabular text-destructive">
                        {cr.amount > 0 ? `-${money(cr.amount)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {cancellationsAndRefunds.length === 0 && <Empty title="No cancellations or refunds in this period" />}
          </div>
        </TabsContent>

        {/* 7. DOCTOR FEES TAB */}
        <TabsContent value="doctor-fees" className="space-y-4">
          <div className="rounded-lg border bg-card shadow-xs">
            <TableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Doctor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Consultant Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Standard Fee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Payout Rule</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Completed Visits</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {doctorFeesReport.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">{doc.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{doc.specialty}</td>
                      <td className="px-4 py-2.5 text-right tabular">{money(doc.fee)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{doc.payoutRule}</td>
                      <td className="px-4 py-2.5 text-right tabular">{doc.completedConsultations}</td>
                      <td className="px-4 py-2.5 text-right font-bold tabular text-primary">{money(doc.payableAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        </TabsContent>

        {/* 8. MESSAGES TAB */}
        <TabsContent value="messages" className="space-y-4">
          <div className="rounded-lg border bg-card shadow-xs">
            <TableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Sent At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Message Body</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {messagesReport.slice(0, 100).map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDateTime(m.date)}</td>
                      <td className="px-4 py-2 font-medium">{m.patient}</td>
                      <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{m.mobile}</td>
                      <td className="px-4 py-2 capitalize text-muted-foreground">{m.type.replace("_", " ")}</td>
                      <td className="px-4 py-2"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-2 max-w-sm truncate text-muted-foreground" title={m.text}>{m.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {messagesReport.length === 0 && <Empty title="No messages recorded in this timeframe" />}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

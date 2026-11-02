"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Sliders,
  ShieldAlert,
  PieChart,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RotateCcw,
  Building2,
  Wallet,
  Receipt,
  FileSpreadsheet,
  Info,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
} from "recharts";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BASELINE_FINANCIAL_DATA,
  BASELINE_MONTHLY_TREND,
  BASELINE_DEPT_REVENUE,
  BASELINE_EXPENSES,
  formatCurrency2DP,
} from "./mockData";

export function ConfigurableFinancialDashboard() {
  // Requirement 1: Slider to set displayPercentage (10% to 100%, default 100%)
  const [displayPercentage, setDisplayPercentage] = useState<number>(100);
  const [showOriginalComparison, setShowOriginalComparison] = useState<boolean>(true);
  const [activeViewTab, setActiveViewTab] = useState<"overview" | "breakdown" | "ledger">("overview");

  // Dynamic factor multiplier
  const factor = useMemo(() => displayPercentage / 100, [displayPercentage]);

  // Scaled High-Level KPIs
  const metrics = useMemo(() => {
    const gross = BASELINE_FINANCIAL_DATA.grossRevenue * factor;
    const exp = BASELINE_FINANCIAL_DATA.expenses * factor;
    const net = BASELINE_FINANCIAL_DATA.netProfit * factor;
    const coll = BASELINE_FINANCIAL_DATA.collections * factor;
    const rec = BASELINE_FINANCIAL_DATA.receivables * factor;
    const margin = gross > 0 ? (net / gross) * 100 : 0;

    return {
      grossRevenue: gross,
      expenses: exp,
      netProfit: net,
      collections: coll,
      receivables: rec,
      marginPercent: margin,
    };
  }, [factor]);

  // Scaled Monthly Trend
  const monthlyTrendData = useMemo(() => {
    return BASELINE_MONTHLY_TREND.map((item) => ({
      month: item.month,
      grossRevenue: Math.round(item.grossRevenue * factor * 100) / 100,
      expenses: Math.round(item.expenses * factor * 100) / 100,
      netProfit: Math.round(item.netProfit * factor * 100) / 100,
      baselineGross: item.grossRevenue,
    }));
  }, [factor]);

  // Scaled Department Revenue
  const deptRevenueData = useMemo(() => {
    return BASELINE_DEPT_REVENUE.map((d) => ({
      ...d,
      scaledAmount: Math.round(d.baselineAmount * factor * 100) / 100,
    }));
  }, [factor]);

  // Scaled Expenses
  const expensesData = useMemo(() => {
    return BASELINE_EXPENSES.map((e) => ({
      ...e,
      scaledAmount: Math.round(e.baselineAmount * factor * 100) / 100,
    }));
  }, [factor]);

  const handlePreset = (pct: number) => {
    setDisplayPercentage(pct);
    toast.info(`Report scaling adjusted to ${pct}%`);
  };

  const handleReset = () => {
    setDisplayPercentage(100);
    toast.success("Display percentage reset to 100% baseline");
  };

  return (
    <div className="relative min-h-[calc(100vh-6rem)] space-y-8 pb-16 antialiased">
      {/* Anti-Gravity Floating Ambient Elements */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -left-16 size-96 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -right-20 size-80 rounded-full bg-violet-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 left-1/4 size-72 rounded-full bg-cyan-500/10 blur-3xl"
      />

      {/* Floating Header Bar */}
      <header className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-11 overflow-hidden rounded-xl bg-white p-1 border border-border/60 shadow-md shrink-0 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Olympus Lanka Hospital Logo"
                className="size-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Configurable Financial Dashboard
                </h1>
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/5 text-primary font-medium text-xs shadow-2xs backdrop-blur-md"
                >
                  Interactive Prototype
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Executive financial oversight with real-time dynamic scaling & multi-department reporting.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action / View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={showOriginalComparison ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowOriginalComparison(!showOriginalComparison)}
            className="text-xs transition-all shadow-xs cursor-pointer"
          >
            <Info className="mr-1.5 size-3.5 text-primary" />
            {showOriginalComparison ? "Hide Baseline Comparison" : "Show Baseline Comparison"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast.success("Financial statement snapshot generated for executive review.", {
                description: `Current display ratio: ${displayPercentage}% · Base currency: LKR`,
              });
            }}
            className="text-xs transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="mr-1.5 size-3.5" />
            Export Statement
          </Button>
        </div>
      </header>

      {/* REQUIREMENT 1: Visually Distinct ADMIN CONFIGURATION Section */}
      <section
        aria-label="Admin Configuration Panel"
        className="relative z-10 overflow-hidden rounded-2xl border-2 border-primary/30 bg-card/85 p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-primary/50 hover:shadow-2xl"
      >
        {/* Subtle Decorative Gradient Header Strip */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-violet-500 to-amber-500" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Admin Banner Info */}
          <div className="space-y-1.5 max-w-md">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="size-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Admin Use Only
              </span>
              <span className="inline-block size-1.5 rounded-full bg-amber-500 animate-ping" />
            </div>

            <h2 className="text-base font-semibold text-foreground tracking-tight sm:text-lg">
              Report Multiplier Configuration
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dynamically calibrate all financial metrics, visualizations, and revenue streams between{" "}
              <span className="font-semibold text-foreground">10% and 100%</span>. All primary database ledgers
              remain unaltered.
            </p>
          </div>

          {/* Slider & Presets Controls */}
          <div className="flex-1 max-w-xl space-y-4 rounded-xl border border-border/80 bg-background/60 p-4 shadow-inner backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Display Percentage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">Multiplier: {factor.toFixed(2)}x</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary">
                  {displayPercentage}%
                </span>
              </div>
            </div>

            {/* Radix Slider */}
            <div className="space-y-1">
              <Slider
                value={[displayPercentage]}
                min={10}
                max={100}
                step={1}
                onValueChange={(val) => setDisplayPercentage(val[0] ?? 100)}
                className="py-1 cursor-pointer"
                aria-label="Display percentage multiplier"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
                <span>10% (Min)</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100% (Full Baseline)</span>
              </div>
            </div>

            {/* Quick Presets & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground mr-1">Presets:</span>
                {[25, 50, 75, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                      displayPercentage === preset
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={displayPercentage === 100}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="mr-1 size-3" />
                Reset (100%)
              </Button>
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        {displayPercentage !== 100 && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-500/10 px-3.5 py-2 text-xs text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <Info className="size-4 shrink-0" />
              <span>
                Report active at <strong className="font-semibold">{displayPercentage}%</strong> scale. Baseline
                Gross Revenue {formatCurrency2DP(BASELINE_FINANCIAL_DATA.grossRevenue)} scaled to{" "}
                <strong className="font-semibold">{formatCurrency2DP(metrics.grossRevenue)}</strong>.
              </span>
            </div>
            <button
              onClick={handleReset}
              className="underline text-xs font-semibold hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer"
            >
              Restore 100%
            </button>
          </div>
        )}
      </section>

      {/* REQUIREMENTS 2, 3, 4: FLOATING FINANCIAL KPI CARDS */}
      <section aria-label="Key Financial Metrics" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Current Financial Snapshot ({displayPercentage}% View)
          </h2>
          <span className="text-xs font-medium text-muted-foreground">Currency: LKR · 2 Decimals</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* 1. Gross Revenue */}
          <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 p-4 shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Gross Revenue</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DollarSign className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-foreground tabular">
              {formatCurrency2DP(metrics.grossRevenue)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                <ArrowUpRight className="mr-0.5 size-3.5" /> +12.4% MoM
              </span>
              {showOriginalComparison && (
                <span className="font-mono text-[10px] text-muted-foreground" title="Original 100% baseline">
                  Base: {formatCurrency2DP(BASELINE_FINANCIAL_DATA.grossRevenue)}
                </span>
              )}
            </div>
          </div>

          {/* 2. Operating Expenses */}
          <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 p-4 shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-destructive/40 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Operating Expenses</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Wallet className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-foreground tabular">
              {formatCurrency2DP(metrics.expenses)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center text-muted-foreground font-medium">
                <ArrowDownRight className="mr-0.5 size-3.5 text-emerald-600" /> -2.1% Budget
              </span>
              {showOriginalComparison && (
                <span className="font-mono text-[10px] text-muted-foreground" title="Original 100% baseline">
                  Base: {formatCurrency2DP(BASELINE_FINANCIAL_DATA.expenses)}
                </span>
              )}
            </div>
          </div>

          {/* 3. Net Profit */}
          <div className="group relative overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-card/85 p-4 shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/60 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Net Profit</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular">
              {formatCurrency2DP(metrics.netProfit)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Margin: {metrics.marginPercent.toFixed(1)}%
              </span>
              {showOriginalComparison && (
                <span className="font-mono text-[10px] text-muted-foreground" title="Original 100% baseline">
                  Base: {formatCurrency2DP(BASELINE_FINANCIAL_DATA.netProfit)}
                </span>
              )}
            </div>
          </div>

          {/* 4. Cash Collections */}
          <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 p-4 shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Cash Collections</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-foreground tabular">
              {formatCurrency2DP(metrics.collections)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-emerald-600 font-medium">89.8% Settled</span>
              {showOriginalComparison && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  Base: {formatCurrency2DP(BASELINE_FINANCIAL_DATA.collections)}
                </span>
              )}
            </div>
          </div>

          {/* 5. Receivables */}
          <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 p-4 shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-500/40 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Receivables</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Building2 className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-foreground tabular">
              {formatCurrency2DP(metrics.receivables)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-amber-600 font-medium">Insurance claims</span>
              {showOriginalComparison && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  Base: {formatCurrency2DP(BASELINE_FINANCIAL_DATA.receivables)}
                </span>
              )}
            </div>
          </div>

          {/* 6. Active Multiplier */}
          <div className="group relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">Factor Index</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sliders className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-primary tabular">
              {displayPercentage}%
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Ratio: {factor.toFixed(2)}x</span>
              <span className="text-xs text-primary font-medium">Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* VIEW TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 border-b pb-2">
        <button
          type="button"
          onClick={() => setActiveViewTab("overview")}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeViewTab === "overview"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <BarChart3 className="size-3.5" />
          Overview & Trajectory
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab("breakdown")}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeViewTab === "breakdown"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <PieChart className="size-3.5" />
          Departmental Allocations
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab("ledger")}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeViewTab === "ledger"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Layers className="size-3.5" />
          Configured Ledger Comparison
        </button>
      </div>

      {/* TAB CONTENT 1: OVERVIEW & TRAJECTORY CHARTS */}
      {activeViewTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Financial Trend Area Chart */}
          <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 lg:col-span-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Six-Month Financial Trajectory (Scaled at {displayPercentage}%)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Comparing Gross Revenue, Operating Expenses, and Net Profit scaled dynamically.
                </p>
              </div>
              <Badge variant="secondary" className="font-mono text-xs self-start sm:self-auto">
                Dynamic Ratio: {factor.toFixed(2)}x
              </Badge>
            </div>

            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.55 0.13 152)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="oklch(0.55 0.13 152)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    stroke="var(--muted-foreground)"
                    tickFormatter={(val) => `LKR ${(val / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency2DP(Number(val ?? 0)), ""]}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "0.75rem",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Area
                    type="monotone"
                    dataKey="grossRevenue"
                    name="Gross Revenue"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGross)"
                  />
                  <Area
                    type="monotone"
                    dataKey="netProfit"
                    name="Net Profit"
                    stroke="oklch(0.55 0.13 152)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorNet)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Operating Expenses"
                    stroke="oklch(0.56 0.225 28)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Share Donut Panel */}
          <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 lg:col-span-4 flex flex-col justify-between">
            <div className="border-b pb-3">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Revenue Streams ({displayPercentage}%)
              </h3>
              <p className="text-xs text-muted-foreground">Departmental proportion after calibration.</p>
            </div>

            <div className="h-56 w-full my-2">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={deptRevenueData}
                    dataKey="scaledAmount"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {deptRevenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [
                      formatCurrency2DP(Number(val ?? 0)),
                      "Contribution",
                    ]}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 border-t pt-3">
              {deptRevenueData.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="size-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="truncate text-muted-foreground">{d.department}</span>
                  </div>
                  <span className="font-mono font-semibold tabular text-foreground">
                    {formatCurrency2DP(d.scaledAmount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: DEPARTMENTAL ALLOCATIONS */}
      {activeViewTab === "breakdown" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Breakdown */}
          <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-lg backdrop-blur-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Departmental Revenue Allocations</h3>
                <p className="text-xs text-muted-foreground">
                  Individual stream calculations at {displayPercentage}% scaling.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                Total: {formatCurrency2DP(metrics.grossRevenue)}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {deptRevenueData.map((item) => {
                const share = (item.scaledAmount / metrics.grossRevenue) * 100;
                return (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-border/50 bg-background/50 p-3.5 transition-all hover:border-primary/40 hover:bg-background/80"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-xs text-foreground">{item.department}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">({item.code})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-foreground tabular">
                          {formatCurrency2DP(item.scaledAmount)}
                        </span>
                        {showOriginalComparison && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Base: {formatCurrency2DP(item.baselineAmount)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${share}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground shrink-0 w-12 text-right">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-lg backdrop-blur-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Operational Expense Centers</h3>
                <p className="text-xs text-muted-foreground">
                  Disbursed hospital expenses at {displayPercentage}% scaling.
                </p>
              </div>
              <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                Total: {formatCurrency2DP(metrics.expenses)}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {expensesData.map((item) => {
                const share = (item.scaledAmount / metrics.expenses) * 100;
                return (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-border/50 bg-background/50 p-3.5 transition-all hover:border-destructive/30 hover:bg-background/80"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-xs text-foreground">{item.category}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">({item.code})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-foreground tabular">
                          {formatCurrency2DP(item.scaledAmount)}
                        </span>
                        {showOriginalComparison && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Base: {formatCurrency2DP(item.baselineAmount)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${share}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground shrink-0 w-12 text-right">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: CONFIGURED LEDGER COMPARISON TABLE */}
      {activeViewTab === "ledger" && (
        <section
          aria-label="Configured Ledger Comparison"
          className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-lg backdrop-blur-xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Comprehensive Ledger Line-Items (Baseline vs. Scaled Multiplier)
              </h3>
              <p className="text-xs text-muted-foreground">
                All values computed with exact mathematical factor (displayPercentage / 100 = {factor.toFixed(2)}).
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              Formula: Display Value = Baseline × ({displayPercentage} / 100)
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Account / Code</th>
                  <th className="px-4 py-2.5 font-semibold">Classification</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Original Baseline (100%)</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Configured Multiplier</th>
                  <th className="px-4 py-2.5 font-semibold text-right font-bold text-foreground">
                    Scaled Rendered Value (2 DP)
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-right">Delta Reduction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {/* Gross Revenue */}
                <tr className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    Gross Revenue <span className="text-[10px] font-mono text-muted-foreground">(REV-TOTAL)</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                      Income
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {formatCurrency2DP(BASELINE_FINANCIAL_DATA.grossRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-primary font-semibold">
                    {displayPercentage}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency2DP(metrics.grossRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    - {formatCurrency2DP(BASELINE_FINANCIAL_DATA.grossRevenue - metrics.grossRevenue)}
                  </td>
                </tr>

                {/* Operating Expenses */}
                <tr className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    Operating Expenses <span className="text-[10px] font-mono text-muted-foreground">(EXP-TOTAL)</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                      Outflow
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {formatCurrency2DP(BASELINE_FINANCIAL_DATA.expenses)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-primary font-semibold">
                    {displayPercentage}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency2DP(metrics.expenses)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    - {formatCurrency2DP(BASELINE_FINANCIAL_DATA.expenses - metrics.expenses)}
                  </td>
                </tr>

                {/* Net Profit */}
                <tr className="bg-emerald-500/5 hover:bg-emerald-500/10">
                  <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-400">
                    Net Profit <span className="text-[10px] font-mono">(NET-FINAL)</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-[10px] text-emerald-700 font-semibold">
                      Net Retained
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {formatCurrency2DP(BASELINE_FINANCIAL_DATA.netProfit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600 font-semibold">
                    {displayPercentage}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency2DP(metrics.netProfit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    - {formatCurrency2DP(BASELINE_FINANCIAL_DATA.netProfit - metrics.netProfit)}
                  </td>
                </tr>

                {/* Collections */}
                <tr className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    Settled Cash Collections <span className="text-[10px] font-mono text-muted-foreground">(CASH-COLL)</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      Liquidity
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {formatCurrency2DP(BASELINE_FINANCIAL_DATA.collections)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-primary font-semibold">
                    {displayPercentage}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency2DP(metrics.collections)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    - {formatCurrency2DP(BASELINE_FINANCIAL_DATA.collections - metrics.collections)}
                  </td>
                </tr>

                {/* Receivables */}
                <tr className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    Unsettled Receivables <span className="text-[10px] font-mono text-muted-foreground">(AR-PENDING)</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                      Receivable
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {formatCurrency2DP(BASELINE_FINANCIAL_DATA.receivables)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-primary font-semibold">
                    {displayPercentage}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency2DP(metrics.receivables)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    - {formatCurrency2DP(BASELINE_FINANCIAL_DATA.receivables - metrics.receivables)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Floating Footer Note */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          <span>Configurable Financial Dashboard Prototype · Anti-gravity Floating Architecture</span>
        </div>
        <span className="font-mono text-[11px]">Formula verification: Value = Base × (displayPercentage / 100)</span>
      </footer>
    </div>
  );
}

import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const logoB64File = path.join(publicDir, 'logo-b64.txt');
let logoB64 = '';
if (fs.existsSync(logoB64File)) {
  logoB64 = fs.readFileSync(logoB64File, 'utf8').trim();
} else {
  const logoBuf = fs.readFileSync(path.join(publicDir, 'logo.png'));
  logoB64 = 'data:image/jpeg;base64,' + logoBuf.toString('base64');
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Olympus Lanka Hospital — Executive Financial Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0f172a;
      --primary-accent: #0284c7;
      --brand-navy: #091e42;
      --brand-blue: #0284c7;
      --success: #059669;
      --slate-50: #f8fafc;
      --slate-100: #f1f5f9;
      --slate-200: #e2e8f0;
      --slate-300: #cbd5e1;
      --slate-500: #64748b;
      --slate-700: #334155;
      --slate-900: #0f172a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      padding: 32px 16px 80px;
    }
    .report-wrapper {
      max-width: 1040px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.05);
      overflow: hidden;
    }
    .action-bar {
      max-width: 1040px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 18px;
      background: #ffffff;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.05);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: inherit;
      font-weight: 600;
      font-size: 13px;
      padding: 9px 18px;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-primary {
      background: #0284c7;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #0369a1;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .header-section {
      padding: 36px 40px 24px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    }
    .brand-block {
      display: flex;
      gap: 18px;
      align-items: center;
    }
    .logo-frame {
      width: 68px;
      height: 68px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 4px;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logo-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .hospital-title {
      font-size: 23px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    .hospital-subtitle {
      font-size: 13px;
      font-weight: 600;
      color: #0284c7;
      margin-top: 2px;
    }
    .hospital-meta {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 5px;
      line-height: 1.4;
    }
    .report-meta-box {
      text-align: right;
    }
    .report-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .report-name {
      font-size: 19px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .report-period {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      margin-top: 3px;
    }
    .report-timestamp {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 3px;
      font-family: "JetBrains Mono", monospace;
    }
    .content-body {
      padding: 32px 40px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .kpi-card {
      padding: 16px 18px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      position: relative;
    }
    .kpi-card.highlight {
      background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border-color: #0f172a;
    }
    .kpi-label {
      font-size: 11.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      margin-bottom: 6px;
    }
    .kpi-card.highlight .kpi-label {
      color: #94a3b8;
    }
    .kpi-value {
      font-size: 21px;
      font-weight: 700;
      color: #0f172a;
      font-family: "JetBrains Mono", monospace;
      letter-spacing: -0.02em;
    }
    .kpi-card.highlight .kpi-value {
      color: #ffffff;
    }
    .kpi-sub {
      font-size: 11px;
      font-weight: 500;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
      color: #059669;
    }
    .kpi-card.highlight .kpi-sub {
      color: #38bdf8;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 16px;
      background: #0284c7;
      border-radius: 2px;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 32px;
    }
    .report-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 10px 14px;
      border-top: 1px solid #e2e8f0;
      border-bottom: 2px solid #e2e8f0;
      text-align: left;
    }
    .report-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .report-table tr:hover td {
      background: #fafbfd;
    }
    .report-table .text-right {
      text-align: right;
    }
    .report-table .tabular {
      font-family: "JetBrains Mono", monospace;
      font-weight: 500;
      font-size: 12.5px;
    }
    .report-table tr.total-row td {
      background: #f8fafc;
      font-weight: 700;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
      color: #0f172a;
    }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-info { background: #e0f2fe; color: #0284c7; }
    .grid-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 32px;
    }
    .pnl-statement {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 32px;
    }
    .pnl-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 18px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    .pnl-row:last-child {
      border-bottom: none;
    }
    .pnl-row.header {
      background: #f8fafc;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 11.5px;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }
    .pnl-row.section-break {
      background: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
    }
    .pnl-row.highlight-net {
      background: #eff6ff;
      font-weight: 800;
      color: #0369a1;
      font-size: 14.5px;
      border-top: 2px solid #0284c7;
      border-bottom: 2px solid #0284c7;
    }
    .pnl-num {
      font-family: "JetBrains Mono", monospace;
      font-weight: 600;
    }
    .sign-section {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px dashed #cbd5e1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }
    .sign-block {
      text-align: center;
    }
    .sign-line {
      height: 48px;
      border-bottom: 1px solid #94a3b8;
      margin-bottom: 8px;
    }
    .sign-title {
      font-weight: 700;
      font-size: 12px;
      color: #1e293b;
    }
    .sign-sub {
      font-size: 11px;
      color: #64748b;
    }
    .footer-note {
      margin-top: 36px;
      padding: 16px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .action-bar {
        display: none !important;
      }
      .report-wrapper {
        box-shadow: none;
        border-radius: 0;
        max-width: 100%;
        border: none;
      }
      .header-section {
        padding: 16px 20px;
      }
      .content-body {
        padding: 16px 20px;
      }
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
    }
  </style>
</head>
<body>

  <!-- Top Action Bar (Hidden when printing/saving to PDF) -->
  <div class="action-bar">
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-weight:700; font-size:13px; color:#0f172a;">Executive Financial Template:</span>
      <span style="font-size:12px; color:#64748b;">Olympus Lanka Hospital — Outpatient Performance Demo</span>
    </div>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-secondary" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print / Save as PDF
      </button>
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download PDF
      </button>
    </div>
  </div>

  <!-- Main Report Document -->
  <div class="report-wrapper" id="report">

    <!-- Header Section with Official Brand Logo -->
    <header class="header-section">
      <div class="brand-block">
        <div class="logo-frame">
          <img src="${logoB64}" alt="Olympus Lanka Hospital Logo" onerror="this.src='logo.png'" />
        </div>
        <div>
          <h1 class="hospital-title">Olympus Lanka Hospital</h1>
          <div class="hospital-subtitle">Outpatient Operations & Specialist Consultation Centre</div>
          <div class="hospital-meta">
            142/A Galle Road, Colombo 03, Sri Lanka · Hotline: +94 11 234 5678<br />
            Ministry of Health Reg: MOH/WP/COL/2024/782 · Company Reg: PV 00294819
          </div>
        </div>
      </div>
      <div class="report-meta-box">
        <span class="report-badge">AUDITED FINANCIAL REPORT</span>
        <div class="report-name">Monthly Financial Statement</div>
        <div class="report-period">Period: 01 Sep 2026 – 30 Sep 2026</div>
        <div class="report-timestamp">Generated: 2026-10-10 22:45 IST · Currency: LKR</div>
      </div>
    </header>

    <div class="content-body">

      <!-- Executive KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Gross Revenue (Billed)</div>
          <div class="kpi-value">LKR 6,480,000</div>
          <div class="kpi-sub">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
            +14.2% vs previous month
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Collections</div>
          <div class="kpi-value">LKR 6,192,500</div>
          <div class="kpi-sub">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
            95.6% collection efficiency
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Hospital Charges Retained</div>
          <div class="kpi-value">LKR 2,745,000</div>
          <div class="kpi-sub">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
            44.3% retention margin
          </div>
        </div>
        <div class="kpi-card highlight">
          <div class="kpi-label">Net Operating Surplus (EBITDA)</div>
          <div class="kpi-value">LKR 1,822,500</div>
          <div class="kpi-sub">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
            29.4% operating margin
          </div>
        </div>
      </div>

      <!-- Statement of Financial Performance (P&L Breakdown) -->
      <div class="section-title">Statement of Outpatient Financial Performance</div>
      <div class="pnl-statement">
        <div class="pnl-row header">
          <span>Financial Line Item</span>
          <span>Amount (LKR)</span>
        </div>
        <div class="pnl-row">
          <span>Doctor Consultation Gross Billings (1,420 encounters)</span>
          <span class="pnl-num">4,970,000</span>
        </div>
        <div class="pnl-row">
          <span>Diagnostics, ECG & Laboratory Investigations</span>
          <span class="pnl-num">940,000</span>
        </div>
        <div class="pnl-row">
          <span>OPD Pharmacy & Nursing Procedure Charges</span>
          <span class="pnl-num">570,000</span>
        </div>
        <div class="pnl-row section-break">
          <span>1. Gross Operating Revenue</span>
          <span class="pnl-num">6,480,000</span>
        </div>
        <div class="pnl-row">
          <span style="padding-left:16px; color:#64748b;">Less: Upfront Patient Discounts & Loyalty Waivers</span>
          <span class="pnl-num" style="color:#dc2626;">(145,000)</span>
        </div>
        <div class="pnl-row">
          <span style="padding-left:16px; color:#64748b;">Less: Approved Patient Refunds & Cancellations</span>
          <span class="pnl-num" style="color:#dc2626;">(42,500)</span>
        </div>
        <div class="pnl-row section-break">
          <span>2. Net Operating Revenue</span>
          <span class="pnl-num">6,292,500</span>
        </div>
        <div class="pnl-row">
          <span style="padding-left:16px; color:#64748b;">Less: Consultant Doctor Shares Disbursed (Doctor Payout)</span>
          <span class="pnl-num" style="color:#dc2626;">(3,547,500)</span>
        </div>
        <div class="pnl-row section-break" style="background:#f8fafc;">
          <span style="font-weight:700;">3. Hospital Charges & Facility Gross Surplus</span>
          <span class="pnl-num" style="color:#059669;">2,745,000</span>
        </div>
        <div class="pnl-row">
          <span style="padding-left:16px; color:#64748b;">Less Operating Expenses: Medical Consumables & Reagents</span>
          <span class="pnl-num" style="color:#dc2626;">(280,000)</span>
        </div>
        <div class="pnl-row">
          <span style="padding-left:16px; color:#64748b;">Less Operating Expenses: Clinic Utilities & Electricity</span>
          <span class="pnl-num" style="color:#dc2626;">(195,000)</span>
        </div>
        <div class="pnl-row">
          <span style="padding-left:16px; color:#64748b;">Less Operating Expenses: Nursing Staff & Front Desk Salaries</span>
          <span class="pnl-num" style="color:#dc2626;">(340,000)</span>
        </div>
        <div class="pnl-row">
          <span style="padding-left:16px; color:#64748b;">Less Operating Expenses: HMS Software, SMS Gateway & IT Support</span>
          <span class="pnl-num" style="color:#dc2626;">(107,500)</span>
        </div>
        <div class="pnl-row highlight-net">
          <span>NET OPERATING SURPLUS / PROFIT (EBITDA)</span>
          <span class="pnl-num">LKR 1,822,500</span>
        </div>
      </div>

      <!-- Consultant Types & Hospital Charge Breakdown -->
      <div class="section-title">Revenue & Hospital Charge Breakdown by Consultant Type</div>
      <table class="report-table">
        <thead>
          <tr>
            <th>Consultant Type</th>
            <th class="text-right">Specialists</th>
            <th class="text-right">Patients Seen</th>
            <th class="text-right">Gross Billing (LKR)</th>
            <th class="text-right">Doctor Share (LKR)</th>
            <th class="text-right">Hospital Charge (LKR)</th>
            <th class="text-right">Retention</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Cardiology</strong></td>
            <td class="text-right tabular">3</td>
            <td class="text-right tabular">340</td>
            <td class="text-right tabular">1,360,000</td>
            <td class="text-right tabular">952,000</td>
            <td class="text-right tabular">408,000</td>
            <td class="text-right"><span class="badge badge-success">30.0%</span></td>
          </tr>
          <tr>
            <td><strong>Pediatrics</strong></td>
            <td class="text-right tabular">2</td>
            <td class="text-right tabular">295</td>
            <td class="text-right tabular">885,000</td>
            <td class="text-right tabular">531,000</td>
            <td class="text-right tabular">354,000</td>
            <td class="text-right"><span class="badge badge-success">40.0%</span></td>
          </tr>
          <tr>
            <td><strong>General Medicine</strong></td>
            <td class="text-right tabular">4</td>
            <td class="text-right tabular">380</td>
            <td class="text-right tabular">950,000</td>
            <td class="text-right tabular">570,000</td>
            <td class="text-right tabular">380,000</td>
            <td class="text-right"><span class="badge badge-success">40.0%</span></td>
          </tr>
          <tr>
            <td><strong>Orthopedics</strong></td>
            <td class="text-right tabular">2</td>
            <td class="text-right tabular">185</td>
            <td class="text-right tabular">740,000</td>
            <td class="text-right tabular">518,000</td>
            <td class="text-right tabular">222,000</td>
            <td class="text-right"><span class="badge badge-success">30.0%</span></td>
          </tr>
          <tr>
            <td><strong>Dermatology</strong></td>
            <td class="text-right tabular">2</td>
            <td class="text-right tabular">130</td>
            <td class="text-right tabular">585,000</td>
            <td class="text-right tabular">351,000</td>
            <td class="text-right tabular">234,000</td>
            <td class="text-right"><span class="badge badge-success">40.0%</span></td>
          </tr>
          <tr>
            <td><strong>Obstetrics & Gynaecology</strong></td>
            <td class="text-right tabular">2</td>
            <td class="text-right tabular">90</td>
            <td class="text-right tabular">450,000</td>
            <td class="text-right tabular">303,000</td>
            <td class="text-right tabular">147,000</td>
            <td class="text-right"><span class="badge badge-success">32.7%</span></td>
          </tr>
          <tr class="total-row">
            <td>TOTAL / AVERAGE</td>
            <td class="text-right tabular">15</td>
            <td class="text-right tabular">1,420</td>
            <td class="text-right tabular">LKR 4,970,000</td>
            <td class="text-right tabular">LKR 3,225,000</td>
            <td class="text-right tabular">LKR 1,745,000</td>
            <td class="text-right"><span class="badge badge-info">35.1%</span></td>
          </tr>
        </tbody>
      </table>

      <!-- Collections & Key Indicators Grid -->
      <div class="grid-two-col">
        <div>
          <div class="section-title">Payment Method Reconciliation</div>
          <table class="report-table" style="margin-bottom:0;">
            <thead>
              <tr>
                <th>Method</th>
                <th class="text-right">Receipts</th>
                <th class="text-right">Amount (LKR)</th>
                <th class="text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cash Counter</td>
                <td class="text-right tabular">840</td>
                <td class="text-right tabular">2,985,000</td>
                <td class="text-right tabular">48.2%</td>
              </tr>
              <tr>
                <td>Credit / Debit Card (POS)</td>
                <td class="text-right tabular">510</td>
                <td class="text-right tabular">2,415,500</td>
                <td class="text-right tabular">39.0%</td>
              </tr>
              <tr>
                <td>Direct Bank Transfer</td>
                <td class="text-right tabular">82</td>
                <td class="text-right tabular">492,000</td>
                <td class="text-right tabular">7.9%</td>
              </tr>
              <tr>
                <td>Corporate & Insurance (TPA)</td>
                <td class="text-right tabular">45</td>
                <td class="text-right tabular">300,000</td>
                <td class="text-right tabular">4.8%</td>
              </tr>
              <tr class="total-row">
                <td>Total Collections</td>
                <td class="text-right tabular">1,477</td>
                <td class="text-right tabular">6,192,500</td>
                <td class="text-right tabular">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div class="section-title">Key Operational Metrics</div>
          <div style="border:1px solid #e2e8f0; border-radius:10px; padding:18px 20px; background:#fafbfc; display:flex; flex-direction:column; gap:13px;">
            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:#64748b;">Average Revenue per Patient:</span>
              <strong style="font-family:'JetBrains Mono'; color:#0f172a;">LKR 4,563</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:#64748b;">Daily Patient Consult Volume:</span>
              <strong style="font-family:'JetBrains Mono'; color:#0f172a;">47.3 patients / day</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:#64748b;">Specialist Sessions Held:</span>
              <strong style="font-family:'JetBrains Mono'; color:#0f172a;">118 clinical sessions</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:#64748b;">Outstanding Patient Receivables:</span>
              <strong style="font-family:'JetBrains Mono'; color:#d97706;">LKR 100,000 (1.5%)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:#64748b;">Auditor Verification Status:</span>
              <span class="badge badge-success">AUDITED & VERIFIED</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Executive Sign-Off Section -->
      <div class="sign-section">
        <div class="sign-block">
          <div class="sign-line"></div>
          <div class="sign-title">Prepared By: Head of Finance</div>
          <div class="sign-sub">Financial Accountant, ACMA</div>
        </div>
        <div class="sign-block">
          <div class="sign-line"></div>
          <div class="sign-title">Reviewed By: Head of Operations</div>
          <div class="sign-sub">Directorate of Outpatient Services</div>
        </div>
        <div class="sign-block">
          <div class="sign-line"></div>
          <div class="sign-title">Approved By: Managing Director</div>
          <div class="sign-sub">Olympus Lanka Hospital (Pvt) Ltd</div>
        </div>
      </div>

      <!-- Footer Disclaimer -->
      <div class="footer-note">
        <div>
          This document is generated automatically by <strong>Olympus Lanka Hospital Information System</strong>.<br />
          Proprietary and confidential. Intended solely for hospital executive administration and board governance.
        </div>
        <div style="font-family:'JetBrains Mono'; font-size:10.5px; color:#94a3b8; text-align:right;">
          DOC REF: OLH-FIN-2026-M09<br />
          Olympus Lanka Hospital (Pvt) Ltd
        </div>
      </div>

    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync(path.join(publicDir, 'financial-report-template.html'), html);
fs.writeFileSync(path.resolve('..', 'financial-report-template.html'), html);
console.log('Generated template in public/ and workspace root successfully.');

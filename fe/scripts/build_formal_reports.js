import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const logoBuf = fs.readFileSync(path.join(publicDir, 'logo.png'));
const logoB64 = 'data:image/jpeg;base64,' + logoBuf.toString('base64');

// Common CSS for formal reports
const formalStyles = `
  :root {
    --primary: #0f2744;
    --navy: #0a1f3a;
    --navy-light: #163a66;
    --accent: #0284c7;
    --text-main: #1e293b;
    --text-muted: #64748b;
    --border-dark: #0a1f3a;
    --border-light: #e2e8f0;
    --bg-subtle: #f8fafc;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Times New Roman", Times, "Plus Jakarta Sans", serif;
    background: #f1f5f9;
    color: var(--text-main);
    line-height: 1.45;
    padding: 24px 16px 80px;
    -webkit-font-smoothing: antialiased;
  }
  .report-page {
    max-width: 980px;
    margin: 0 auto 32px;
    background: #ffffff;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid #cbd5e1;
    padding: 44px 52px;
    position: relative;
  }
  .action-nav {
    max-width: 980px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .btn-group {
    display: flex;
    gap: 8px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 600;
    padding: 7px 14px;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid transparent;
    text-decoration: none;
    transition: all 0.15s ease;
  }
  .btn-primary { background: #0a1f3a; color: #ffffff; }
  .btn-primary:hover { background: #163a66; }
  .btn-outline { background: #ffffff; color: #1e293b; border-color: #cbd5e1; }
  .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
  .btn-accent { background: #0284c7; color: #ffffff; }
  .btn-accent:hover { background: #0369a1; }
  
  .tab-pill {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #475569;
    cursor: pointer;
  }
  .tab-pill.active {
    background: #0a1f3a;
    color: #ffffff;
    border-color: #0a1f3a;
  }

  /* Formal Report Header */
  .doc-header {
    border-bottom: 2px solid #0a1f3a;
    padding-bottom: 18px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .brand-group {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  .logo-box {
    width: 72px;
    height: 72px;
    border: 1px solid #cbd5e1;
    padding: 4px;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo-box img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .corp-name {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: #0a1f3a;
    text-transform: uppercase;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .corp-branch {
    font-size: 13px;
    font-weight: 600;
    color: #0284c7;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 1px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .corp-address {
    font-size: 11.5px;
    color: #475569;
    margin-top: 4px;
    line-height: 1.4;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .doc-meta {
    text-align: right;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .doc-classification {
    display: inline-block;
    padding: 3px 8px;
    background: #f1f5f9;
    border: 1px solid #94a3b8;
    color: #0f172a;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .doc-title {
    font-size: 17px;
    font-weight: 800;
    color: #0a1f3a;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .doc-ref {
    font-size: 11.5px;
    font-family: "Courier New", Courier, monospace;
    font-weight: 700;
    color: #334155;
    margin-top: 3px;
  }
  .doc-date {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }

  /* Formal Subheader Memo */
  .memo-grid {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #0a1f3a;
    padding: 12px 16px;
    margin-bottom: 24px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11.5px;
  }
  .memo-item span {
    display: block;
    color: #64748b;
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .memo-item strong {
    color: #0a1f3a;
    font-weight: 700;
  }

  /* Formal Section Headings */
  .section-h {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #0a1f3a;
    border-bottom: 1.5px solid #0a1f3a;
    padding-bottom: 4px;
    margin: 24px 0 12px;
  }

  /* Formal Accounting Tables */
  .formal-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-bottom: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .formal-table th {
    background: #f1f5f9;
    border-top: 1.5px solid #0a1f3a;
    border-bottom: 1.5px solid #0a1f3a;
    padding: 7px 10px;
    text-align: left;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #0a1f3a;
  }
  .formal-table td {
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
  }
  .formal-table tr:nth-child(even) td {
    background: #fafbfc;
  }
  .formal-table .text-right { text-align: right; }
  .formal-table .num {
    font-family: "Courier New", Courier, monospace;
    font-weight: 600;
    font-size: 11.5px;
  }
  .formal-table tr.total-row td {
    border-top: 1.5px solid #0a1f3a;
    border-bottom: 2.5px double #0a1f3a;
    font-weight: 800;
    background: #f8fafc;
    color: #0a1f3a;
  }
  .formal-table tr.sub-head td {
    background: #edf2f7;
    font-weight: 700;
    color: #0a1f3a;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 5px 10px;
  }

  /* Formal P&L Statement */
  .pnl-ledger {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-bottom: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .pnl-ledger td {
    padding: 6.5px 12px;
    border-bottom: 1px solid #f1f5f9;
  }
  .pnl-ledger .pnl-hdr {
    background: #0a1f3a;
    color: #ffffff;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
  }
  .pnl-ledger .pnl-hdr td {
    border-bottom: none;
    padding: 8px 12px;
  }
  .pnl-ledger .sub-total td {
    font-weight: 700;
    border-top: 1px solid #94a3b8;
    background: #f8fafc;
    color: #0a1f3a;
  }
  .pnl-ledger .grand-total td {
    font-weight: 800;
    font-size: 13.5px;
    border-top: 2px solid #0a1f3a;
    border-bottom: 3px double #0a1f3a;
    background: #eef6ff;
    color: #0369a1;
  }

  /* Two Column Balance Schedules */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }

  /* Sign-Off Block */
  .sign-area {
    margin-top: 36px;
    padding-top: 20px;
    border-top: 1.5px solid #cbd5e1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .sign-col {
    text-align: center;
  }
  .sign-line {
    border-bottom: 1px solid #64748b;
    height: 44px;
    margin-bottom: 8px;
  }
  .sign-name {
    font-size: 11.5px;
    font-weight: 700;
    color: #0a1f3a;
  }
  .sign-role {
    font-size: 10.5px;
    color: #64748b;
  }

  /* Formal Footnotes */
  .audit-notes {
    margin-top: 24px;
    padding: 10px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    font-size: 10.5px;
    color: #64748b;
    line-height: 1.5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  @media print {
    body { background: #ffffff; padding: 0; }
    .action-nav { display: none !important; }
    .report-page {
      box-shadow: none;
      border: none;
      padding: 0;
      margin: 0;
      max-width: 100%;
    }
    @page {
      size: A4 portrait;
      margin: 14mm 16mm;
    }
  }
`;

// 1. MONTHLY REPORT HTML CONTENT
function renderMonthlyReport(embeddedLogo) {
  return `
    <div class="report-page" id="monthly-view">
      <!-- Formal Document Header -->
      <div class="doc-header">
        <div class="brand-group">
          <div class="logo-box">
            <img src="${embeddedLogo}" alt="Olympus Lanka Hospital" onerror="this.src='/logo.png'" />
          </div>
          <div>
            <div class="corp-name">Olympus Lanka Hospital (Pvt) Ltd</div>
            <div class="corp-branch">Outpatient & Specialist Care Centre · Thissamaharama</div>
            <div class="corp-address">
              Hospital Road, Thissamaharama, Southern Province, Sri Lanka<br />
              Tel: +94 47 223 9800 · Email: finance@olympuslanka.lk · Web: www.olympuslanka.lk<br />
              MOH Reg: MOH/SP/HAM/2024/782 · Company Reg: PV 00294819
            </div>
          </div>
        </div>
        <div class="doc-meta">
          <div class="doc-classification">CONFIDENTIAL · STATUTORY</div>
          <div class="doc-title">Monthly Financial Statement</div>
          <div class="doc-ref">DOC NO: OLH-MFR-2026-M09</div>
          <div class="doc-date">Reporting Period: 01 Sep 2026 – 30 Sep 2026</div>
          <div class="doc-date">Issue Date: 10 Oct 2026 | Currency: LKR</div>
        </div>
      </div>

      <!-- Formal Transmittal Memo Grid -->
      <div class="memo-grid">
        <div class="memo-item">
          <span>Reporting Entity</span>
          <strong>Olympus Lanka Hospital (Pvt) Ltd</strong>
        </div>
        <div class="memo-item">
          <span>Operating Location</span>
          <strong>Thissamaharama Outpatient Facility</strong>
        </div>
        <div class="memo-item">
          <span>Audited Period</span>
          <strong>September 2026 (Monthly Closure)</strong>
        </div>
        <div class="memo-item">
          <span>Accounting Basis</span>
          <strong>Modified Accrual (SLFRS / LKAS)</strong>
        </div>
      </div>

      <!-- Section 1: Executive Performance Summary -->
      <div class="section-h">1. Executive Financial Summary</div>
      <table class="formal-table">
        <thead>
          <tr>
            <th>Key Metric</th>
            <th class="text-right">Period Budget (LKR)</th>
            <th class="text-right">Actual Results (LKR)</th>
            <th class="text-right">Variance (LKR)</th>
            <th class="text-right">% Achieved</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Gross Outpatient Billing (Revenues)</strong></td>
            <td class="text-right num">6,000,000</td>
            <td class="text-right num">6,480,000</td>
            <td class="text-right num" style="color:#059669;">+480,000</td>
            <td class="text-right num">108.0%</td>
          </tr>
          <tr>
            <td><strong>Discounts, Waivers & Approved Refunds</strong></td>
            <td class="text-right num">(150,000)</td>
            <td class="text-right num">(187,500)</td>
            <td class="text-right num" style="color:#dc2626;">-37,500</td>
            <td class="text-right num">125.0%</td>
          </tr>
          <tr>
            <td><strong>Net Realized Revenue</strong></td>
            <td class="text-right num">5,850,000</td>
            <td class="text-right num">6,292,500</td>
            <td class="text-right num" style="color:#059669;">+442,500</td>
            <td class="text-right num">107.6%</td>
          </tr>
          <tr>
            <td><strong>Consultant Doctor Fees Disbursed (Doctor Share)</strong></td>
            <td class="text-right num">(3,300,000)</td>
            <td class="text-right num">(3,547,500)</td>
            <td class="text-right num">-247,500</td>
            <td class="text-right num">107.5%</td>
          </tr>
          <tr style="background:#f8fafc; font-weight:700;">
            <td><strong>Hospital Charges Retained (Operating Margin)</strong></td>
            <td class="text-right num">2,550,000</td>
            <td class="text-right num" style="color:#059669;">2,745,000</td>
            <td class="text-right num" style="color:#059669;">+195,000</td>
            <td class="text-right num">107.6%</td>
          </tr>
          <tr>
            <td><strong>Operating Expenditures (OpEx Overheads)</strong></td>
            <td class="text-right num">(900,000)</td>
            <td class="text-right num">(922,500)</td>
            <td class="text-right num" style="color:#dc2626;">-22,500</td>
            <td class="text-right num">102.5%</td>
          </tr>
          <tr class="total-row">
            <td><strong>NET OPERATING SURPLUS / EBITDA</strong></td>
            <td class="text-right num">1,650,000</td>
            <td class="text-right num" style="color:#0369a1;">1,822,500</td>
            <td class="text-right num" style="color:#059669;">+172,500</td>
            <td class="text-right num">110.5%</td>
          </tr>
        </tbody>
      </table>

      <!-- Section 2: Statement of Financial Performance (P&L Ledger) -->
      <div class="section-h">2. Statement of Outpatient Financial Performance (P&L)</div>
      <table class="pnl-ledger">
        <tbody>
          <tr class="pnl-hdr">
            <td>Account Classification & Line Item</td>
            <td style="width:120px;">Ref Code</td>
            <td class="text-right" style="width:180px;">Amount (LKR)</td>
          </tr>
          <tr class="sub-head"><td colspan="3">Operating Revenue Streams</td></tr>
          <tr>
            <td>Specialist Outpatient Consultation Gross Billings (1,420 encounters)</td>
            <td class="num">REV-4010</td>
            <td class="text-right num">4,970,000</td>
          </tr>
          <tr>
            <td>Clinical Laboratory & Diagnostics Services</td>
            <td class="num">REV-4020</td>
            <td class="text-right num">940,000</td>
          </tr>
          <tr>
            <td>Outpatient Pharmacy Dispensing & Nursing Dressings</td>
            <td class="num">REV-4030</td>
            <td class="text-right num">570,000</td>
          </tr>
          <tr class="sub-total">
            <td><strong>Gross Outpatient Revenue</strong></td>
            <td>SUB-100</td>
            <td class="text-right num"><strong>6,480,000</strong></td>
          </tr>
          <tr class="sub-head"><td colspan="3">Revenue Deductions & Reversals</td></tr>
          <tr>
            <td>Commercial Client Discounts & Loyalty Concessions</td>
            <td class="num">DED-5010</td>
            <td class="text-right num" style="color:#dc2626;">(145,000)</td>
          </tr>
          <tr>
            <td>Authorized Appointment Cancellations & Reversals</td>
            <td class="num">DED-5020</td>
            <td class="text-right num" style="color:#dc2626;">(42,500)</td>
          </tr>
          <tr class="sub-total">
            <td><strong>Net Operating Revenue</strong></td>
            <td>SUB-200</td>
            <td class="text-right num"><strong>6,292,500</strong></td>
          </tr>
          <tr class="sub-head"><td colspan="3">Direct Professional Clinical Retainers</td></tr>
          <tr>
            <td>Visiting Specialist Doctor Payout Disbursements</td>
            <td class="num">COS-6010</td>
            <td class="text-right num" style="color:#dc2626;">(3,547,500)</td>
          </tr>
          <tr class="sub-total" style="background:#f1f5f9;">
            <td><strong>Hospital Charges & Facility Gross Margin</strong></td>
            <td>SUB-300</td>
            <td class="text-right num" style="color:#059669;"><strong>2,745,000</strong></td>
          </tr>
          <tr class="sub-head"><td colspan="3">Operating & Administrative Expenses (OpEx)</td></tr>
          <tr>
            <td>Diagnostic Reagents & Medical Consumables</td>
            <td class="num">EXP-7010</td>
            <td class="text-right num">(280,000)</td>
          </tr>
          <tr>
            <td>Facility Electricity, Water & Standby Generator Power</td>
            <td class="num">EXP-7020</td>
            <td class="text-right num">(195,000)</td>
          </tr>
          <tr>
            <td>Nursing Support Staff & Registration Desk Salaries</td>
            <td class="num">EXP-7030</td>
            <td class="text-right num">(340,000)</td>
          </tr>
          <tr>
            <td>Hospital Information System Cloud Hosting, SMS & IT Maintenance</td>
            <td class="num">EXP-7040</td>
            <td class="text-right num">(107,500)</td>
          </tr>
          <tr class="sub-total">
            <td><strong>Total Operating Expenses</strong></td>
            <td>SUB-400</td>
            <td class="text-right num" style="color:#dc2626;"><strong>(922,500)</strong></td>
          </tr>
          <tr class="grand-total">
            <td><strong>NET OPERATING SURPLUS / PROFIT (EBITDA)</strong></td>
            <td>FINAL</td>
            <td class="text-right num"><strong>LKR 1,822,500</strong></td>
          </tr>
        </tbody>
      </table>

      <!-- Section 3: Consultant Types & Hospital Charge Breakdown -->
      <div class="section-h">3. Consultant Types & Hospital Charge Schedule</div>
      <table class="formal-table">
        <thead>
          <tr>
            <th>Consultant Type</th>
            <th class="text-right">Specialists</th>
            <th class="text-right">Consultations</th>
            <th class="text-right">Gross Billing (LKR)</th>
            <th class="text-right">Doctor Share (LKR)</th>
            <th class="text-right">Hospital Charge (LKR)</th>
            <th class="text-right">Retention %</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cardiology</td>
            <td class="text-right num">3</td>
            <td class="text-right num">340</td>
            <td class="text-right num">1,360,000</td>
            <td class="text-right num">952,000</td>
            <td class="text-right num">408,000</td>
            <td class="text-right num">30.0%</td>
          </tr>
          <tr>
            <td>Pediatrics</td>
            <td class="text-right num">2</td>
            <td class="text-right num">295</td>
            <td class="text-right num">885,000</td>
            <td class="text-right num">531,000</td>
            <td class="text-right num">354,000</td>
            <td class="text-right num">40.0%</td>
          </tr>
          <tr>
            <td>General Medicine</td>
            <td class="text-right num">4</td>
            <td class="text-right num">380</td>
            <td class="text-right num">950,000</td>
            <td class="text-right num">570,000</td>
            <td class="text-right num">380,000</td>
            <td class="text-right num">40.0%</td>
          </tr>
          <tr>
            <td>Orthopedics</td>
            <td class="text-right num">2</td>
            <td class="text-right num">185</td>
            <td class="text-right num">740,000</td>
            <td class="text-right num">518,000</td>
            <td class="text-right num">222,000</td>
            <td class="text-right num">30.0%</td>
          </tr>
          <tr>
            <td>Dermatology</td>
            <td class="text-right num">2</td>
            <td class="text-right num">130</td>
            <td class="text-right num">585,000</td>
            <td class="text-right num">351,000</td>
            <td class="text-right num">234,000</td>
            <td class="text-right num">40.0%</td>
          </tr>
          <tr>
            <td>Obstetrics & Gynaecology</td>
            <td class="text-right num">2</td>
            <td class="text-right num">90</td>
            <td class="text-right num">450,000</td>
            <td class="text-right num">303,000</td>
            <td class="text-right num">147,000</td>
            <td class="text-right num">32.7%</td>
          </tr>
          <tr class="total-row">
            <td><strong>TOTAL CONSULTATIONS</strong></td>
            <td class="text-right num"><strong>15</strong></td>
            <td class="text-right num"><strong>1,420</strong></td>
            <td class="text-right num"><strong>4,970,000</strong></td>
            <td class="text-right num"><strong>3,225,000</strong></td>
            <td class="text-right num"><strong>1,745,000</strong></td>
            <td class="text-right num"><strong>35.1%</strong></td>
          </tr>
        </tbody>
      </table>

      <!-- Section 4: Instrument Collections & Operational Statistics -->
      <div class="two-col">
        <div>
          <div class="section-h" style="margin-top:0;">4. Instrument Reconciliation</div>
          <table class="formal-table">
            <thead>
              <tr>
                <th>Payment Mode</th>
                <th class="text-right">Receipts</th>
                <th class="text-right">Amount (LKR)</th>
                <th class="text-right">% Share</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cash Counter Desk</td>
                <td class="text-right num">840</td>
                <td class="text-right num">2,985,000</td>
                <td class="text-right num">48.2%</td>
              </tr>
              <tr>
                <td>POS Debit / Credit Cards</td>
                <td class="text-right num">510</td>
                <td class="text-right num">2,415,500</td>
                <td class="text-right num">39.0%</td>
              </tr>
              <tr>
                <td>Direct Bank Transfer</td>
                <td class="text-right num">82</td>
                <td class="text-right num">492,000</td>
                <td class="text-right num">7.9%</td>
              </tr>
              <tr>
                <td>Corporate & Insurance TPA</td>
                <td class="text-right num">45</td>
                <td class="text-right num">300,000</td>
                <td class="text-right num">4.8%</td>
              </tr>
              <tr class="total-row">
                <td><strong>Total Collections</strong></td>
                <td class="text-right num"><strong>1,477</strong></td>
                <td class="text-right num"><strong>6,192,500</strong></td>
                <td class="text-right num"><strong>100.0%</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <div class="section-h" style="margin-top:0;">5. Operational Indicators</div>
          <table class="formal-table">
            <tbody>
              <tr>
                <td><strong>Average Revenue per Patient</strong></td>
                <td class="text-right num">LKR 4,563</td>
              </tr>
              <tr>
                <td><strong>Daily Outpatient Encounter Volume</strong></td>
                <td class="text-right num">47.3 patients / day</td>
              </tr>
              <tr>
                <td><strong>Specialist Clinical Sessions Held</strong></td>
                <td class="text-right num">118 sessions</td>
              </tr>
              <tr>
                <td><strong>Outstanding Patient Receivables</strong></td>
                <td class="text-right num" style="color:#d97706;">LKR 100,000 (1.5%)</td>
              </tr>
              <tr>
                <td><strong>Collection Efficiency Ratio</strong></td>
                <td class="text-right num" style="color:#059669;">95.6%</td>
              </tr>
              <tr>
                <td><strong>Hospital Facility Location</strong></td>
                <td class="text-right" style="font-weight:600;">Thissamaharama Centre</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Formal Audit Note -->
      <div class="audit-notes">
        <strong>Statutory Compliance & Audit Note:</strong> This formal report has been compiled in accordance with standard outpatient medical accounting practices. Gross revenue reflects completed clinical encounters at Olympus Lanka Hospital, Thissamaharama. Doctor retainers and facility Hospital Charges have been calculated in strict accordance with practitioner agreements.
      </div>

      <!-- Formal Document Footer Note -->
      <div style="margin-top:28px; padding-top:14px; border-top:1px solid #cbd5e1; display:flex; justify-content:space-between; font-size:10.5px; color:#64748b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div>Olympus Lanka Hospital (Pvt) Ltd · Outpatient Information & Financial System</div>
        <div>Thissamaharama Centre · System Generated · Official Record</div>
      </div>
    </div>
  `;
}

// 2. DAILY REPORT HTML CONTENT
function renderDailyReport(embeddedLogo) {
  return `
    <div class="report-page" id="daily-view">
      <!-- Formal Document Header -->
      <div class="doc-header">
        <div class="brand-group">
          <div class="logo-box">
            <img src="${embeddedLogo}" alt="Olympus Lanka Hospital" onerror="this.src='/logo.png'" />
          </div>
          <div>
            <div class="corp-name">Olympus Lanka Hospital (Pvt) Ltd</div>
            <div class="corp-branch">Outpatient & Specialist Care Centre · Thissamaharama</div>
            <div class="corp-address">
              Hospital Road, Thissamaharama, Southern Province, Sri Lanka<br />
              Tel: +94 47 223 9800 · Email: finance@olympuslanka.lk · Web: www.olympuslanka.lk<br />
              MOH Reg: MOH/SP/HAM/2024/782 · Company Reg: PV 00294819
            </div>
          </div>
        </div>
        <div class="doc-meta">
          <div class="doc-classification">OFFICIAL · DAILY CLOSE</div>
          <div class="doc-title">Daily Financial Report</div>
          <div class="doc-ref">DOC NO: OLH-DFR-2026-10-10</div>
          <div class="doc-date">Reporting Date: 10 October 2026 (Day Close)</div>
          <div class="doc-date">Shift / Batch: Day Shift (08:00 – 21:00) | Currency: LKR</div>
        </div>
      </div>

      <!-- Formal Transmittal Memo Grid -->
      <div class="memo-grid">
        <div class="memo-item">
          <span>Operating Facility</span>
          <strong>Thissamaharama Registration Desk</strong>
        </div>
        <div class="memo-item">
          <span>Day Sessions Held</span>
          <strong>6 Clinical Specialist Sessions</strong>
        </div>
        <div class="memo-item">
          <span>Patient Encounters</span>
          <strong>54 Completed Consultations</strong>
        </div>
        <div class="memo-item">
          <span>Cashier Desk Close</span>
          <strong>Reconciled & Shift Verified</strong>
        </div>
      </div>

      <!-- Section 1: Day Revenue & Collections Breakdown -->
      <div class="section-h">1. Daily Revenue & Hospital Charge Summary</div>
      <table class="formal-table">
        <thead>
          <tr>
            <th>Revenue Category</th>
            <th class="text-right">Encounters / Units</th>
            <th class="text-right">Gross Billed (LKR)</th>
            <th class="text-right">Doctor Share (LKR)</th>
            <th class="text-right">Hospital Charge (LKR)</th>
            <th class="text-right">Cash Collected (LKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Cardiology Clinic</strong></td>
            <td class="text-right num">14</td>
            <td class="text-right num">56,000</td>
            <td class="text-right num">39,200</td>
            <td class="text-right num">16,800</td>
            <td class="text-right num">56,000</td>
          </tr>
          <tr>
            <td><strong>Pediatrics Clinic</strong></td>
            <td class="text-right num">12</td>
            <td class="text-right num">36,000</td>
            <td class="text-right num">21,600</td>
            <td class="text-right num">14,400</td>
            <td class="text-right num">36,000</td>
          </tr>
          <tr>
            <td><strong>General Medicine</strong></td>
            <td class="text-right num">16</td>
            <td class="text-right num">40,000</td>
            <td class="text-right num">24,000</td>
            <td class="text-right num">16,000</td>
            <td class="text-right num">38,000</td>
          </tr>
          <tr>
            <td><strong>Orthopedics Clinic</strong></td>
            <td class="text-right num">8</td>
            <td class="text-right num">32,000</td>
            <td class="text-right num">22,400</td>
            <td class="text-right num">9,600</td>
            <td class="text-right num">32,000</td>
          </tr>
          <tr>
            <td><strong>Dermatology Clinic</strong></td>
            <td class="text-right num">4</td>
            <td class="text-right num">18,000</td>
            <td class="text-right num">10,800</td>
            <td class="text-right num">7,200</td>
            <td class="text-right num">18,000</td>
          </tr>
          <tr>
            <td><strong>Diagnostic Lab & Pharmacy Services</strong></td>
            <td class="text-right num">28</td>
            <td class="text-right num">48,500</td>
            <td class="text-right num">0</td>
            <td class="text-right num">48,500</td>
            <td class="text-right num">47,000</td>
          </tr>
          <tr class="total-row">
            <td><strong>DAY TOTAL (10 OCT 2026)</strong></td>
            <td class="text-right num"><strong>82 Items</strong></td>
            <td class="text-right num"><strong>LKR 230,500</strong></td>
            <td class="text-right num"><strong>LKR 118,000</strong></td>
            <td class="text-right num"><strong>LKR 112,500</strong></td>
            <td class="text-right num"><strong>LKR 227,000</strong></td>
          </tr>
        </tbody>
      </table>

      <!-- Section 2: Daily Cash Desk Reconciliation -->
      <div class="two-col">
        <div>
          <div class="section-h">2. Cash Drawer & Terminal Close</div>
          <table class="formal-table">
            <thead>
              <tr>
                <th>Instrument</th>
                <th class="text-right">Transactions</th>
                <th class="text-right">Collected (LKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cash Currency (Drawer)</td>
                <td class="text-right num">34</td>
                <td class="text-right num">114,000</td>
              </tr>
              <tr>
                <td>POS Terminal #1 (Commercial Bank)</td>
                <td class="text-right num">12</td>
                <td class="text-right num">58,000</td>
              </tr>
              <tr>
                <td>POS Terminal #2 (HNB)</td>
                <td class="text-right num">6</td>
                <td class="text-right num">35,000</td>
              </tr>
              <tr>
                <td>Online Transfer (Bank Slip Verified)</td>
                <td class="text-right num">2</td>
                <td class="text-right num">20,000</td>
              </tr>
              <tr class="total-row">
                <td><strong>Total Shift Collections</strong></td>
                <td class="text-right num"><strong>54</strong></td>
                <td class="text-right num"><strong>LKR 227,000</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div class="section-h">3. Day Cash Flow & Banking</div>
          <table class="formal-table">
            <tbody>
              <tr>
                <td><strong>Opening Petty Cash Drawer</strong></td>
                <td class="text-right num">LKR 10,000</td>
              </tr>
              <tr>
                <td><strong>Add: Day Cash Collections</strong></td>
                <td class="text-right num">+LKR 114,000</td>
              </tr>
              <tr>
                <td><strong>Less: Shift Petty Expenses (Supplies)</strong></td>
                <td class="text-right num" style="color:#dc2626;">-LKR 4,200</td>
              </tr>
              <tr>
                <td><strong>Net Cash in Hand for Bank Deposit</strong></td>
                <td class="text-right num" style="color:#059669; font-weight:700;">LKR 119,800</td>
              </tr>
              <tr>
                <td><strong>Card & Digital Settled Direct to Bank</strong></td>
                <td class="text-right num">LKR 113,000</td>
              </tr>
              <tr class="total-row">
                <td><strong>DAY TOTAL NET ACCRUAL</strong></td>
                <td class="text-right num"><strong>LKR 228,600</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 3: Daily Session Schedule Details -->
      <div class="section-h">4. Registered Specialist Sessions Held Today (Thissamaharama)</div>
      <table class="formal-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Doctor Name</th>
            <th>Consultant Type</th>
            <th class="text-right">Consultation Fee</th>
            <th class="text-right">Hospital Charge</th>
            <th class="text-right">Patients Seen</th>
            <th class="text-right">Session Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>09:00 – 11:30</td>
            <td>Dr. K. L. Perera</td>
            <td>Cardiology</td>
            <td class="text-right num">LKR 4,000</td>
            <td class="text-right num">LKR 1,200 (30%)</td>
            <td class="text-right num">14</td>
            <td class="text-right num">LKR 56,000</td>
          </tr>
          <tr>
            <td>10:00 – 12:00</td>
            <td>Dr. S. M. Fernando</td>
            <td>Pediatrics</td>
            <td class="text-right num">LKR 3,000</td>
            <td class="text-right num">LKR 1,200 (40%)</td>
            <td class="text-right num">12</td>
            <td class="text-right num">LKR 36,000</td>
          </tr>
          <tr>
            <td>14:00 – 16:30</td>
            <td>Dr. P. R. Gunasekara</td>
            <td>General Medicine</td>
            <td class="text-right num">LKR 2,500</td>
            <td class="text-right num">LKR 1,000 (40%)</td>
            <td class="text-right num">16</td>
            <td class="text-right num">LKR 40,000</td>
          </tr>
          <tr>
            <td>16:30 – 18:30</td>
            <td>Dr. A. B. Jayasinghe</td>
            <td>Orthopedics</td>
            <td class="text-right num">LKR 4,000</td>
            <td class="text-right num">LKR 1,200 (30%)</td>
            <td class="text-right num">8</td>
            <td class="text-right num">LKR 32,000</td>
          </tr>
          <tr>
            <td>18:30 – 20:30</td>
            <td>Dr. M. T. De Silva</td>
            <td>Dermatology</td>
            <td class="text-right num">LKR 4,500</td>
            <td class="text-right num">LKR 1,800 (40%)</td>
            <td class="text-right num">4</td>
            <td class="text-right num">LKR 18,000</td>
          </tr>
        </tbody>
      </table>

      <!-- Formal Document Footer Note -->
      <div style="margin-top:28px; padding-top:14px; border-top:1px solid #cbd5e1; display:flex; justify-content:space-between; font-size:10.5px; color:#64748b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div>Olympus Lanka Hospital (Pvt) Ltd · Outpatient Information & Financial System</div>
        <div>Thissamaharama Centre · System Generated · Shift Close Verified</div>
      </div>
    </div>
  `;
}

// Generate the unified interactive formal report template HTML
const combinedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Olympus Lanka Hospital (Thissamaharama) — Formal Financial Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${formalStyles}
  </style>
  <script>
    function setReportType(type) {
      const monthly = document.getElementById('monthly-view');
      const daily = document.getElementById('daily-view');
      const btnMonthly = document.getElementById('btn-tab-monthly');
      const btnDaily = document.getElementById('btn-tab-daily');
      const downloadLink = document.getElementById('btn-download-pdf');

      if (type === 'daily') {
        monthly.style.display = 'none';
        daily.style.display = 'block';
        btnDaily.classList.add('active');
        btnMonthly.classList.remove('active');
        downloadLink.href = 'Olympus-Lanka-Daily-Financial-Report.pdf';
        downloadLink.download = 'Olympus-Lanka-Daily-Financial-Report.pdf';
        document.title = 'Olympus Lanka Hospital (Thissamaharama) — Daily Financial Report';
      } else {
        monthly.style.display = 'block';
        daily.style.display = 'none';
        btnMonthly.classList.add('active');
        btnDaily.classList.remove('active');
        downloadLink.href = 'Olympus-Lanka-Monthly-Financial-Report.pdf';
        downloadLink.download = 'Olympus-Lanka-Monthly-Financial-Report.pdf';
        document.title = 'Olympus Lanka Hospital (Thissamaharama) — Monthly Financial Statement';
      }
    }
  </script>
</head>
<body>

  <!-- Formal Action Toolbar (Hidden upon Print) -->
  <div class="action-nav">
    <div style="display:flex; align-items:center; gap:12px;">
      <span style="font-size:12px; font-weight:800; color:#0a1f3a; letter-spacing:0.04em;">REPORT TYPE:</span>
      <button id="btn-tab-monthly" class="tab-pill active" onclick="setReportType('monthly')">
        Monthly Financial Statement (P&L)
      </button>
      <button id="btn-tab-daily" class="tab-pill" onclick="setReportType('daily')">
        Daily Financial Report (Cash Desk)
      </button>
    </div>
    <div class="btn-group">
      <button class="btn btn-outline" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print / Save A4 PDF
      </button>
      <a id="btn-download-pdf" class="btn btn-primary" href="Olympus-Lanka-Monthly-Financial-Report.pdf" download="Olympus-Lanka-Monthly-Financial-Report.pdf">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download PDF
      </a>
    </div>
  </div>

  ${renderMonthlyReport(logoB64)}
  <div style="display:none;" id="daily-container">${renderDailyReport(logoB64)}</div>

  <script>
    // Move daily report into view structure
    const dailyHtml = document.getElementById('daily-container').innerHTML;
    document.getElementById('daily-container').remove();
    document.body.insertAdjacentHTML('beforeend', dailyHtml);
    document.getElementById('daily-view').style.display = 'none';
  </script>
</body>
</html>
`;

// Separate standalone templates for headless printing
const monthlyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Olympus Lanka Hospital — Monthly Financial Statement</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${formalStyles}</style>
</head>
<body>
  ${renderMonthlyReport(logoB64)}
</body>
</html>`;

const dailyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Olympus Lanka Hospital — Daily Financial Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${formalStyles}</style>
</head>
<body>
  ${renderDailyReport(logoB64)}
</body>
</html>`;

// Write to public/ and root
fs.writeFileSync(path.join(publicDir, 'financial-report-template.html'), combinedHtml);
fs.writeFileSync(path.resolve('..', 'financial-report-template.html'), combinedHtml);

fs.writeFileSync(path.join(publicDir, 'monthly-financial-report.html'), monthlyHtml);
fs.writeFileSync(path.resolve('..', 'monthly-financial-report.html'), monthlyHtml);

fs.writeFileSync(path.join(publicDir, 'daily-financial-report.html'), dailyHtml);
fs.writeFileSync(path.resolve('..', 'daily-financial-report.html'), dailyHtml);

console.log('Successfully built formal report templates for Daily and Monthly reports.');

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SecurityValidationFinding, SecurityValidationSummary } from '../types';

export interface GeneratePdfOptions {
  summary: SecurityValidationSummary;
  findings: SecurityValidationFinding[];
  targetUrl: string;
}

/**
 * Deterministically calculates overall risk score (0-100) and risk tier
 * based strictly on verified findings.
 */
export function calculateRiskAssessment(findings: SecurityValidationFinding[]): {
  tier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  score: number;
  label: string;
  methodology: string;
} {
  const critical = findings.filter((f) => f.severity === 'CRITICAL').length;
  const high = findings.filter((f) => f.severity === 'HIGH').length;
  const medium = findings.filter((f) => f.severity === 'MEDIUM').length;
  const low = findings.filter((f) => f.severity === 'LOW').length;

  // Standard CVSS/DREAD deterministic risk weight formulation:
  // Critical = 25 pts, High = 15 pts, Medium = 8 pts, Low = 3 pts
  const rawScore = critical * 25 + high * 15 + medium * 8 + low * 3;
  const score = Math.min(100, Math.max(0, rawScore));

  let tier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  if (critical > 0 || score >= 75) {
    tier = 'CRITICAL';
  } else if (high > 0 || score >= 50) {
    tier = 'HIGH';
  } else if (medium > 0 || score >= 25) {
    tier = 'MEDIUM';
  } else if (low > 0 || score > 0) {
    tier = 'LOW';
  } else {
    tier = 'INFORMATIONAL';
  }

  const methodology =
    'Deterministic score calculated strictly from scanner findings using CVSS/DREAD severity weights: Critical (25 pts), High (15 pts), Medium (8 pts), Low (3 pts), capped at 100. No synthetic penalties applied.';

  return {
    tier,
    score,
    label: `${tier} (Risk Score: ${score}/100)`,
    methodology,
  };
}

/**
 * Generates a complete, structured cybersecurity assessment PDF report
 * using vector primitives and auto-paginated tables.
 */
export async function generateSecurityReportPdf(options: GeneratePdfOptions): Promise<void> {
  const { summary, findings, targetUrl } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  const risk = calculateRiskAssessment(findings);

  const formattedDate = summary.timestamp
    ? new Date(summary.timestamp).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'medium',
        timeZone: 'UTC',
      }) + ' UTC'
    : new Date().toLocaleString('en-US') + ' UTC';

  // Palette constants (clean, professional cyber-security aesthetic)
  const colors = {
    dark: [15, 23, 42] as [number, number, number], // #0f172a
    slate: [51, 65, 85] as [number, number, number], // #334155
    muted: [100, 116, 139] as [number, number, number], // #64748b
    lightBorder: [226, 232, 240] as [number, number, number], // #e2e8f0
    bgCard: [248, 250, 252] as [number, number, number], // #f8fafc
    critical: [225, 29, 72] as [number, number, number], // #e11d48
    high: [217, 119, 6] as [number, number, number], // #d97706
    medium: [202, 138, 4] as [number, number, number], // #ca8a04
    low: [37, 99, 235] as [number, number, number], // #2563eb
    info: [100, 116, 139] as [number, number, number],
  };

  // Helper for rendering header banner on inner pages
  const drawPageHeader = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text('CODELENS — SECURITY VALIDATION REPORT', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.text(targetUrl, pageWidth - margin, 12, { align: 'right' });

    doc.setDrawColor(colors.lightBorder[0], colors.lightBorder[1], colors.lightBorder[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, 14, pageWidth - margin, 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.text(title, margin, 23);
  };

  // ==========================================
  // PAGE 1 — COVER PAGE
  // ==========================================
  // Brand Top Bar
  doc.setFillColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  doc.rect(0, 0, pageWidth, 7, 'F');

  // Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
  doc.text('CODELENS APPLICATION SECURITY', margin, 28);

  // Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  doc.text('SECURITY VALIDATION', margin, 42);
  doc.text('ASSESSMENT REPORT', margin, 53);

  // Divider
  doc.setDrawColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  doc.setLineWidth(1.2);
  doc.line(margin, 60, margin + 45, 60);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(colors.slate[0], colors.slate[1], colors.slate[2]);
  doc.text(
    'Comprehensive Dynamic Application Security Testing (DAST) & Endpoint Vulnerability Audit',
    margin,
    69
  );

  // Metadata Card Box
  const cardY = 82;
  const cardHeight = 110;
  doc.setFillColor(colors.bgCard[0], colors.bgCard[1], colors.bgCard[2]);
  doc.setDrawColor(colors.lightBorder[0], colors.lightBorder[1], colors.lightBorder[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, cardY, contentWidth, cardHeight, 3, 3, 'FD');

  const metaRows = [
    { label: 'Target Endpoint', value: targetUrl },
    { label: 'Assessment Date', value: formattedDate },
    { label: 'Assessment Status', value: 'Completed — Fully Analyzed' },
    { label: 'Overall Risk Rating', value: risk.label },
    { label: 'Total Vulnerabilities', value: `${findings.length} detected` },
    { label: 'URLs Crawled & Validated', value: `${summary.urlsCrawled || 1} endpoints` },
    { label: 'Audit Duration', value: `${(summary.durationMs / 1000).toFixed(2)} seconds` },
    { label: 'Security Validation Engine', value: 'Security Validation' },
    { label: 'Classification', value: 'Confidential — Technical Security Audit' },
  ];

  let currentMetaY = cardY + 12;
  metaRows.forEach((row) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(colors.slate[0], colors.slate[1], colors.slate[2]);
    doc.text(row.label, margin + 8, currentMetaY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);

    if (row.label === 'Overall Risk Rating') {
      if (risk.tier === 'CRITICAL') {
        doc.setTextColor(colors.critical[0], colors.critical[1], colors.critical[2]);
        doc.setFont('helvetica', 'bold');
      } else if (risk.tier === 'HIGH') {
        doc.setTextColor(colors.high[0], colors.high[1], colors.high[2]);
        doc.setFont('helvetica', 'bold');
      } else if (risk.tier === 'MEDIUM') {
        doc.setTextColor(colors.medium[0], colors.medium[1], colors.medium[2]);
        doc.setFont('helvetica', 'bold');
      }
    }

    // Wrap long values (like long URLs)
    const splitVal = doc.splitTextToSize(row.value, contentWidth - 75);
    doc.text(splitVal, margin + 65, currentMetaY);

    currentMetaY += Math.max(9, splitVal.length * 4.5);
  });

  // Notice at bottom of cover
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
  const coverNotice =
    'Notice: This assessment reflects the runtime security state of the inspected endpoints at the time of execution. Results are derived exclusively from authorized automated security validation probes and response inspection.';
  const wrappedNotice = doc.splitTextToSize(coverNotice, contentWidth);
  doc.text(wrappedNotice, margin, pageHeight - 32);

  // ==========================================
  // PAGE 2 — EXECUTIVE SUMMARY
  // ==========================================
  doc.addPage();
  drawPageHeader('Executive Summary');

  let curY = 32;

  // Executive paragraph
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);

  const critCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const medCount = findings.filter((f) => f.severity === 'MEDIUM').length;
  const lowCount = findings.filter((f) => f.severity === 'LOW').length;
  const infoCount = findings.filter((f) => f.severity === 'INFO').length;

  const findingTypes = Array.from(new Set(findings.map((f) => f.type))).slice(0, 4).join(', ');

  const execSummaryText =
    `An authorized security validation audit was performed against ${targetUrl}. The assessment executed automated defensive testing modules to evaluate exposed headers, transport encryption, injection parameters, and access controls.\n\n` +
    `The audit concluded with ${findings.length} total findings across ${summary.urlsCrawled || 1} audited URL(s). Findings comprise ${critCount} Critical, ${highCount} High, ${medCount} Medium, ${lowCount} Low, and ${infoCount} Informational severity issues. Key vulnerability categories identified include: ${findingTypes || 'None'}.\n\n` +
    `Overall Security Posture: ${risk.label}. ${
      risk.tier === 'CRITICAL' || risk.tier === 'HIGH'
        ? 'Remediation must be prioritized to mitigate high-impact exposures before production deployment.'
        : 'The application demonstrates baseline defenses with opportunities for defensive configuration hardening.'
    }`;

  const wrappedExec = doc.splitTextToSize(execSummaryText, contentWidth);
  doc.text(wrappedExec, margin, curY);
  curY += wrappedExec.length * 4.8 + 6;

  // Severity Breakdown Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  doc.text('Vulnerability Severity Breakdown', margin, curY);
  curY += 4;

  autoTable(doc, {
    startY: curY,
    head: [['Severity Level', 'Count', 'Risk Characterization', 'Action Priority']],
    body: [
      ['CRITICAL', critCount.toString(), 'Critical exploitability or remote compromise exposure', 'Immediate (0-24 Hours)'],
      ['HIGH', highCount.toString(), 'Severe vulnerability or sensitive data exposure', 'High Priority (1-3 Days)'],
      ['MEDIUM', medCount.toString(), 'Security misconfiguration or defense-in-depth gap', 'Scheduled Sprint (1-2 Weeks)'],
      ['LOW', lowCount.toString(), 'Missing security hygiene headers or minor exposures', 'Standard Maintenance'],
      ['INFO', infoCount.toString(), 'Informational observation / environment telemetry', 'Review as Needed'],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: colors.dark,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: colors.dark,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 80 },
      3: { cellWidth: 42 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        if (data.cell.raw === 'CRITICAL') data.cell.styles.textColor = colors.critical;
        else if (data.cell.raw === 'HIGH') data.cell.styles.textColor = colors.high;
        else if (data.cell.raw === 'MEDIUM') data.cell.styles.textColor = colors.medium;
        else if (data.cell.raw === 'LOW') data.cell.styles.textColor = colors.low;
      }
    },
    margin: { left: margin, right: margin },
  });

  const lastTableEnd = (doc as any).lastAutoTable?.finalY || curY + 45;
  curY = lastTableEnd + 8;

  // Deterministic Scoring Methodology Box
  doc.setFillColor(colors.bgCard[0], colors.bgCard[1], colors.bgCard[2]);
  doc.setDrawColor(colors.lightBorder[0], colors.lightBorder[1], colors.lightBorder[2]);
  doc.roundedRect(margin, curY, contentWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  doc.text('Deterministic Risk Scoring Methodology', margin + 5, curY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(colors.slate[0], colors.slate[1], colors.slate[2]);
  const methodText = doc.splitTextToSize(risk.methodology, contentWidth - 10);
  doc.text(methodText, margin + 5, curY + 13);

  // ==========================================
  // PAGE 3 — SECURITY FINDINGS OVERVIEW TABLE
  // ==========================================
  doc.addPage();
  drawPageHeader('Security Findings Overview');

  const overviewRows = findings.map((f, i) => [
    f.severity,
    f.type,
    f.url,
    f.evidence ? (f.evidence.length > 55 ? f.evidence.substring(0, 52) + '...' : f.evidence) : 'Detected',
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['Severity', 'Finding Title / Type', 'Affected Endpoint', 'Evidence / Status']],
    body: overviewRows.length > 0 ? overviewRows : [['NONE', 'No vulnerabilities detected', targetUrl, 'Passed']],
    theme: 'striped',
    headStyles: {
      fillColor: colors.dark,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: colors.dark,
    },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 50 },
      2: { cellWidth: 52 },
      3: { cellWidth: 48, font: 'courier' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        if (data.cell.raw === 'CRITICAL') data.cell.styles.textColor = colors.critical;
        else if (data.cell.raw === 'HIGH') data.cell.styles.textColor = colors.high;
        else if (data.cell.raw === 'MEDIUM') data.cell.styles.textColor = colors.medium;
        else if (data.cell.raw === 'LOW') data.cell.styles.textColor = colors.low;
      }
    },
    margin: { left: margin, right: margin },
  });

  // ==========================================
  // DETAILED FINDINGS (EVERY FINDING INCLUDED)
  // ==========================================
  doc.addPage();
  drawPageHeader('Detailed Security Findings');
  let detailY = 32;

  findings.forEach((finding, idx) => {
    // Check if we need a page break before starting this finding
    if (detailY > pageHeight - 75) {
      doc.addPage();
      drawPageHeader('Detailed Security Findings (Cont.)');
      detailY = 32;
    }

    // Finding Card Header
    doc.setFillColor(colors.bgCard[0], colors.bgCard[1], colors.bgCard[2]);
    doc.setDrawColor(colors.lightBorder[0], colors.lightBorder[1], colors.lightBorder[2]);
    doc.setLineWidth(0.3);

    // Estimate box height
    const startBoxY = detailY;
    doc.roundedRect(margin, startBoxY, contentWidth, 8, 1.5, 1.5, 'FD');

    // Severity pill
    let sevColor = colors.low;
    if (finding.severity === 'CRITICAL') sevColor = colors.critical;
    else if (finding.severity === 'HIGH') sevColor = colors.high;
    else if (finding.severity === 'MEDIUM') sevColor = colors.medium;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
    doc.text(`[${finding.severity}]`, margin + 4, startBoxY + 5.5);

    // Finding Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.text(`${idx + 1}. ${finding.type}`, margin + 26, startBoxY + 5.5);

    // Rule ID / Fingerprint
    const checkId = finding.fingerprint ? `ID: ${finding.fingerprint.substring(0, 12)}` : `Rule: ${finding.id}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(checkId, pageWidth - margin - 4, startBoxY + 5.5, { align: 'right' });

    detailY = startBoxY + 12;

    // Attributes Table / Key Values
    const attributes = [
      ['Affected Endpoint:', finding.url],
      ['HTTP Method & Param:', `${finding.url.startsWith('https') ? 'HTTPS' : 'HTTP'} · Param: ${finding.parameter || 'None (Header/Host)'}`],
      ['Finding Status:', 'Open / Unresolved · Detected via Automated DAST Probe'],
      ['Scanner Provenance:', 'Security Validation Engine (DAST Audit)'],
      ['Description:', finding.description],
      ['Potential Impact:', `Compromises ${finding.severity.toLowerCase()} security controls; permits unauthorized framing, sniffing, or exposure.`],
      ['Recorded Evidence:', finding.evidence || 'Header missing / configuration anomaly detected'],
      ['Recommended Fix:', finding.remediation || 'Apply standard defense-in-depth configuration'],
    ];

    attributes.forEach(([k, v]) => {
      if (detailY > pageHeight - 25) {
        doc.addPage();
        drawPageHeader('Detailed Security Findings (Cont.)');
        detailY = 32;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(colors.slate[0], colors.slate[1], colors.slate[2]);
      doc.text(k, margin + 4, detailY);

      doc.setFont(k === 'Recorded Evidence:' ? 'courier' : 'helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);

      const splitValue = doc.splitTextToSize(v, contentWidth - 45);
      doc.text(splitValue, margin + 42, detailY);

      detailY += Math.max(5, splitValue.length * 3.6);
    });

    // Divider after finding
    detailY += 4;
    doc.setDrawColor(colors.lightBorder[0], colors.lightBorder[1], colors.lightBorder[2]);
    doc.line(margin, detailY, pageWidth - margin, detailY);
    detailY += 6;
  });

  // ==========================================
  // REMEDIATION PRIORITIES SUMMARY
  // ==========================================
  doc.addPage();
  drawPageHeader('Recommended Remediation Priorities');

  let remY = 32;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(colors.slate[0], colors.slate[1], colors.slate[2]);
  const remIntro =
    'Remediation recommendations are grouped below by actual vulnerability severity. Engineering teams should execute fixes starting from Critical and High severity issues to mitigate active exploitation vectors.';
  const wrappedRemIntro = doc.splitTextToSize(remIntro, contentWidth);
  doc.text(wrappedRemIntro, margin, remY);
  remY += wrappedRemIntro.length * 4.5 + 6;

  const severityOrder: Array<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = [
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
  ];

  severityOrder.forEach((sev) => {
    const sevFindings = findings.filter((f) => f.severity === sev);
    if (sevFindings.length === 0) return;

    if (remY > pageHeight - 45) {
      doc.addPage();
      drawPageHeader('Recommended Remediation Priorities (Cont.)');
      remY = 32;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    let hColor = colors.low;
    if (sev === 'CRITICAL') hColor = colors.critical;
    else if (sev === 'HIGH') hColor = colors.high;
    else if (sev === 'MEDIUM') hColor = colors.medium;

    doc.setTextColor(hColor[0], hColor[1], hColor[2]);
    doc.text(`${sev} PRIORITY (${sevFindings.length} Issue${sevFindings.length > 1 ? 's' : ''})`, margin, remY);
    remY += 5;

    sevFindings.forEach((sf) => {
      if (remY > pageHeight - 30) {
        doc.addPage();
        drawPageHeader('Recommended Remediation Priorities (Cont.)');
        remY = 32;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.text(`• ${sf.type} (${sf.url})`, margin + 3, remY);
      remY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(colors.slate[0], colors.slate[1], colors.slate[2]);
      const fixText = doc.splitTextToSize(`Action: ${sf.remediation}`, contentWidth - 10);
      doc.text(fixText, margin + 7, remY);
      remY += fixText.length * 3.8 + 3;
    });

    remY += 3;
  });

  // ==========================================
  // FOOTER (ALL PAGES)
  // ==========================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);

    doc.setDrawColor(colors.lightBorder[0], colors.lightBorder[1], colors.lightBorder[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.text('CodeLens — Security Validation', margin, pageHeight - 9);
    doc.text(`Generated: ${formattedDate}`, pageWidth / 2, pageHeight - 9, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }

  // Sanitize filename
  const cleanTarget = targetUrl.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  const fileName = `CodeLens_Security_Report_${cleanTarget}_${Date.now()}.pdf`;

  doc.save(fileName);
}

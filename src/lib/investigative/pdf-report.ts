/**
 * Investigative Agent PDF Report Generator.
 *
 * Generates a well-formatted PDF report from investigation results including:
 *  - Cover page with executive summary
 *  - Discovered social profiles (with avatars when available)
 *  - Discovered websites
 *  - Digital footprint analysis
 *  - Risk signals
 *  - Recommendations
 *  - Limitations and disclaimer
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProfileCandidate, WebsiteCandidate, FootprintAnalysis } from "./models";

// ── Color palette ─────────────────────────────────────────────────────────────

type RGB = [number, number, number];

const C = {
  primary: [0, 100, 180] as RGB,
  heading: [20, 20, 25] as RGB,
  body: [50, 50, 55] as RGB,
  muted: [120, 120, 130] as RGB,
  white: [255, 255, 255] as RGB,
  red: [200, 40, 40] as RGB,
  yellow: [170, 120, 0] as RGB,
  green: [20, 140, 60] as RGB,
  blue: [40, 90, 200] as RGB,
  sectionBg: [235, 242, 250] as RGB,
  border: [200, 210, 220] as RGB,
  altRow: [245, 248, 252] as RGB,
};

// ── Input type ────────────────────────────────────────────────────────────────

export interface InvestigativeReportData {
  investigationId: string;
  input: {
    fullName: string;
    location?: string;
    employer?: string;
    usernameHints?: string[];
  };
  profiles: ProfileCandidate[];
  websites: WebsiteCandidate[];
  footprintAnalysis: FootprintAnalysis;
  meta: {
    duration: number;
    searchProvider: string;
    generatedAt: string;
    disclaimer: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function confidenceColor(label: "high" | "medium" | "low"): RGB {
  return label === "high" ? C.green : label === "medium" ? C.yellow : C.muted;
}

function severityColor(severity: "high" | "medium" | "low"): RGB {
  return severity === "high" ? C.red : severity === "medium" ? C.yellow : C.green;
}

/** Ensure there is enough vertical space remaining; add new page if not. */
function ensureSpace(doc: jsPDF, y: number, needed: number, margin = 20): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - margin) {
    doc.addPage();
    return margin + 4;
  }
  return y;
}

/** Draw a section header bar and return the new y position. */
function sectionHeader(doc: jsPDF, text: string, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  y = ensureSpace(doc, y, 14);
  doc.setFillColor(...C.primary);
  doc.rect(14, y, pw - 28, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text(text.toUpperCase(), 18, y + 5.5);
  doc.setTextColor(...C.body);
  return y + 14;
}

/** Add a footer to every page. */
function addFooters(doc: jsPDF, totalPages: number): void {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(14, ph - 14, pw - 14, ph - 14);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text("SEPTO Investigative Agent — OSINT Report — For authorized use only", 14, ph - 9);
    doc.text(`Page ${i} / ${totalPages}`, pw - 14, ph - 9, { align: "right" });
  }
}

// ── Section renderers ─────────────────────────────────────────────────────────

/** Cover page */
function renderCover(doc: jsPDF, data: InvestigativeReportData): number {
  const pw = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pw, 50, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.text("INVESTIGATIVE AGENT REPORT", pw / 2, 22, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Open Source Intelligence (OSINT) — Public Web Sources Only", pw / 2, 32, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Subject: ${data.input.fullName}`, pw / 2, 43, { align: "center" });

  let y = 62;

  // Input parameters
  const params: string[][] = [["Full Name", data.input.fullName]];
  if (data.input.location) params.push(["Location", data.input.location]);
  if (data.input.employer) params.push(["Employer", data.input.employer]);
  if (data.input.usernameHints?.length) {
    params.push(["Username Hints", data.input.usernameHints.join(", ")]);
  }
  params.push(
    ["Generated", formatDate(data.meta.generatedAt)],
    ["Duration", `${data.meta.duration}s`],
    ["Search Provider", data.meta.searchProvider],
    ["Investigation ID", data.investigationId],
  );

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Parameter", "Value"]],
    body: params,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, textColor: C.body, lineColor: C.border, lineWidth: 0.2 },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold" },
    alternateRowStyles: { fillColor: C.altRow },
    columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Executive summary
  y = sectionHeader(doc, "Executive Summary", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.body);
  const pw2 = doc.internal.pageSize.getWidth() - 28;
  const summaryLines = doc.splitTextToSize(data.footprintAnalysis.executiveSummary, pw2);
  y = ensureSpace(doc, y, summaryLines.length * 5 + 4);
  doc.text(summaryLines, 14, y);
  y += summaryLines.length * 5 + 6;

  // Disclaimer box
  y = ensureSpace(doc, y, 20);
  doc.setFillColor(...C.sectionBg);
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, y, pw - 28, 18, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.primary);
  doc.text("⚠  DISCLAIMER", 18, y + 6);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.body);
  const disclaimerLines = doc.splitTextToSize(data.meta.disclaimer, pw - 36);
  doc.text(disclaimerLines, 18, y + 12);
  y += 24;

  return y;
}

/** Social profiles table with inline avatars. */
function renderProfiles(doc: jsPDF, profiles: ProfileCandidate[], y: number): number {
  if (profiles.length === 0) {
    y = ensureSpace(doc, y, 12);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text("No social media profiles were discovered for this subject.", 14, y);
    return y + 10;
  }

  const pw = doc.internal.pageSize.getWidth();
  const contentW = pw - 28;

  for (const profile of profiles) {
    y = ensureSpace(doc, y, 36);

    // Row background
    doc.setFillColor(...C.altRow);
    doc.rect(14, y, contentW, 30, "F");
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.rect(14, y, contentW, 30, "S");

    let imgEndX = 14;

    // Avatar image
    if (profile.avatarData) {
      try {
        // Parse MIME type from data URL prefix (e.g. "data:image/png;base64,...")
        const mimeMatch = profile.avatarData.match(/^data:(image\/[a-z+]+);base64,/i);
        const mime = mimeMatch ? mimeMatch[1].toLowerCase() : "image/jpeg";
        const imgFormat = mime === "image/png" ? "PNG" : mime === "image/webp" ? "WEBP" : "JPEG";
        doc.addImage(profile.avatarData, imgFormat, 16, y + 2, 26, 26);
        imgEndX = 46;
      } catch {
        imgEndX = 14;
      }
    }

    const textX = imgEndX + 4;
    const textW = contentW - (textX - 14) - 4;

    // Platform name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.primary);
    doc.text(profile.platform, textX, y + 8);

    // Username + confidence badge
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.body);
    doc.text(`@${profile.username}`, textX, y + 15);

    const confLabel = profile.confidenceLabel.toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...confidenceColor(profile.confidenceLabel));
    doc.text(`[${confLabel}]`, textX + 30, y + 15);

    // URL
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.blue);
    const urlTrunc = profile.url.length > 80 ? profile.url.slice(0, 77) + "…" : profile.url;
    doc.text(urlTrunc, textX, y + 21);

    // Evidence snippet
    if (profile.evidence.length > 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      const evidenceText = profile.evidence.slice(0, 3).join(" • ");
      const evidenceLines = doc.splitTextToSize(evidenceText, textW);
      doc.text(evidenceLines[0], textX, y + 27);
    }

    y += 34;
  }

  return y;
}

/** Website candidates table. */
function renderWebsites(doc: jsPDF, websites: WebsiteCandidate[], y: number): number {
  if (websites.length === 0) {
    y = ensureSpace(doc, y, 12);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text("No personal/portfolio websites were discovered for this subject.", 14, y);
    return y + 10;
  }

  const rows = websites.map((w) => [
    w.title || "(no title)",
    w.siteType,
    w.confidenceLabel.toUpperCase(),
    w.url.length > 60 ? w.url.slice(0, 57) + "…" : w.url,
    w.evidence.slice(0, 2).join("; "),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Title", "Type", "Confidence", "URL", "Evidence"]],
    body: rows,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: C.body, lineColor: C.border, lineWidth: 0.2, overflow: "linebreak" },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: C.altRow },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 55 },
      4: { cellWidth: "auto" },
    },
    didParseCell: (hookData: any) => {
      if (hookData.section === "body" && hookData.column.index === 2) {
        const val = (hookData.cell.raw as string).toLowerCase();
        if (val === "high") hookData.cell.styles.textColor = C.green;
        else if (val === "medium") hookData.cell.styles.textColor = C.yellow;
        else hookData.cell.styles.textColor = C.muted;
      }
    },
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

/** Footprint analysis sections. */
function renderFootprint(doc: jsPDF, fp: FootprintAnalysis, y: number): number {
  // Presence
  y = sectionHeader(doc, "Online Presence", y);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Metric", "Value"]],
    body: [
      ["Breadth", fp.presence.breadth.toUpperCase()],
      ["Active Platforms", String(fp.presence.totalPlatforms)],
      ["Platforms", fp.presence.activePlatforms.join(", ") || "None"],
      ["Summary", fp.presence.breadthDescription],
    ],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, textColor: C.body, lineColor: C.border, lineWidth: 0.2, overflow: "linebreak" },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: C.altRow },
    columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Identity consistency
  y = sectionHeader(doc, "Identity Consistency", y);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Metric", "Value"]],
    body: [
      ["Consistency Level", fp.identityConsistency.consistencyLevel.replace("_", " ").toUpperCase()],
      ["Name Consistent", fp.identityConsistency.nameConsistent ? "Yes" : "No"],
      ["Username Variants", fp.identityConsistency.usernameVariants.join(", ") || "None"],
      ["Notes", fp.identityConsistency.notes],
    ],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, textColor: C.body, lineColor: C.border, lineWidth: 0.2, overflow: "linebreak" },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: C.altRow },
    columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Risk signals
  y = sectionHeader(doc, "Risk Signals", y);
  if (fp.riskSignals.length === 0) {
    y = ensureSpace(doc, y, 10);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.green);
    doc.text("✔  No significant risk signals identified.", 14, y);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Signal", "Severity", "Description"]],
      body: fp.riskSignals.map((r) => [r.signal, r.severity.toUpperCase(), r.description]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3, textColor: C.body, lineColor: C.border, lineWidth: 0.2, overflow: "linebreak" },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: C.altRow },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 22 } },
      didParseCell: (hookData: any) => {
        if (hookData.section === "body" && hookData.column.index === 1) {
          const val = (hookData.cell.raw as string).toLowerCase();
          hookData.cell.styles.textColor = severityColor(val as any);
          hookData.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Impersonation
  y = sectionHeader(doc, "Impersonation / Duplicate Checks", y);
  y = ensureSpace(doc, y, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  if (!fp.impersonationChecks.flagged) {
    doc.setTextColor(...C.green);
    doc.text("✔  No duplicate or impersonation indicators found.", 14, y);
    y += 10;
  } else {
    doc.setTextColor(...C.red);
    doc.text("⚠  Potential duplicate/impersonation accounts detected:", 14, y);
    y += 7;
    doc.setTextColor(...C.body);
    for (const d of fp.impersonationChecks.details) {
      y = ensureSpace(doc, y, 8);
      const lines = doc.splitTextToSize(`• ${d}`, doc.internal.pageSize.getWidth() - 28);
      doc.text(lines, 18, y);
      y += lines.length * 5 + 2;
    }
  }

  // Sensitive exposure
  y = sectionHeader(doc, "Sensitive Data Exposure", y);
  y = ensureSpace(doc, y, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  if (!fp.sensitiveExposure.found) {
    doc.setTextColor(...C.green);
    doc.text("✔  No directly exposed PII detected in search snippets.", 14, y);
    y += 10;
  } else {
    doc.setTextColor(...C.red);
    doc.text("⚠  Potentially sensitive information found in public content:", 14, y);
    y += 7;
    doc.setTextColor(...C.body);
    for (const item of fp.sensitiveExposure.items) {
      y = ensureSpace(doc, y, 7);
      doc.text(`  • ${item}`, 14, y);
      y += 6;
    }
    y += 2;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    const cautionLines = doc.splitTextToSize(fp.sensitiveExposure.cautionNote, doc.internal.pageSize.getWidth() - 28);
    doc.text(cautionLines, 14, y);
    y += cautionLines.length * 4.5 + 4;
  }

  // Recommendations
  y = sectionHeader(doc, "Recommendations", y);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["#", "Recommendation"]],
    body: fp.recommendations.map((r, i) => [String(i + 1), r]),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, textColor: C.body, lineColor: C.border, lineWidth: 0.2, overflow: "linebreak" },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: C.altRow },
    columnStyles: { 0: { cellWidth: 10, halign: "center" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Limitations
  y = sectionHeader(doc, "Limitations", y);
  y = ensureSpace(doc, y, 20);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  const limLines = doc.splitTextToSize(fp.limitations, doc.internal.pageSize.getWidth() - 28);
  doc.text(limLines, 14, y);
  y += limLines.length * 4.5 + 6;

  return y;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate and download a PDF report for an investigative agent result.
 * Call from the browser (uses `doc.save()`).
 */
export function generateInvestigativeReport(data: InvestigativeReportData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();

  // ── Cover page ──
  let y = renderCover(doc, data);

  // ── Social profiles ──
  doc.addPage();
  y = 20;
  y = sectionHeader(doc, `Discovered Social Profiles (${data.profiles.length})`, y);
  y = renderProfiles(doc, data.profiles, y);

  // ── Websites ──
  y = ensureSpace(doc, y, 20);
  y = sectionHeader(doc, `Discovered Websites (${data.websites.length})`, y);
  y = renderWebsites(doc, data.websites, y);

  // ── Digital footprint analysis ──
  doc.addPage();
  y = 20;
  y = sectionHeader(doc, "Digital Footprint Analysis", y);
  y = renderFootprint(doc, data.footprintAnalysis, y);

  // ── Footers ──
  addFooters(doc, doc.getNumberOfPages());

  // ── Save ──
  const safeName = data.input.fullName.replace(/[^a-zA-Z0-9]/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`SEPTO_Investigative_${safeName}_${dateStr}.pdf`);
}

/**
 * Generate and return the PDF as a base64 data URL (for server-side use).
 */
export function generateInvestigativeReportBase64(data: InvestigativeReportData): string {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = renderCover(doc, data);

  doc.addPage();
  y = 20;
  y = sectionHeader(doc, `Discovered Social Profiles (${data.profiles.length})`, y);
  y = renderProfiles(doc, data.profiles, y);

  y = ensureSpace(doc, y, 20);
  y = sectionHeader(doc, `Discovered Websites (${data.websites.length})`, y);
  y = renderWebsites(doc, data.websites, y);

  doc.addPage();
  y = 20;
  y = sectionHeader(doc, "Digital Footprint Analysis", y);
  renderFootprint(doc, data.footprintAnalysis, y);

  addFooters(doc, doc.getNumberOfPages());

  return doc.output("datauristring");
}

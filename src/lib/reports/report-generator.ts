import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Types (mirrors the InvestigationResult used in investigate-form) ──

interface ProfileResult {
    platform: string;
    url: string;
    found: boolean;
    confidence?: "high" | "medium" | "low";
    username?: string;
    data?: any;
}

interface InvestigationData {
    investigationId: string;
    entity: { id: number; name: string; type: string };
    status: "completed" | "failed" | "partial";
    findings: {
        profiles: ProfileResult[];
        emails: Array<string | { address: string; data?: any }>;
        domains: Array<string | { domain: string; data?: any }>;
        phones?: Array<{ number: string; data?: any }>;
        webResults?: Array<{ title: string; url: string; snippet: string }>;
        metadata: Record<string, any>;
    };
    analysis?: { riskScore: number; insights: string[]; summary: string };
    recommendations?: string[];
    relationships?: any[];
    networkAnalysis?: any;
    duration: number;
    createdAt: string;
}

// ── Colour Palette (designed for white PDF background) ──

const COLORS = {
    primary: [0, 130, 40] as [number, number, number],        // deep green
    heading: [20, 20, 25] as [number, number, number],         // near-black for headings
    body: [50, 50, 55] as [number, number, number],            // dark gray for body text
    muted: [120, 120, 130] as [number, number, number],        // muted for secondary text
    white: [255, 255, 255] as [number, number, number],
    red: [200, 40, 40] as [number, number, number],
    yellow: [180, 130, 0] as [number, number, number],
    green: [20, 150, 60] as [number, number, number],
    blue: [40, 90, 200] as [number, number, number],
    cyan: [0, 130, 160] as [number, number, number],
    sectionBg: [240, 245, 240] as [number, number, number],    // very light green tint
    statBg: [245, 247, 250] as [number, number, number],       // very light blue-gray
    border: [210, 215, 220] as [number, number, number],       // light border
    altRow: [248, 250, 252] as [number, number, number],       // zebra stripe for tables
};

// ── Helpers ──

function riskColor(score: number): [number, number, number] {
    if (score >= 7) return COLORS.red;
    if (score >= 4) return COLORS.yellow;
    return COLORS.green;
}

function riskLabel(score: number): string {
    if (score >= 7) return "HIGH RISK";
    if (score >= 4) return "MEDIUM RISK";
    return "LOW RISK";
}

function confidenceLabel(c?: string): string {
    if (c === "high") return "HIGH";
    if (c === "medium") return "MEDIUM";
    return "LOW";
}

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleString("en-US", {
            year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch {
        return dateStr;
    }
}

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text("SEPTO — Security & Entity Profiling Threat Observatory", 20, pageHeight - 9);
    doc.text("CONFIDENTIAL", pageWidth / 2, pageHeight - 9, { align: "center" });
    doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - 20, pageHeight - 9, { align: "right" });
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - 25) {
        doc.addPage();
        return 30;
    }
    return y;
}

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    y = checkPageBreak(doc, y, 18);
    doc.setFillColor(...COLORS.sectionBg);
    doc.roundedRect(20, y, pageWidth - 40, 12, 2, 2, "F");
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(20, y, pageWidth - 40, 12, 2, 2, "S");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text(title.toUpperCase(), 26, y + 8);
    return y + 18;
}

// ── Main Export ──

export function generateInvestigationReport(data: InvestigationData): void {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - 40;

    // ==========================
    // PAGE 1 — COVER / HEADER
    // ==========================

    // Top accent bar
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 4, "F");

    // Title block
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text("SEPTO", 20, 30);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text("Security & Entity Profiling Threat Observatory", 20, 37);

    // Horizontal rule
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(20, 42, pageWidth - 20, 42);

    // Report title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text("OSINT Investigation Report", 20, 55);

    // Target info box
    doc.setFillColor(...COLORS.statBg);
    doc.roundedRect(20, 62, contentWidth, 28, 3, 3, "F");
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(20, 62, contentWidth, 28, 3, 3, "S");

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text("TARGET", 28, 72);
    doc.text("TYPE", 28, 82);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text(data.entity.name, 55, 72);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.body);
    doc.text(data.entity.type.charAt(0).toUpperCase() + data.entity.type.slice(1), 55, 82);

    // Meta line
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Report ID: ${data.investigationId}`, 28, 95);
    doc.text(`Generated: ${formatDate(data.createdAt)}`, pageWidth / 2, 95, { align: "center" });
    doc.text(`Duration: ${data.duration}s`, pageWidth - 28, 95, { align: "right" });

    doc.text(`Status: ${data.status.toUpperCase()}`, 28, 101);

    let y = 112;

    // ==========================
    // EXECUTIVE SUMMARY
    // ==========================
    y = drawSectionHeader(doc, "Executive Summary", y);

    // Risk score badge (inline)
    if (data.analysis) {
        const rc = riskColor(data.analysis.riskScore);
        doc.setFillColor(...rc);
        doc.roundedRect(20, y, 36, 12, 2, 2, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.white);
        doc.text(`Risk: ${data.analysis.riskScore}/10`, 23, y + 8);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...rc);
        doc.text(riskLabel(data.analysis.riskScore), 60, y + 8);
        y += 18;

        // Summary text
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.body);
        const summaryLines = doc.splitTextToSize(data.analysis.summary, contentWidth);
        doc.text(summaryLines, 20, y);
        y += summaryLines.length * 4.5 + 4;
    } else {
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.body);
        doc.text("Analysis was not performed for this investigation.", 20, y);
        y += 8;
    }

    // Quick stats row
    y = checkPageBreak(doc, y, 22);
    const stats = [
        { label: "Profiles", value: String(data.findings.profiles.length), color: COLORS.primary },
        { label: "High Conf.", value: String(data.findings.profiles.filter(p => p.confidence === "high").length), color: COLORS.green },
        { label: "Emails", value: String(data.findings.emails?.length || 0), color: COLORS.yellow },
        { label: "Domains", value: String(data.findings.domains?.length || 0), color: COLORS.blue },
    ];
    const statW = contentWidth / stats.length;
    stats.forEach((s, i) => {
        const x = 20 + i * statW;
        doc.setFillColor(...COLORS.statBg);
        doc.roundedRect(x + 1, y, statW - 2, 18, 2, 2, "F");
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(x + 1, y, statW - 2, 18, 2, 2, "S");
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...s.color);
        doc.text(s.value, x + statW / 2, y + 10, { align: "center" });
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.text(s.label, x + statW / 2, y + 15, { align: "center" });
    });
    y += 24;

    // ==========================
    // DIGITAL FOOTPRINT ANALYSIS
    // ==========================
    const foundProfiles = data.findings.profiles.filter(p => p.found);
    if (foundProfiles.length > 0) {
        y = drawSectionHeader(doc, "Digital Footprint Analysis", y);

        doc.setFontSize(9);
        doc.setTextColor(...COLORS.body);
        doc.text(
            `Discovered ${foundProfiles.length} active profile(s) across multiple platforms. Breakdown by confidence level:`,
            20, y
        );
        y += 8;

        // Profile table
        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["#", "Platform", "URL", "Confidence"]],
            body: foundProfiles
                .sort((a, b) => {
                    const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
                    return (order[b.confidence || "low"] || 0) - (order[a.confidence || "low"] || 0);
                })
                .map((p, i) => [
                    String(i + 1),
                    p.platform,
                    p.url.length > 50 ? p.url.slice(0, 50) + "..." : p.url,
                    confidenceLabel(p.confidence),
                ]),
            theme: "grid",
            styles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: COLORS.body,
                lineColor: COLORS.border,
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: COLORS.primary,
                textColor: COLORS.white,
                fontStyle: "bold",
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: COLORS.altRow,
            },
            columnStyles: {
                0: { cellWidth: 10, halign: "center" },
                1: { cellWidth: 30 },
                2: { cellWidth: "auto" },
                3: { cellWidth: 28, halign: "center" },
            },
            didParseCell: (hookData: any) => {
                // Color the confidence column
                if (hookData.section === "body" && hookData.column.index === 3) {
                    const text = hookData.cell.raw as string;
                    if (text === "HIGH") hookData.cell.styles.textColor = COLORS.green;
                    else if (text === "MEDIUM") hookData.cell.styles.textColor = COLORS.yellow;
                    else hookData.cell.styles.textColor = COLORS.muted;
                }
            },
        });

        y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ==========================
    // EMAIL INTELLIGENCE
    // ==========================
    if (data.findings.emails && data.findings.emails.length > 0) {
        y = drawSectionHeader(doc, "Email Intelligence", y);

        const emailRows = data.findings.emails.map((e, i) => {
            const addr = typeof e === "string" ? e : e.address;
            return [String(i + 1), addr];
        });

        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["#", "Email Address"]],
            body: emailRows,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
            alternateRowStyles: { fillColor: COLORS.altRow },
            columnStyles: { 0: { cellWidth: 10, halign: "center" } },
        });
        y = (doc as any).lastAutoTable.finalY + 4;

        // Breach info from metadata
        const emailIntel = data.findings.metadata?.emailIntel;
        if (emailIntel) {
            y = checkPageBreak(doc, y, 20);
            doc.setFontSize(8);
            if (emailIntel.breaches !== undefined) {
                const breachColor = emailIntel.breaches > 0 ? COLORS.red : COLORS.green;
                doc.setTextColor(...breachColor);
                doc.setFont("helvetica", "bold");
                doc.text(`Data Breaches: ${emailIntel.breaches}`, 20, y);
                doc.setFont("helvetica", "normal");
                y += 5;
            }
            if (emailIntel.valid !== undefined) {
                doc.setTextColor(...COLORS.body);
                doc.text(`Valid: ${emailIntel.valid ? "Yes" : "No"}`, 20, y);
                y += 5;
            }
            if (emailIntel.disposable !== undefined) {
                doc.text(`Disposable: ${emailIntel.disposable ? "Yes" : "No"}`, 20, y);
                y += 5;
            }
            y += 2;
        }
    }

    // ==========================
    // DOMAIN INTELLIGENCE
    // ==========================
    if (data.findings.domains && data.findings.domains.length > 0) {
        y = drawSectionHeader(doc, "Domain Intelligence", y);

        const domainRows = data.findings.domains.map((d, i) => {
            const domain = typeof d === "string" ? d : d.domain;
            return [String(i + 1), domain];
        });

        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["#", "Domain"]],
            body: domainRows,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
            alternateRowStyles: { fillColor: COLORS.altRow },
            columnStyles: { 0: { cellWidth: 10, halign: "center" } },
        });
        y = (doc as any).lastAutoTable.finalY + 4;

        // Domain metadata
        const domainIntel = data.findings.metadata?.domainIntel;
        if (domainIntel) {
            y = checkPageBreak(doc, y, 20);
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.body);
            if (domainIntel.shodanPorts !== undefined) {
                doc.text(`Open Ports (Shodan): ${domainIntel.shodanPorts}`, 20, y);
                y += 5;
            }
            if (domainIntel.shodanVulns !== undefined) {
                const vulnColor = domainIntel.shodanVulns > 0 ? COLORS.red : COLORS.green;
                doc.setTextColor(...vulnColor);
                doc.setFont("helvetica", "bold");
                doc.text(`Known Vulnerabilities: ${domainIntel.shodanVulns}`, 20, y);
                doc.setFont("helvetica", "normal");
                y += 5;
            }
            if (domainIntel.ssl !== undefined) {
                doc.setTextColor(...COLORS.body);
                doc.text(`SSL Valid: ${domainIntel.ssl ? "Yes" : "No"}`, 20, y);
                y += 5;
            }
            y += 2;
        }
    }

    // ==========================
    // PHONE INTELLIGENCE
    // ==========================
    if (data.findings.phones && data.findings.phones.length > 0) {
        y = drawSectionHeader(doc, "Phone Intelligence", y);

        const phoneRows = data.findings.phones.map((p, i) => [String(i + 1), p.number]);

        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["#", "Phone Number"]],
            body: phoneRows,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
            alternateRowStyles: { fillColor: COLORS.altRow },
            columnStyles: { 0: { cellWidth: 10, halign: "center" } },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ==========================
    // WEB INTELLIGENCE
    // ==========================
    if (data.findings.webResults && data.findings.webResults.length > 0) {
        y = drawSectionHeader(doc, "Web Intelligence (Search Results)", y);

        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["#", "Title", "URL"]],
            body: data.findings.webResults.slice(0, 15).map((w, i) => [
                String(i + 1),
                w.title.length > 60 ? w.title.slice(0, 60) + "..." : w.title,
                w.url.length > 55 ? w.url.slice(0, 55) + "..." : w.url,
            ]),
            theme: "grid",
            styles: { fontSize: 7, cellPadding: 2.5, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 7 },
            alternateRowStyles: { fillColor: COLORS.altRow },
            columnStyles: {
                0: { cellWidth: 8, halign: "center" },
                1: { cellWidth: 65 },
                2: { cellWidth: "auto" },
            },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ==========================
    // KEY INSIGHTS
    // ==========================
    if (data.analysis && data.analysis.insights.length > 0) {
        y = drawSectionHeader(doc, "Key Insights", y);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        data.analysis.insights.forEach((insight) => {
            y = checkPageBreak(doc, y, 8);
            doc.setTextColor(...COLORS.cyan);
            doc.setFont("helvetica", "bold");
            doc.text(">", 22, y);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLORS.body);
            const lines = doc.splitTextToSize(insight, contentWidth - 10);
            doc.text(lines, 28, y);
            y += lines.length * 4 + 2;
        });
        y += 2;
    }

    // ==========================
    // RECOMMENDATIONS
    // ==========================
    if (data.recommendations && data.recommendations.length > 0) {
        y = drawSectionHeader(doc, "Recommendations", y);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        data.recommendations.forEach((rec) => {
            y = checkPageBreak(doc, y, 8);
            // Strip emoji prefix for cleaner PDF look
            const cleanRec = rec.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]\s*/u, "");
            doc.setTextColor(...COLORS.blue);
            doc.setFont("helvetica", "bold");
            doc.text("-", 22, y);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLORS.body);
            const lines = doc.splitTextToSize(cleanRec, contentWidth - 10);
            doc.text(lines, 28, y);
            y += lines.length * 4 + 2;
        });
        y += 2;
    }

    // ==========================
    // RELATIONSHIP SUMMARY
    // ==========================
    if (data.relationships && data.relationships.length > 0) {
        y = drawSectionHeader(doc, "Discovered Relationships", y);

        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["#", "Related Entity", "Relationship", "Strength"]],
            body: data.relationships.slice(0, 20).map((r: any, i: number) => [
                String(i + 1),
                r.targetName || r.target || "Unknown",
                r.type || r.relationType || "associated",
                r.strength !== undefined ? `${r.strength}%` : "-",
            ]),
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
            alternateRowStyles: { fillColor: COLORS.altRow },
            columnStyles: { 0: { cellWidth: 10, halign: "center" }, 3: { cellWidth: 22, halign: "center" } },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ==========================
    // INVESTIGATION METADATA
    // ==========================
    y = drawSectionHeader(doc, "Investigation Metadata", y);

    const metaItems = [
        ["Investigation ID", data.investigationId],
        ["Target", data.entity.name],
        ["Target Type", data.entity.type],
        ["Status", data.status.toUpperCase()],
        ["Duration", `${data.duration} seconds`],
        ["Generated At", formatDate(data.createdAt)],
        ["Profiles Scanned", String(data.findings.metadata?.searchedPlatforms || "20+")],
        ["Profiles Found", String(data.findings.profiles.length)],
        ["High Confidence", String(data.findings.metadata?.highConfidenceProfiles || data.findings.profiles.filter(p => p.confidence === "high").length)],
    ];

    autoTable(doc, {
        startY: y,
        margin: { left: 20, right: 20 },
        head: [["Property", "Value"]],
        body: metaItems,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: COLORS.altRow },
        columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
    });

    // ==========================
    // DISCLAIMER
    // ==========================
    y = (doc as any).lastAutoTable.finalY + 10;
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "italic");
    const disclaimer = "DISCLAIMER: This report was generated automatically by SEPTO using open-source intelligence (OSINT) techniques. All information was gathered from publicly available sources. This report is intended for authorized security research purposes only. The accuracy of findings depends on the availability and reliability of public data sources.";
    const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
    doc.text(disclaimerLines, 20, y);

    // ==========================
    // PAGE FOOTERS
    // ==========================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addPageFooter(doc, i, totalPages);
    }

    // ==========================
    // SAVE
    // ==========================
    const filename = `SEPTO_Report_${data.entity.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
}

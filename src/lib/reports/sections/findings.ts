import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InvestigationData, COLORS } from "../report-types";
import {
    drawSectionHeader,
    checkPageBreak,
    confidenceLabel,
    defaultTableStyles,
    defaultHeadStyles,
    lastTableY,
} from "../report-primitives";

/**
 * Renders the findings sections: Digital Footprint Analysis (profiles),
 * Email Intelligence, Domain Intelligence, Phone Intelligence,
 * and Web Intelligence (Search Results).
 * Returns the Y position after all findings sections.
 */
export function renderFindings(
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    contentWidth: number,
): number {
    y = renderProfiles(doc, y, data, contentWidth);
    y = renderEmails(doc, y, data);
    y = renderDomains(doc, y, data);
    y = renderPhones(doc, y, data);
    y = renderWebResults(doc, y, data);
    return y;
}

// Sub-renderers
function renderProfiles(
    doc: jsPDF,
    y: number,
    data: InvestigationData,
    contentWidth: number,
): number {
    const foundProfiles = data.findings.profiles.filter(p => p.found);
    if (foundProfiles.length === 0) return y;

    y = drawSectionHeader(doc, "Digital Footprint Analysis", y);

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.body);
    doc.text(
        `Discovered ${foundProfiles.length} active profile(s) across multiple platforms. Breakdown by confidence level:`,
        20, y,
    );
    y += 8;

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
        alternateRowStyles: { fillColor: COLORS.altRow },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 30 },
            2: { cellWidth: "auto" },
            3: { cellWidth: 28, halign: "center" },
        },
        didParseCell: (hookData: any) => {
            if (hookData.section === "body" && hookData.column.index === 3) {
                const text = hookData.cell.raw as string;
                if (text === "HIGH") hookData.cell.styles.textColor = COLORS.green;
                else if (text === "MEDIUM") hookData.cell.styles.textColor = COLORS.yellow;
                else hookData.cell.styles.textColor = COLORS.muted;
            }
        },
    });

    return lastTableY(doc) + 6;
}

function renderEmails(doc: jsPDF, y: number, data: InvestigationData): number {
    if (!data.findings.emails || data.findings.emails.length === 0) return y;

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
    y = lastTableY(doc) + 4;

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

    return y;
}

function renderDomains(doc: jsPDF, y: number, data: InvestigationData): number {
    if (!data.findings.domains || data.findings.domains.length === 0) return y;

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
    y = lastTableY(doc) + 4;

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

    return y;
}

function renderPhones(doc: jsPDF, y: number, data: InvestigationData): number {
    if (!data.findings.phones || data.findings.phones.length === 0) return y;

    y = drawSectionHeader(doc, "Phone Intelligence", y);

    autoTable(doc, {
        startY: y,
        margin: { left: 20, right: 20 },
        head: [["#", "Phone Number"]],
        body: data.findings.phones.map((p, i) => [String(i + 1), p.number]),
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: COLORS.altRow },
        columnStyles: { 0: { cellWidth: 10, halign: "center" } },
    });

    return lastTableY(doc) + 6;
}

function renderWebResults(doc: jsPDF, y: number, data: InvestigationData): number {
    if (!data.findings.webResults || data.findings.webResults.length === 0) return y;

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

    return lastTableY(doc) + 6;
}

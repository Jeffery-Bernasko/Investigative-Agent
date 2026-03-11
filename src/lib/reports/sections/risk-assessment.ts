import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InvestigationData, COLORS } from "../report-types";
import {
    drawSectionHeader,
    drawSubHeader,
    checkPageBreak,
    severityColor,
    defaultTableStyles,
    defaultHeadStyles,
    lastTableY,
} from "../report-primitives";

/**
 * Renders the Risk Assessment & Watchdog Alerts section.
 * Returns the Y position after the section.
 */
export function renderRiskAssessment(
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    contentWidth: number,
): number {
    if (!data.deepAnalysis) return y;

    const df = data.deepAnalysis.digitalFootprint;
    const hasRiskAreas = df.riskAreas.length > 0;
    const hasAlerts = df.watchdogAlerts.length > 0;

    if (!hasRiskAreas && !hasAlerts) return y;

    const pageWidth = doc.internal.pageSize.getWidth();

    y = drawSectionHeader(doc, "Risk Assessment & Alerts", y);

    // ── Risk Areas Table ──
    if (hasRiskAreas) {
        y = renderRiskAreas(doc, y, df);
    }

    // ── Watchdog Alerts ──
    if (hasAlerts) {
        y = renderWatchdogAlerts(doc, y, df, pageWidth, contentWidth);
    }

    y += 2;
    return y;
}

// ─────────────────────────────────────────────────────────
// Private sub-renderers
// ─────────────────────────────────────────────────────────

function renderRiskAreas(
    doc: jsPDF,
    y: number,
    df: NonNullable<InvestigationData["deepAnalysis"]>["digitalFootprint"],
): number {
    y = checkPageBreak(doc, y, 14);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text("Identified Risk Areas", 20, y);

    // Risk count badge
    const riskCountColor = df.riskAreas.some(r => r.risk === "high") ? COLORS.red : COLORS.yellow;
    doc.setFillColor(...riskCountColor);
    doc.roundedRect(70, y - 4, 20, 7, 2, 2, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(`${df.riskAreas.length} found`, 72, y);
    y += 5;

    autoTable(doc, {
        startY: y,
        margin: { left: 20, right: 20 },
        head: [["#", "Risk Area", "Level", "Details", "Mitigation"]],
        body: df.riskAreas
            .sort((a, b) => {
                const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
                return (order[b.risk] || 0) - (order[a.risk] || 0);
            })
            .map((r, i) => [
                String(i + 1),
                r.area,
                r.risk.toUpperCase(),
                r.details,
                r.mitigation,
            ]),
        theme: "grid",
        styles: defaultTableStyles(),
        headStyles: defaultHeadStyles(),
        alternateRowStyles: { fillColor: COLORS.altRow },
        columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 32, fontStyle: "bold" },
            2: { cellWidth: 16, halign: "center" },
            3: { cellWidth: "auto" },
            4: { cellWidth: 40 },
        },
        didParseCell: (hookData: any) => {
            if (hookData.section === "body" && hookData.column.index === 2) {
                const text = hookData.cell.raw as string;
                if (text === "HIGH") {
                    hookData.cell.styles.textColor = COLORS.red;
                    hookData.cell.styles.fontStyle = "bold";
                } else if (text === "MEDIUM") {
                    hookData.cell.styles.textColor = COLORS.yellow;
                    hookData.cell.styles.fontStyle = "bold";
                } else {
                    hookData.cell.styles.textColor = COLORS.green;
                }
            }
            if (hookData.section === "body" && hookData.column.index === 4) {
                hookData.cell.styles.textColor = COLORS.blue;
            }
        },
    });

    return lastTableY(doc) + 6;
}

function renderWatchdogAlerts(
    doc: jsPDF,
    y: number,
    df: NonNullable<InvestigationData["deepAnalysis"]>["digitalFootprint"],
    pageWidth: number,
    contentWidth: number,
): number {
    y = checkPageBreak(doc, y, 14);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text("Watchdog Alerts", 20, y);

    // Alert count badge
    const criticalAlerts = df.watchdogAlerts.filter(a => a.severity === "critical").length;
    const alertBadgeColor = criticalAlerts > 0 ? COLORS.red : COLORS.yellow;
    doc.setFillColor(...alertBadgeColor);
    doc.roundedRect(62, y - 4, 24, 7, 2, 2, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(`${df.watchdogAlerts.length} alert(s)`, 64, y);
    y += 6;

    // Sort alerts: critical first
    const sortedAlerts = [...df.watchdogAlerts].sort((a, b) => {
        const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (order[b.severity] || 0) - (order[a.severity] || 0);
    });

    sortedAlerts.forEach((alert) => {
        y = checkPageBreak(doc, y, 16);
        const alertColor = severityColor(alert.severity);

        // Alert container
        doc.setFillColor(...COLORS.statBg);
        doc.roundedRect(20, y, contentWidth, 13, 2, 2, "F");
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(20, y, contentWidth, 13, 2, 2, "S");

        // Severity accent bar
        doc.setFillColor(...alertColor);
        doc.rect(20, y, 3, 13, "F");

        // Severity badge
        doc.setFillColor(...alertColor);
        doc.roundedRect(26, y + 2, 20, 6, 1, 1, "F");
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.white);
        doc.text(alert.severity.toUpperCase(), 28, y + 6);

        // Alert type label
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.muted);
        doc.text(alert.alertType.replace(/_/g, " ").toUpperCase(), 50, y + 6);

        // Actionable indicator
        if (alert.actionable) {
            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.green);
            doc.text("✓ ACTIONABLE", pageWidth - 42, y + 6);
        } else {
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLORS.muted);
            doc.text("MONITOR", pageWidth - 42, y + 6);
        }

        // Alert message
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.body);
        doc.text(
            alert.message.length > 100 ? alert.message.slice(0, 100) + "..." : alert.message,
            26, y + 11,
        );

        y += 16;
    });

    y += 2;
    return y;
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InvestigationData, COLORS } from "../report-types";
import {
    drawSectionHeader,
    drawStatRow,
    checkPageBreak,
    formatShortDate,
    defaultTableStyles,
    defaultHeadStyles,
    lastTableY,
} from "../report-primitives";

/**
 * Renders the Activity Timeline section:
 * summary line, timeline table, truncation notice, and event type breakdown.
 * Returns the Y position after the section.
 */
export function renderActivityTimeline(
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    contentWidth: number,
): number {
    if (!data.deepAnalysis) return y;

    const timeline = data.deepAnalysis.timeline;
    if (timeline.length === 0) return y;

    y = drawSectionHeader(doc, "Activity Timeline", y);

    // ── Summary line ──
    y = checkPageBreak(doc, y, 10);

    const criticalCount = timeline.filter(e => e.severity === "critical").length;
    const highCount = timeline.filter(e => e.severity === "high").length;
    const breachCount = timeline.filter(e => e.eventType === "breach").length;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.body);

    const summaryParts = [`${timeline.length} event(s) detected`];
    if (criticalCount > 0) summaryParts.push(`${criticalCount} critical`);
    if (highCount > 0) summaryParts.push(`${highCount} high priority`);
    if (breachCount > 0) summaryParts.push(`${breachCount} breach(es)`);

    doc.text(summaryParts.join("  •  "), 20, y);

    if (criticalCount > 0) {
        const indicatorX = 20 + doc.getTextWidth(summaryParts.join("  •  ")) + 4;
        doc.setFillColor(...COLORS.red);
        doc.circle(indicatorX, y - 1, 1.5, "F");
    }

    y += 6;

    // ── Timeline Table ──
    const displayEvents = timeline.slice(0, 25);

    autoTable(doc, {
        startY: y,
        margin: { left: 20, right: 20 },
        head: [["#", "Date", "Type", "Event", "Details", "Severity"]],
        body: displayEvents.map((event, i) => [
            String(i + 1),
            formatShortDate(event.timestamp),
            formatEventType(event.eventType),
            event.title.length > 40 ? event.title.slice(0, 40) + "..." : event.title,
            event.description.length > 50 ? event.description.slice(0, 50) + "..." : event.description,
            event.severity.toUpperCase(),
        ]),
        theme: "grid",
        styles: {
            fontSize: 6.5,
            cellPadding: 2,
            textColor: COLORS.body,
            lineColor: COLORS.border,
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontStyle: "bold",
            fontSize: 6.5,
        },
        alternateRowStyles: { fillColor: COLORS.altRow },
        columnStyles: {
            0: { cellWidth: 7, halign: "center" },
            1: { cellWidth: 22 },
            2: { cellWidth: 22, halign: "center" },
            3: { cellWidth: 38 },
            4: { cellWidth: "auto" },
            5: { cellWidth: 18, halign: "center" },
        },
        didParseCell: (hookData: any) => {
            // Color the severity column
            if (hookData.section === "body" && hookData.column.index === 5) {
                const text = hookData.cell.raw as string;
                if (text === "CRITICAL") {
                    hookData.cell.styles.textColor = COLORS.red;
                    hookData.cell.styles.fontStyle = "bold";
                } else if (text === "HIGH") {
                    hookData.cell.styles.textColor = [220, 120, 0];
                    hookData.cell.styles.fontStyle = "bold";
                } else if (text === "MEDIUM") {
                    hookData.cell.styles.textColor = COLORS.yellow;
                } else if (text === "LOW") {
                    hookData.cell.styles.textColor = COLORS.green;
                } else {
                    hookData.cell.styles.textColor = COLORS.muted;
                }
            }
            // Color the event type column
            if (hookData.section === "body" && hookData.column.index === 2) {
                const text = hookData.cell.raw as string;
                if (text === "BREACH") {
                    hookData.cell.styles.textColor = COLORS.red;
                    hookData.cell.styles.fontStyle = "bold";
                } else if (text === "ALERT") {
                    hookData.cell.styles.textColor = [220, 120, 0];
                    hookData.cell.styles.fontStyle = "bold";
                } else if (text === "RELATIONSHIP") {
                    hookData.cell.styles.textColor = COLORS.blue;
                } else if (text === "DISCOVERY") {
                    hookData.cell.styles.textColor = COLORS.cyan;
                } else {
                    hookData.cell.styles.textColor = COLORS.muted;
                }
            }
            // Highlight entire row for critical events
            if (hookData.section === "body") {
                const rowData = hookData.row.raw as string[];
                if (rowData && rowData[5] === "CRITICAL") {
                    hookData.cell.styles.fillColor = [255, 240, 240];
                }
            }
        },
    });

    y = lastTableY(doc) + 4;

    // Truncation notice
    if (timeline.length > 25) {
        y = checkPageBreak(doc, y, 6);
        doc.setFontSize(6);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...COLORS.muted);
        doc.text(
            `Showing 25 of ${timeline.length} events. Full timeline available in the application.`,
            20, y,
        );
        y += 5;
    }

    // ── Event Type Breakdown ──
    y = renderEventBreakdown(doc, y, timeline, contentWidth);

    y += 2;
    return y;
}

// Helpers
function formatEventType(type: string): string {
    switch (type) {
        case "profile_discovery": return "DISCOVERY";
        case "breach": return "BREACH";
        case "relationship": return "RELATIONSHIP";
        case "activity": return "ACTIVITY";
        case "alert": return "ALERT";
        default: return type.toUpperCase();
    }
}

function renderEventBreakdown(
    doc: jsPDF,
    y: number,
    timeline: NonNullable<InvestigationData["deepAnalysis"]>["timeline"],
    contentWidth: number,
): number {
    y = checkPageBreak(doc, y, 18);

    const eventTypes = [
        { type: "DISCOVERY", count: timeline.filter(e => e.eventType === "profile_discovery").length, color: COLORS.cyan },
        { type: "BREACH", count: timeline.filter(e => e.eventType === "breach").length, color: COLORS.red },
        { type: "RELATIONSHIP", count: timeline.filter(e => e.eventType === "relationship").length, color: COLORS.blue },
        { type: "ALERT", count: timeline.filter(e => e.eventType === "alert").length, color: COLORS.orange },
    ].filter(et => et.count > 0);

    if (eventTypes.length > 0) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.heading);
        doc.text("Event Breakdown", 20, y);
        y += 5;

        y = drawStatRow(
            doc,
            y,
            eventTypes.map(et => ({ label: et.type, value: String(et.count), color: et.color })),
            contentWidth,
            { height: 14, valueFontSize: 11, labelFontSize: 5.5 },
        );
    }

    return y;
}

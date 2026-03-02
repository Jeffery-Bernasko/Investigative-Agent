import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InvestigationData, COLORS } from "../report-types";
import { drawSectionHeader, formatDate, lastTableY } from "../report-primitives";

/**
 * Renders the Investigation Metadata table (including deep analysis rows).
 * Returns the Y position after the section.
 */
export function renderMetadata(
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    _contentWidth: number,
): number {
    y = drawSectionHeader(doc, "Investigation Metadata", y);

    const metaItems: string[][] = [
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

    // Deep analysis metadata
    if (data.deepAnalysis) {
        const da = data.deepAnalysis;
        const df = da.digitalFootprint;
        const bp = da.behaviorProfile;

        metaItems.push(
            ["─── Deep Analysis ───", ""],
            ["Analysis Confidence", `${da.confidence}%`],
            ["Analysis Date", formatDate(
                typeof da.analysisDate === "string" ? da.analysisDate : da.analysisDate.toString(),
            )],
            ["Activity Level", bp.activityLevel.replace("_", " ").toUpperCase()],
            ["Footprint Size", bp.digitalFootprint.size.toUpperCase()],
            ["Exposure Level", df.overview.exposureLevel.toUpperCase()],
            ["Visibility Score", `${df.overview.visibilityScore}/100`],
            ["Security Posture", bp.securityPosture.level.toUpperCase()],
            ["Watchdog Alerts", String(df.watchdogAlerts.length)],
            ["Behavioral Flags", String(bp.behavioralFlags.length)],
            ["Risk Areas", String(df.riskAreas.length)],
            ["Timeline Events", String(da.timeline.length)],
            ["Actionable Insights", String(da.insights.length)],
        );
    }

    autoTable(doc, {
        startY: y,
        margin: { left: 20, right: 20 },
        head: [["Property", "Value"]],
        body: metaItems,
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
            0: { cellWidth: 45, fontStyle: "bold" },
        },
        didParseCell: (hookData: any) => {
            if (hookData.section === "body") {
                const prop = hookData.row.raw?.[0] as string;
                const val = hookData.row.raw?.[1] as string;

                // Style the separator row
                if (prop && prop.startsWith("───")) {
                    hookData.cell.styles.fillColor = COLORS.sectionBg;
                    hookData.cell.styles.textColor = COLORS.primary;
                    hookData.cell.styles.fontStyle = "bold";
                    hookData.cell.styles.fontSize = 7;
                }

                // Color-code specific values
                if (hookData.column.index === 1) {
                    if (prop === "Exposure Level") {
                        if (val === "CRITICAL" || val === "HIGH") {
                            hookData.cell.styles.textColor = COLORS.red;
                            hookData.cell.styles.fontStyle = "bold";
                        } else if (val === "MODERATE") {
                            hookData.cell.styles.textColor = COLORS.yellow;
                        } else {
                            hookData.cell.styles.textColor = COLORS.green;
                        }
                    }
                    if (prop === "Security Posture") {
                        if (val === "POOR" || val === "WEAK") {
                            hookData.cell.styles.textColor = COLORS.red;
                            hookData.cell.styles.fontStyle = "bold";
                        } else if (val === "MODERATE") {
                            hookData.cell.styles.textColor = COLORS.yellow;
                        } else {
                            hookData.cell.styles.textColor = COLORS.green;
                        }
                    }
                    if (prop === "Watchdog Alerts" || prop === "Behavioral Flags" || prop === "Risk Areas") {
                        const num = parseInt(val, 10);
                        if (num > 0) {
                            hookData.cell.styles.textColor = COLORS.red;
                            hookData.cell.styles.fontStyle = "bold";
                        }
                    }
                }
            }
        },
    });

    return lastTableY(doc) + 6;
}

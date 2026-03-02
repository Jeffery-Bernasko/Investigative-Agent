import jsPDF from "jspdf";
import { InvestigationData, COLORS } from "../report-types";
import { checkPageBreak, exposureColor } from "../report-primitives";

/**
 * Renders the Subject Snapshot metrics row (only when deep analysis is available).
 * Returns the Y position after the section.
 */
export function renderSubjectSnapshot(
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    contentWidth: number,
): number {
    if (!data.deepAnalysis) return y + 6;

    const da = data.deepAnalysis;
    const bp = da.behaviorProfile;
    const df = da.digitalFootprint;
    const pageWidth = doc.internal.pageSize.getWidth();

    const snapshotBoxHeight = 32;
    y = checkPageBreak(doc, y, snapshotBoxHeight + 4);

    // Background box
    doc.setFillColor(...COLORS.sectionBg);
    doc.roundedRect(20, y, contentWidth, snapshotBoxHeight, 3, 3, "F");
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(20, y, contentWidth, snapshotBoxHeight, 3, 3, "S");

    // Section label
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("SUBJECT SNAPSHOT", 26, y + 6);

    // Row of key metrics
    const metricY = y + 14;
    const metricSpacing = contentWidth / 5;

    const metrics: Array<{
        value: string;
        label: string;
        color: [number, number, number];
    }> = [
            {
                value: bp.activityLevel.replace("_", " ").toUpperCase(),
                label: "Activity Level",
                color: bp.activityLevel === "very_high" || bp.activityLevel === "high"
                    ? [220, 120, 0]
                    : bp.activityLevel === "moderate"
                        ? COLORS.yellow
                        : COLORS.green,
            },
            {
                value: bp.digitalFootprint.size.toUpperCase(),
                label: "Footprint Size",
                color: COLORS.heading,
            },
            {
                value: df.overview.exposureLevel.toUpperCase(),
                label: "Exposure Level",
                color: exposureColor(df.overview.exposureLevel),
            },
            {
                value: `${df.overview.visibilityScore}/100`,
                label: "Visibility Score",
                color: COLORS.primary,
            },
            {
                value: `${da.confidence}%`,
                label: "Confidence",
                color: COLORS.cyan,
            },
        ];

    metrics.forEach((m, i) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...m.color);
        doc.text(m.value, 26 + metricSpacing * i, metricY);

        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(m.label, 26 + metricSpacing * i, metricY + 5);
    });

    // Thin accent line at bottom
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.4);
    doc.line(24, y + snapshotBoxHeight - 3, pageWidth - 24, y + snapshotBoxHeight - 3);

    return y + snapshotBoxHeight + 6;
}

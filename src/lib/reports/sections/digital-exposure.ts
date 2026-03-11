import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InvestigationData, COLORS } from "../report-types";
import {
    drawSectionHeader,
    drawStatRow,
    drawSubHeader,
    checkPageBreak,
    exposureColor,
    defaultTableStyles,
    defaultHeadStyles,
    lastTableY,
} from "../report-primitives";

/**
 * Renders the Digital Exposure Analysis section:
 * exposure overview, platform breakdown table, exposure metrics,
 * and growth trend.
 * Returns the Y position after the section.
 */
export function renderDigitalExposure(
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    contentWidth: number,
): number {
    if (!data.deepAnalysis) return y;

    const df = data.deepAnalysis.digitalFootprint;
    const pageWidth = doc.internal.pageSize.getWidth();

    y = drawSectionHeader(doc, "Digital Exposure Analysis", y);

    // ── Exposure Overview Row ──
    y = checkPageBreak(doc, y, 22);

    // Exposure level badge
    const expColor = exposureColor(df.overview.exposureLevel);
    doc.setFillColor(...expColor);
    doc.roundedRect(20, y, 46, 12, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(df.overview.exposureLevel.toUpperCase(), 23, y + 8);

    // Visibility score bar
    const barX = 72;
    const barW = 60;
    const barH = 8;
    const barY = y + 2;
    const fillW = Math.max(1, (df.overview.visibilityScore / 100) * barW);

    doc.setFillColor(...COLORS.statBg);
    doc.roundedRect(barX, barY, barW, barH, 2, 2, "F");
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(barX, barY, barW, barH, 2, 2, "S");

    const barColor = df.overview.visibilityScore > 70
        ? COLORS.red
        : df.overview.visibilityScore > 40
            ? COLORS.yellow
            : COLORS.green;
    doc.setFillColor(...barColor);
    doc.roundedRect(barX, barY, fillW, barH, 2, 2, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(fillW > 20 ? COLORS.white : COLORS.heading));
    doc.text(`${df.overview.visibilityScore}/100`, barX + barW / 2, barY + 5.5, { align: "center" });

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text("Visibility Score", barX, barY + barH + 4);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.body);
    doc.text(
        `${df.overview.totalPlatforms} platforms  •  ${df.overview.totalRelationships} relationships`,
        barX + barW + 8, y + 8,
    );

    y += 20;

    // ── Platform Breakdown Table ──
    y = renderPlatformBreakdown(doc, y, df);

    // ── Exposure Metrics ──
    y = renderExposureMetrics(doc, y, df, contentWidth);

    // ── Growth Trend ──
    y = renderGrowthTrend(doc, y, df, contentWidth);

    y += 2;
    return y;
}

// Private sub-renderers
function renderPlatformBreakdown(
    doc: jsPDF,
    y: number,
    df: NonNullable<InvestigationData["deepAnalysis"]>["digitalFootprint"],
): number {
    y = checkPageBreak(doc, y, 16);
    y = drawSubHeader(doc, "Platform Breakdown", y);

    const breakdownRows: string[][] = [];
    const categories = [
        { label: "Social", data: df.platformBreakdown.social },
        { label: "Professional", data: df.platformBreakdown.professional },
        { label: "Technical", data: df.platformBreakdown.technical },
        { label: "Other", data: df.platformBreakdown.other },
    ];

    categories.forEach((cat) => {
        if (cat.data.count > 0) {
            breakdownRows.push([
                cat.label,
                String(cat.data.count),
                cat.data.platforms.join(", ") || "—",
            ]);
        }
    });

    if (breakdownRows.length > 0) {
        autoTable(doc, {
            startY: y,
            margin: { left: 20, right: 20 },
            head: [["Category", "Count", "Platforms"]],
            body: breakdownRows,
            theme: "grid",
            styles: defaultTableStyles(),
            headStyles: defaultHeadStyles(),
            alternateRowStyles: { fillColor: COLORS.altRow },
            columnStyles: {
                0: { cellWidth: 28, fontStyle: "bold" },
                1: { cellWidth: 14, halign: "center" },
                2: { cellWidth: "auto" },
            },
            didParseCell: (hookData: any) => {
                if (hookData.section === "body" && hookData.column.index === 0) {
                    const label = hookData.cell.raw as string;
                    if (label === "Social") hookData.cell.styles.textColor = COLORS.cyan;
                    else if (label === "Professional") hookData.cell.styles.textColor = COLORS.blue;
                    else if (label === "Technical") hookData.cell.styles.textColor = COLORS.primary;
                    else hookData.cell.styles.textColor = COLORS.muted;
                }
            },
        });

        y = lastTableY(doc) + 6;
    }

    return y;
}

function renderExposureMetrics(
    doc: jsPDF,
    y: number,
    df: NonNullable<InvestigationData["deepAnalysis"]>["digitalFootprint"],
    contentWidth: number,
): number {
    y = checkPageBreak(doc, y, 26);
    y = drawSubHeader(doc, "Exposure Metrics", y);

    const expMetrics = [
        {
            label: "Public Profiles",
            value: String(df.exposureMetrics.publicProfiles),
            color: df.exposureMetrics.publicProfiles > 10 ? COLORS.red : COLORS.primary,
        },
        {
            label: "Verified Accounts",
            value: String(df.exposureMetrics.verifiedAccounts),
            color: COLORS.green,
        },
        {
            label: "Dormant Accounts",
            value: String(df.exposureMetrics.dormantAccounts),
            color: df.exposureMetrics.dormantAccounts > 5 ? COLORS.yellow : COLORS.muted,
        },
    ];

    return drawStatRow(doc, y, expMetrics, contentWidth, {
        height: 16,
        valueFontSize: 12,
        labelFontSize: 6,
    });
}

function renderGrowthTrend(
    doc: jsPDF,
    y: number,
    df: NonNullable<InvestigationData["deepAnalysis"]>["digitalFootprint"],
    contentWidth: number,
): number {
    y = checkPageBreak(doc, y, 14);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text("Growth Trend", 20, y);

    // Direction indicator
    const trendArrow = df.growthTrend.direction === "increasing"
        ? "▲"
        : df.growthTrend.direction === "decreasing"
            ? "▼"
            : "■";
    const trendColor = df.growthTrend.direction === "increasing"
        ? COLORS.red
        : df.growthTrend.direction === "decreasing"
            ? COLORS.green
            : COLORS.muted;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...trendColor);
    doc.text(`${trendArrow} ${df.growthTrend.direction.toUpperCase()}`, 60, y);
    y += 5;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.body);
    doc.text(df.growthTrend.rate, 20, y);
    y += 4;

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "italic");
    const trendLines = doc.splitTextToSize(df.growthTrend.analysis, contentWidth);
    doc.text(trendLines, 20, y);
    y += trendLines.length * 3.5 + 4;

    return y;
}

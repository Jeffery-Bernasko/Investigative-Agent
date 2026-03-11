import jsPDF from "jspdf";
import { InvestigationData, COLORS } from "../report-types";
import {
    drawSectionHeader,
    checkPageBreak,
    severityColor,
    categoryColor,
} from "../report-primitives";

/**
 * Renders the Actionable Intelligence section:
 * structured insight cards (from deep analysis) or fallback plain-text insights.
 * Returns the Y position after the section.
 */
export function renderActionableIntelligence(
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    contentWidth: number,
): number {
    const pageWidth = doc.internal.pageSize.getWidth();

    if (data.deepAnalysis && data.deepAnalysis.insights.length > 0) {
        return renderStructuredInsights(doc, y, data.deepAnalysis.insights, contentWidth, pageWidth);
    }

    if (data.analysis && data.analysis.insights.length > 0) {
        return renderPlainInsights(doc, y, data.analysis.insights, contentWidth);
    }

    return y;
}

// ─────────────────────────────────────────────────────────
// Private sub-renderers
// ─────────────────────────────────────────────────────────

function renderStructuredInsights(
    doc: jsPDF,
    y: number,
    insights: NonNullable<InvestigationData["deepAnalysis"]>["insights"],
    contentWidth: number,
    pageWidth: number,
): number {
    y = drawSectionHeader(doc, "Actionable Intelligence", y);

    // Summary line with priority breakdown
    y = checkPageBreak(doc, y, 10);

    const criticalInsights = insights.filter(i => i.priority === "critical").length;
    const highInsights = insights.filter(i => i.priority === "high").length;
    const mediumInsights = insights.filter(i => i.priority === "medium").length;
    const lowInsights = insights.filter(i => i.priority === "low").length;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.body);

    const parts = [`${insights.length} intelligence item(s)`];
    if (criticalInsights > 0) parts.push(`${criticalInsights} critical`);
    if (highInsights > 0) parts.push(`${highInsights} high`);
    if (mediumInsights > 0) parts.push(`${mediumInsights} medium`);
    if (lowInsights > 0) parts.push(`${lowInsights} low`);

    doc.text(parts.join("  •  "), 20, y);
    y += 6;

    // ── Render each insight as a structured card ──
    insights.forEach((insight, index) => {
        y = checkPageBreak(doc, y, 45);

        const priorityColor = severityColor(insight.priority);
        const catColor = categoryColor(insight.category);

        // Card background
        doc.setFillColor(...COLORS.statBg);
        doc.roundedRect(20, y, contentWidth, 6, 2, 2, "F");

        // Priority accent bar
        doc.setFillColor(...priorityColor);
        doc.rect(20, y, 3, 6, "F");

        // Priority badge
        doc.setFillColor(...priorityColor);
        doc.roundedRect(26, y + 1, 18, 4.5, 1, 1, "F");
        doc.setFontSize(5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.white);
        doc.text(insight.priority.toUpperCase(), 28, y + 4);

        // Category badge
        doc.setFillColor(...catColor);
        doc.roundedRect(47, y + 1, 20, 4.5, 1, 1, "F");
        doc.setFontSize(5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.white);
        doc.text(insight.category.toUpperCase(), 49, y + 4);

        // Insight number
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(`#${index + 1}`, pageWidth - 26, y + 4);

        y += 9;

        // ── Insight text ──
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.heading);
        const insightLines = doc.splitTextToSize(insight.insight, contentWidth - 8);
        doc.text(insightLines, 24, y);
        y += insightLines.length * 3.8 + 2;

        // ── Evidence ──
        if (insight.evidence.length > 0) {
            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.muted);
            doc.text("EVIDENCE", 24, y);
            y += 3.5;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(...COLORS.body);
            insight.evidence.forEach((ev) => {
                y = checkPageBreak(doc, y, 5);
                doc.setTextColor(...COLORS.muted);
                doc.text("•", 26, y);
                doc.setTextColor(...COLORS.body);
                const evLines = doc.splitTextToSize(ev, contentWidth - 14);
                doc.text(evLines, 30, y);
                y += evLines.length * 3.2 + 1;
            });
            y += 1;
        }

        // ── Recommendation ──
        y = checkPageBreak(doc, y, 8);
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.muted);
        doc.text("RECOMMENDATION", 24, y);
        y += 3.5;

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.blue);
        doc.text("→", 26, y);
        doc.setFont("helvetica", "normal");
        const recLines = doc.splitTextToSize(insight.recommendation, contentWidth - 14);
        doc.text(recLines, 30, y);
        y += recLines.length * 3.2 + 2;

        // ── Impact ──
        y = checkPageBreak(doc, y, 8);
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.muted);
        doc.text("IMPACT", 24, y);
        y += 3.5;

        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...COLORS.body);
        const impactLines = doc.splitTextToSize(insight.impact, contentWidth - 14);
        doc.text(impactLines, 26, y);
        y += impactLines.length * 3.2 + 2;

        // Card bottom separator
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.2);
        doc.line(24, y, pageWidth - 24, y);
        y += 5;
    });

    y += 2;
    return y;
}

function renderPlainInsights(
    doc: jsPDF,
    y: number,
    insights: string[],
    contentWidth: number,
): number {
    y = drawSectionHeader(doc, "Key Insights", y);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    insights.forEach((insight) => {
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
    return y;
}

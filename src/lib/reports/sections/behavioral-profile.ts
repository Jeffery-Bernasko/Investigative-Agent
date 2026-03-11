import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InvestigationData, COLORS } from "../report-types";
import {
    drawSectionHeader,
    drawStatRow,
    drawBulletList,
    drawSubHeader,
    checkPageBreak,
    activityLevelColor,
    defaultTableStyles,
    defaultHeadStyles,
    lastTableY,
} from "../report-primitives";

/**
 * Renders the Subject Behavioral Profile section:
 * activity badge, footprint badge, profile summary, security posture,
 * engagement patterns, and behavioral flags table.
 * Returns the Y position after the section.
 */
export function renderBehavioralProfile(
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    contentWidth: number,
): number {
    if (!data.deepAnalysis) return y;

    const bp = data.deepAnalysis.behaviorProfile;
    y = drawSectionHeader(doc, "Subject Behavioral Profile", y);

    // ── Activity Level Badge + Profile Summary ──
    y = checkPageBreak(doc, y, 20);

    const activityLabel = bp.activityLevel.replace("_", " ").toUpperCase();
    const activityBadgeColor = activityLevelColor(bp.activityLevel);

    doc.setFillColor(...activityBadgeColor);
    doc.roundedRect(20, y, 44, 10, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(activityLabel, 23, y + 7);

    // Footprint size badge
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(68, y, 40, 10, 2, 2, "F");
    doc.setTextColor(...COLORS.white);
    doc.text(`${bp.digitalFootprint.size.toUpperCase()} FOOTPRINT`, 71, y + 7);

    // Platform count
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.body);
    doc.text(`${bp.digitalFootprint.totalPlatforms} platform(s) detected`, 114, y + 7);
    y += 14;

    // Profile summary paragraph
    y = checkPageBreak(doc, y, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.body);
    const profileSummaryLines = doc.splitTextToSize(bp.profileSummary, contentWidth);
    doc.text(profileSummaryLines, 20, y);
    y += profileSummaryLines.length * 4 + 4;

    // ── Security Posture ──
    y = renderSecurityPosture(doc, y, bp, contentWidth);

    // ── Engagement Patterns ──
    y = renderEngagementPatterns(doc, y, bp, contentWidth);

    // ── Behavioral Flags ──
    y = renderBehavioralFlags(doc, y, bp);

    y += 2;
    return y;
}

// Private sub-renderers
function renderSecurityPosture(
    doc: jsPDF,
    y: number,
    bp: InvestigationData["deepAnalysis"] extends undefined ? never : NonNullable<InvestigationData["deepAnalysis"]>["behaviorProfile"],
    contentWidth: number,
): number {
    y = checkPageBreak(doc, y, 30);

    // Sub-header
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text("Security Posture", 20, y);

    // Security level badge
    const secLevel = bp.securityPosture.level;
    const secColor = secLevel === "strong"
        ? COLORS.green
        : secLevel === "moderate"
            ? COLORS.yellow
            : secLevel === "weak"
                ? COLORS.orange
                : COLORS.red;

    doc.setFillColor(...secColor);
    doc.roundedRect(60, y - 4, 28, 8, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(secLevel.toUpperCase(), 63, y + 1);
    y += 8;

    // Strengths
    if (bp.securityPosture.strengths.length > 0) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.green);
        doc.text("STRENGTHS", 20, y);
        y += 4;
        y = drawBulletList(doc, y, bp.securityPosture.strengths, {
            icon: "+", iconColor: COLORS.green, contentWidth,
        });
    }

    // Weaknesses
    if (bp.securityPosture.weaknesses.length > 0) {
        y = checkPageBreak(doc, y, 8);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.red);
        doc.text("WEAKNESSES", 20, y);
        y += 4;
        y = drawBulletList(doc, y, bp.securityPosture.weaknesses, {
            icon: "−", iconColor: COLORS.red, contentWidth,
        });
    }

    // Security Recommendations
    if (bp.securityPosture.recommendations.length > 0) {
        y = checkPageBreak(doc, y, 8);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.blue);
        doc.text("SECURITY RECOMMENDATIONS", 20, y);
        y += 4;
        y = drawBulletList(doc, y, bp.securityPosture.recommendations, {
            icon: "→", iconColor: COLORS.blue, contentWidth,
        });
    }

    return y;
}

function renderEngagementPatterns(
    doc: jsPDF,
    y: number,
    bp: NonNullable<InvestigationData["deepAnalysis"]>["behaviorProfile"],
    contentWidth: number,
): number {
    y = checkPageBreak(doc, y, 28);
    y = drawSubHeader(doc, "Engagement Patterns", y);

    const eng = bp.engagementPatterns;
    const patternStats = [
        { label: "Platform Diversity", value: `${Math.round(eng.platformDiversity)}%`, color: COLORS.primary },
        { label: "Social", value: `${Math.round(eng.socialPresence)}%`, color: COLORS.primary },
        { label: "Professional", value: `${Math.round(eng.professionalPresence)}%`, color: COLORS.primary },
        { label: "Technical", value: `${Math.round(eng.techPresence)}%`, color: COLORS.primary },
        { label: "Active Hours", value: eng.estimatedActiveHours, color: COLORS.primary },
    ];

    y = drawStatRow(doc, y, patternStats, contentWidth, {
        height: 16,
        valueFontSize: 10,
        labelFontSize: 5.5,
    });

    return y;
}

function renderBehavioralFlags(
    doc: jsPDF,
    y: number,
    bp: NonNullable<InvestigationData["deepAnalysis"]>["behaviorProfile"],
): number {
    if (bp.behavioralFlags.length === 0) return y;

    y = checkPageBreak(doc, y, 14);
    y = drawSubHeader(doc, "Behavioral Flags", y);

    autoTable(doc, {
        startY: y,
        margin: { left: 20, right: 20 },
        head: [["#", "Flag", "Severity", "Description"]],
        body: bp.behavioralFlags.map((f, i) => [
            String(i + 1),
            f.flag,
            f.severity.toUpperCase(),
            f.description,
        ]),
        theme: "grid",
        styles: defaultTableStyles(),
        headStyles: defaultHeadStyles(),
        alternateRowStyles: { fillColor: COLORS.altRow },
        columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 30, fontStyle: "bold" },
            2: { cellWidth: 20, halign: "center" },
            3: { cellWidth: "auto" },
        },
        didParseCell: (hookData: any) => {
            if (hookData.section === "body" && hookData.column.index === 2) {
                const text = hookData.cell.raw as string;
                if (text === "HIGH") hookData.cell.styles.textColor = COLORS.red;
                else if (text === "MEDIUM") hookData.cell.styles.textColor = COLORS.yellow;
                else hookData.cell.styles.textColor = COLORS.green;
            }
        },
    });

    return lastTableY(doc) + 6;
}

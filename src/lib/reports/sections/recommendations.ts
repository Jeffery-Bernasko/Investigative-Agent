import jsPDF from "jspdf";
import { InvestigationData, COLORS } from "../report-types";
import { drawSectionHeader, checkPageBreak } from "../report-primitives";

/**
 * Renders the Recommendations section.
 * Returns the Y position after the section.
 */
export function renderRecommendations(
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    contentWidth: number,
): number {
    if (!data.recommendations || data.recommendations.length === 0) return y;

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

    return y;
}

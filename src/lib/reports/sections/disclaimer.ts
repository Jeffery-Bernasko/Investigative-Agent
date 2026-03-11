import jsPDF from "jspdf";
import { InvestigationData, COLORS } from "../report-types";
import { checkPageBreak, lastTableY } from "../report-primitives";

/**
 * Renders the disclaimer footer text.
 * Returns the Y position after the section.
 */
export function renderDisclaimer(
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    contentWidth: number,
): number {
    // Position after the metadata table
    y = (doc as any).lastAutoTable?.finalY
        ? (doc as any).lastAutoTable.finalY + 10
        : y + 10;

    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "italic");

    let disclaimer = "DISCLAIMER: This report was generated automatically by SEPTO using open-source intelligence (OSINT) techniques. All information was gathered from publicly available sources. This report is intended for authorized security research purposes only. The accuracy of findings depends on the availability and reliability of public data sources.";

    if (data.deepAnalysis) {
        disclaimer += " The deep analysis sections, including behavioral profiling, digital exposure metrics, risk assessments, and actionable intelligence, rely on algorithmic analysis and pattern recognition. These findings should be validated by human analysts before informing operational decisions.";
    }

    const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
    doc.text(disclaimerLines, 20, y);

    return y + disclaimerLines.length * 3.5;
}

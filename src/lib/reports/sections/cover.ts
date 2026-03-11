import jsPDF from "jspdf";
import { InvestigationData, COLORS } from "../report-types";
import { formatDate } from "../report-primitives";

/**
 * Renders the cover page: accent bar, title block, target info box, and meta line.
 * Returns the Y position after the cover section.
 */
export function renderCover(
    doc: jsPDF,
    data: InvestigationData,
    _y: number,
    contentWidth: number,
): number {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Top accent bar
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 4, "F");

    // Title block
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text("SEPTO", 20, 30);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text("Security & Entity Profiling Threat Observatory", 20, 37);

    // Horizontal rule
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(20, 42, pageWidth - 20, 42);

    // Report title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text("Digital Footprint Summary", 20, 55);

    // Target info box
    doc.setFillColor(...COLORS.statBg);
    doc.roundedRect(20, 62, contentWidth, 28, 3, 3, "F");
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(20, 62, contentWidth, 28, 3, 3, "S");

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text("TARGET", 28, 72);
    doc.text("TYPE", 28, 82);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text(data.entity.name, 55, 72);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.body);
    doc.text(data.entity.type.charAt(0).toUpperCase() + data.entity.type.slice(1), 55, 82);

    // Meta line
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Report ID: ${data.investigationId}`, 28, 95);
    doc.text(`Generated: ${formatDate(data.createdAt)}`, pageWidth / 2, 95, { align: "center" });
    doc.text(`Duration: ${data.duration}s`, pageWidth - 28, 95, { align: "right" });
    doc.text(`Status: ${data.status.toUpperCase()}`, 28, 101);

    return 106;
}

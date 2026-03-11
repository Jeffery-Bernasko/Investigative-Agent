import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InvestigationData, COLORS } from "../report-types";
import { drawSectionHeader, lastTableY } from "../report-primitives";

/**
 * Renders the Discovered Relationships table.
 * Returns the Y position after the section.
 */
export function renderRelationships(
    doc: jsPDF,
    data: InvestigationData,
    y: number,
    _contentWidth: number,
): number {
    if (!data.relationships || data.relationships.length === 0) return y;

    y = drawSectionHeader(doc, "Discovered Relationships", y);

    autoTable(doc, {
        startY: y,
        margin: { left: 20, right: 20 },
        head: [["#", "Related Entity", "Relationship", "Strength"]],
        body: data.relationships.slice(0, 20).map((r: any, i: number) => [
            String(i + 1),
            r.targetName || r.target || "Unknown",
            r.type || r.relationType || "associated",
            r.strength !== undefined ? `${r.strength}%` : "-",
        ]),
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.body, lineColor: COLORS.border, lineWidth: 0.2 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: COLORS.altRow },
        columnStyles: { 0: { cellWidth: 10, halign: "center" }, 3: { cellWidth: 22, halign: "center" } },
    });

    return lastTableY(doc) + 6;
}

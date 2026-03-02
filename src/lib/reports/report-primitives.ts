import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COLORS, RGB } from "./report-types";

// Color helpers
export function severityColor(severity: string): RGB {
    switch (severity) {
        case "critical": return COLORS.red;
        case "high": return COLORS.orange;
        case "medium": return COLORS.yellow;
        case "low": return COLORS.green;
        default: return COLORS.muted;
    }
}

export function exposureColor(level: string): RGB {
    switch (level) {
        case "critical": return COLORS.red;
        case "high": return COLORS.orange;
        case "moderate": return COLORS.yellow;
        case "low": return COLORS.green;
        case "minimal": return COLORS.muted;
        default: return COLORS.muted;
    }
}

export function categoryColor(category: string): RGB {
    switch (category) {
        case "security": return COLORS.red;
        case "privacy": return COLORS.blue;
        case "reputation": return COLORS.cyan;
        case "operational": return COLORS.yellow;
        case "strategic": return COLORS.green;
        default: return COLORS.muted;
    }
}

export function riskColor(score: number): RGB {
    if (score >= 7) return COLORS.red;
    if (score >= 4) return COLORS.yellow;
    return COLORS.green;
}

export function riskLabel(score: number): string {
    if (score >= 7) return "HIGH RISK";
    if (score >= 4) return "MEDIUM RISK";
    return "LOW RISK";
}

export function confidenceLabel(c?: string): string {
    if (c === "high") return "HIGH";
    if (c === "medium") return "MEDIUM";
    return "LOW";
}

export function activityLevelColor(level: string): RGB {
    if (level === "very_high") return COLORS.red;
    if (level === "high") return COLORS.orange;
    if (level === "moderate") return COLORS.yellow;
    return COLORS.green;
}

// Date formatting
export function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleString("en-US", {
            year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch {
        return dateStr;
    }
}

export function formatShortDate(ts: string | Date): string {
    try {
        const date = typeof ts === "string" ? new Date(ts) : ts;
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return "—";
    }
}

// Page layout helpers
export function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text("SEPTO — Security & Entity Profiling Threat Observatory", 20, pageHeight - 9);
    doc.text("CONFIDENTIAL", pageWidth / 2, pageHeight - 9, { align: "center" });
    doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - 20, pageHeight - 9, { align: "right" });
}

export function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - 25) {
        doc.addPage();
        return 30;
    }
    return y;
}

// Reusable drawing primitives
/** Draws a colored section header bar with uppercase title. Returns new Y. */
export function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    y = checkPageBreak(doc, y, 18);
    doc.setFillColor(...COLORS.sectionBg);
    doc.roundedRect(20, y, pageWidth - 40, 12, 2, 2, "F");
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(20, y, pageWidth - 40, 12, 2, 2, "S");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text(title.toUpperCase(), 26, y + 8);
    return y + 18;
}

/** Draws a small colored badge (filled rounded rect with white text). */
export function drawBadge(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    color: RGB,
): void {
    doc.setFillColor(...color);
    doc.roundedRect(x, y, width, height, 2, 2, "F");
    doc.setFontSize(Math.min(8, height - 2));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(text, x + 3, y + height - 3);
}

/** Draws a row of stat cards. Returns new Y. */
export function drawStatRow(
    doc: jsPDF,
    y: number,
    stats: Array<{ label: string; value: string; color: RGB }>,
    contentWidth: number,
    opts?: { height?: number; valueFontSize?: number; labelFontSize?: number },
): number {
    const height = opts?.height ?? 18;
    const valueFontSize = opts?.valueFontSize ?? 14;
    const labelFontSize = opts?.labelFontSize ?? 6;
    const statW = contentWidth / stats.length;

    stats.forEach((s, i) => {
        const x = 20 + i * statW;
        doc.setFillColor(...COLORS.statBg);
        doc.roundedRect(x + 1, y, statW - 2, height, 2, 2, "F");
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(x + 1, y, statW - 2, height, 2, 2, "S");

        doc.setFontSize(valueFontSize);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...s.color);
        doc.text(s.value, x + statW / 2, y + height * 0.55, { align: "center" });

        doc.setFontSize(labelFontSize);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(s.label, x + statW / 2, y + height * 0.85, { align: "center" });
    });

    return y + height + 6;
}

/** Draws a bullet list with an icon prefix. Returns new Y. */
export function drawBulletList(
    doc: jsPDF,
    y: number,
    items: string[],
    opts: { icon: string; iconColor: RGB; contentWidth: number },
): number {
    doc.setFont("helvetica", "normal");
    items.forEach((item) => {
        y = checkPageBreak(doc, y, 6);
        doc.setFontSize(7);
        doc.setTextColor(...opts.iconColor);
        doc.text(opts.icon, 22, y);
        doc.setTextColor(...COLORS.body);
        const lines = doc.splitTextToSize(item, opts.contentWidth - 12);
        doc.text(lines, 28, y);
        y += lines.length * 3.5 + 1.5;
    });
    return y + 2;
}

/** Draws a sub-section label (smaller than drawSectionHeader). */
export function drawSubHeader(doc: jsPDF, title: string, y: number): number {
    y = checkPageBreak(doc, y, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.heading);
    doc.text(title, 20, y);
    return y + 6;
}

// Shared autoTable configuration
export function defaultTableStyles() {
    return {
        fontSize: 7,
        cellPadding: 2.5,
        textColor: COLORS.body as RGB,
        lineColor: COLORS.border as RGB,
        lineWidth: 0.2,
    };
}

export function defaultHeadStyles() {
    return {
        fillColor: COLORS.primary as RGB,
        textColor: COLORS.white as RGB,
        fontStyle: "bold" as const,
        fontSize: 7,
    };
}

/** Reusable didParseCell hook that colors a specific column based on severity text. */
export function colorSeverityCell(colIndex: number) {
    return (hookData: any) => {
        if (hookData.section === "body" && hookData.column.index === colIndex) {
            const text = hookData.cell.raw as string;
            if (text === "CRITICAL") {
                hookData.cell.styles.textColor = COLORS.red;
                hookData.cell.styles.fontStyle = "bold";
            } else if (text === "HIGH") {
                hookData.cell.styles.textColor = COLORS.orange;
                hookData.cell.styles.fontStyle = "bold";
            } else if (text === "MEDIUM") {
                hookData.cell.styles.textColor = COLORS.yellow;
            } else if (text === "LOW") {
                hookData.cell.styles.textColor = COLORS.green;
            } else {
                hookData.cell.styles.textColor = COLORS.muted;
            }
        }
    };
}

/** Returns the finalY from the last autoTable call. */
export function lastTableY(doc: jsPDF): number {
    return (doc as any).lastAutoTable.finalY;
}

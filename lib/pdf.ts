import PDFDocument from "pdfkit";
import type { ResearchResult } from "./types";

const COLORS = {
  dark: "#111319",
  brand: "#2dd4bf",
  brandDark: "#0f766e",
  text: "#1a1d24",
  muted: "#6b7280",
  body: "#374151",
  border: "#dfe3e8",
  link: "#1d4ed8",
};

const PAGE_MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 in points

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.brandDark)
    .text(title.toUpperCase(), { characterSpacing: 0.6 });
  const y = doc.y + 3;
  doc
    .moveTo(PAGE_MARGIN, y)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, y)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.7);
  doc.x = PAGE_MARGIN;
}

function bulletList(doc: PDFKit.PDFDocument, items: string[]) {
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.body);
  for (const item of items) {
    doc.text(`•  ${item}`, PAGE_MARGIN, doc.y, {
      width: PAGE_WIDTH - PAGE_MARGIN * 2,
      lineGap: 3,
    });
    doc.moveDown(0.15);
  }
  doc.x = PAGE_MARGIN;
}

function ensureUrl(url: string): string {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function renderHeader(doc: PDFKit.PDFDocument, data: ResearchResult) {
  doc.rect(0, 0, PAGE_WIDTH, 96).fill(COLORS.dark);
  doc
    .fillColor(COLORS.brand)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("AI RESEARCH ASSISTANT  ·  COMPANY REPORT", PAGE_MARGIN, 28, { characterSpacing: 1 });
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text(data.companyName, PAGE_MARGIN, 46, { width: PAGE_WIDTH - PAGE_MARGIN * 2 });

  doc.x = PAGE_MARGIN;
  doc.y = 118;
}

function renderCompanyInfo(doc: PDFKit.PDFDocument, data: ResearchResult) {
  sectionTitle(doc, "Company Information");

  const colWidth = (PAGE_WIDTH - PAGE_MARGIN * 2) / 2;
  const startY = doc.y;

  doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text("WEBSITE", PAGE_MARGIN, startY);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.link)
    .text(data.website, PAGE_MARGIN, doc.y + 2, {
      width: colWidth - 10,
      link: ensureUrl(data.website),
      underline: false,
    });

  const rightX = PAGE_MARGIN + colWidth;
  doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text("PHONE", rightX, startY);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(data.phone || "Not publicly listed", rightX, doc.y + 2, { width: colWidth - 10 });

  doc.x = PAGE_MARGIN;
  doc.moveDown(1.1);
  doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text("ADDRESS", PAGE_MARGIN, doc.y);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(data.address || "Not publicly listed", PAGE_MARGIN, doc.y + 2, {
      width: PAGE_WIDTH - PAGE_MARGIN * 2,
    });
  doc.x = PAGE_MARGIN;
}

function renderSummary(doc: PDFKit.PDFDocument, data: ResearchResult) {
  sectionTitle(doc, "Company Summary");
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.body)
    .text(data.summary, PAGE_MARGIN, doc.y, {
      width: PAGE_WIDTH - PAGE_MARGIN * 2,
      lineGap: 3,
    });
  doc.x = PAGE_MARGIN;
}

function renderProducts(doc: PDFKit.PDFDocument, data: ResearchResult) {
  sectionTitle(doc, "Products & Services");
  if (data.products.length) {
    bulletList(doc, data.products);
  } else {
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.body).text("No products/services identified.");
  }
}

function renderPainPoints(doc: PDFKit.PDFDocument, data: ResearchResult) {
  sectionTitle(doc, "AI-Generated Pain Points");
  if (data.painPoints.length) {
    bulletList(doc, data.painPoints);
  } else {
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.body).text("No pain points identified.");
  }
}

function renderCompetitors(doc: PDFKit.PDFDocument, data: ResearchResult) {
  sectionTitle(doc, "Competitors");
  if (!data.competitors.length) {
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.body).text("No competitors identified.");
    return;
  }

  const rowHeight = 26;
  const tableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const nameWidth = tableWidth * 0.4;

  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.muted);
  const headerY = doc.y;
  doc.text("COMPANY NAME", PAGE_MARGIN + 6, headerY + 6, { width: nameWidth });
  doc.text("WEBSITE", PAGE_MARGIN + nameWidth + 6, headerY + 6, { width: tableWidth - nameWidth - 12 });
  doc
    .rect(PAGE_MARGIN, headerY, tableWidth, rowHeight - 4)
    .fillOpacity(1)
    .strokeColor(COLORS.border)
    .stroke();
  doc.y = headerY + rowHeight - 4;

  for (const c of data.competitors) {
    if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
      doc.y = PAGE_MARGIN;
    }
    const rowY = doc.y;
    doc
      .moveTo(PAGE_MARGIN, rowY)
      .lineTo(PAGE_WIDTH - PAGE_MARGIN, rowY)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();
    doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.text).text(c.name, PAGE_MARGIN + 6, rowY + 7, {
      width: nameWidth - 10,
    });
    if (c.website) {
      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor(COLORS.link)
        .text(c.website, PAGE_MARGIN + nameWidth + 6, rowY + 7, {
          width: tableWidth - nameWidth - 12,
          link: ensureUrl(c.website),
        });
    }
    doc.y = rowY + rowHeight;
  }
  doc.x = PAGE_MARGIN;
}

function renderFooters(doc: PDFKit.PDFDocument, data: ResearchResult) {
  const range = doc.bufferedPageRange();
  const generatedDate = new Date(data.generatedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Draw comfortably inside the bottom margin boundary so pdfkit doesn't
    // interpret this as overflowing content and silently append extra pages.
    const bottom = doc.page.height - PAGE_MARGIN - 18;
    doc
      .moveTo(PAGE_MARGIN, bottom)
      .lineTo(PAGE_WIDTH - PAGE_MARGIN, bottom)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`Generated by AI Research Assistant - ${generatedDate}`, PAGE_MARGIN, bottom + 6, {
        width: 300,
        lineBreak: false,
      });
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, PAGE_WIDTH - PAGE_MARGIN - 150, bottom + 6, {
      width: 150,
      align: "right",
      lineBreak: false,
    });
  }
}

export async function generateResearchPdf(data: ResearchResult): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      renderHeader(doc, data);
      renderCompanyInfo(doc, data);
      if (data.summary) renderSummary(doc, data);
      renderProducts(doc, data);
      renderPainPoints(doc, data);
      renderCompetitors(doc, data);
      renderFooters(doc, data);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

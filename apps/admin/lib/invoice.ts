import PDFDocument from "pdfkit";
import { Writable } from "stream";

interface InvoiceData {
  invoiceNumber: string;
  orderRef: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAddress: string;
  customerPincode: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  amount: number;
  gstAmount: number;
}

function drawInvoice(doc: typeof PDFDocument.prototype, d: InvoiceData, x: number, y: number, w: number, h: number) {
  const black = "#000000";
  const gray = "#666666";
  const lightGray = "#999999";
  const margin = 8;
  const innerW = w - margin * 2;

  doc.fontSize(7).font("Helvetica-Bold").fillColor(black).text("Invoice", x + margin, y + margin);
  doc.fontSize(6).fillColor(gray).text(`${d.invoiceNumber}`, x + margin, y + margin + 10);
  doc.fontSize(5.5).fillColor(gray).text(d.date, x + margin, y + margin + 18);

  doc.fontSize(5).fillColor(lightGray).text("BILL TO", x + margin, y + margin + 30);
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(black).text(d.customerName, x + margin, y + margin + 38);
  doc.font("Helvetica").fontSize(5.5).fillColor(gray).text(
    `${d.customerAddress} ${d.customerPincode}`,
    x + margin, y + margin + 48, { width: innerW - 60 }
  );
  doc.text(d.customerPhone, x + margin, doc.y + 6);
  if (d.customerEmail) doc.text(d.customerEmail, x + margin, doc.y + 6);

  doc.fontSize(5).fillColor(lightGray).text("FROM", x + margin, y + margin + 30);
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(black).text("Gray Cup Enterprises", x + w - margin - 90, y + margin + 30);
  doc.font("Helvetica").fontSize(5.5).fillColor(gray).text("FF122, Rodeo Drive Mall, GT Road, TDI City, Kundli, Sonipat, Haryana 131030", x + w - margin - 90, y + margin + 40, { width: 90 });
  doc.text("GSTIN: 06AAMCG4985H1Z4", x + w - margin - 90, doc.y + 5);
  doc.text("office@graycup.org", x + w - margin - 90, doc.y + 5);

  const tableY = y + margin + 78;
  doc.moveTo(x + margin, tableY).lineTo(x + w - margin, tableY).strokeColor(lightGray).lineWidth(0.3).stroke();
  doc.fontSize(5).fillColor(lightGray).text("Item", x + margin, tableY + 3);
  doc.text("Pack", x + margin + innerW * 0.45, tableY + 3);
  doc.text("Qty", x + margin + innerW * 0.7, tableY + 3, { align: "center" });
  doc.text("Amount", x + w - margin, tableY + 3, { align: "right", width: 40 });

  const rowY = tableY + 12;
  doc.fontSize(6).font("Helvetica").fillColor(black).text(d.productName, x + margin, rowY, { width: innerW * 0.44 });
  doc.text(d.variantLabel, x + margin + innerW * 0.45, rowY);
  doc.text(String(d.quantity), x + margin + innerW * 0.7, rowY, { align: "center" });
  doc.text(`₹${d.amount}`, x + w - margin, rowY, { align: "right", width: 40 });

  const subtotal = d.amount - d.gstAmount;
  const totalsY = rowY + 14;
  doc.moveTo(x + margin, totalsY).lineTo(x + w - margin, totalsY).strokeColor(lightGray).lineWidth(0.3).stroke();
  doc.fontSize(5.5).fillColor(gray).text("Subtotal", x + margin + innerW * 0.5, totalsY + 4).text(`₹${subtotal}`, x + w - margin, totalsY + 4, { align: "right", width: 40 });
  doc.text("GST 5%", x + margin + innerW * 0.5, totalsY + 13).text(`₹${d.gstAmount}`, x + w - margin, totalsY + 13, { align: "right", width: 40 });
  doc.moveTo(x + margin + innerW * 0.5, totalsY + 20).lineTo(x + w - margin, totalsY + 20).strokeColor(black).lineWidth(0.5).stroke();
  doc.fontSize(7).font("Helvetica-Bold").fillColor(black).text("Total", x + margin + innerW * 0.5, totalsY + 24).text(`₹${d.amount}`, x + w - margin, totalsY + 24, { align: "right", width: 40 });

  doc.fontSize(4.5).fillColor(lightGray).text(`${d.orderRef}`, x + margin, totalsY + 34);
}

export async function generateMultiInvoicePdf(invoices: InvoiceData[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 20, size: "A4" });
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _enc, cb) { chunks.push(chunk); cb(); }
    });
    writable.on("finish", () => resolve(Buffer.concat(chunks)));
    writable.on("error", reject);
    doc.pipe(writable);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 20;
    const footerH = 30;
    const contentH = pageH - margin * 2 - footerH;

    const cols = 2;
    const rows = 2;
    const gapX = 14;
    const gapY = 14;
    const availW = pageW - margin * 2;
    const availH = contentH;
    const boxW = (availW - gapX * (cols - 1)) / cols;
    const boxH = (availH - gapY * (rows - 1)) / rows;

    for (let i = 0; i < invoices.length; i += cols * rows) {
      if (i > 0) doc.addPage();

      const batch = invoices.slice(i, i + cols * rows);
      for (let j = 0; j < batch.length; j++) {
        const col = j % cols;
        const row = Math.floor(j / cols);
        const x = margin + col * (boxW + gapX);
        const y = margin + row * (boxH + gapY);
        drawInvoice(doc, batch[j], x, y, boxW, boxH);
      }

      doc.fontSize(7).fillColor("#999999").text(
        "Gray Cup Enterprises  ·  GSTIN: 06AAMCG4985H1Z4  ·  office@graycup.org",
        margin, pageH - margin - 10, { align: "center", width: pageW - margin * 2 }
      );
    }

    doc.end();
  });
}

export async function generateGstSummaryPdf(invoices: InvoiceData[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _enc, cb) { chunks.push(chunk); cb(); }
    });
    writable.on("finish", () => resolve(Buffer.concat(chunks)));
    writable.on("error", reject);
    doc.pipe(writable);

    const black = "#000000";
    const gray = "#666666";
    const lightGray = "#aaaaaa";

    doc.fontSize(18).font("Helvetica-Bold").fillColor(black).text("GST Summary", 40, 40);
    doc.fontSize(9).fillColor(gray).text(`Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`, 40, 64);

    const totalBase = invoices.reduce((s, d) => s + (d.amount - d.gstAmount), 0);
    const totalGst = invoices.reduce((s, d) => s + d.gstAmount, 0);
    const totalAmount = invoices.reduce((s, d) => s + d.amount, 0);

    doc.fontSize(10).fillColor(gray).text("Summary", 40, 90);
    doc.fontSize(9).font("Helvetica-Bold").fillColor(black).text("Particulars", 40, 108);
    doc.fontSize(9).fillColor(black).text("Taxable Value (Base)", 40, 122).text("CGST @ 2.5%", 40, 134).text("SGST @ 2.5%", 40, 146);
    doc.font("Helvetica-Bold").text("Total", 40, 160);
    doc.font("Helvetica").fillColor(gray).text("Amount", 420, 108).text("Amount", 420, 122).text("Amount", 420, 134).text("Amount", 420, 146).text("Amount", 420, 160);
    doc.font("Helvetica-Bold").fillColor(black)
      .text(`₹${totalBase}`, 480, 108, { align: "right", width: 60 })
      .text(`₹${(totalGst / 2).toFixed(0)}`, 480, 122, { align: "right", width: 60 })
      .text(`₹${(totalGst / 2).toFixed(0)}`, 480, 134, { align: "right", width: 60 })
      .text(`₹${totalAmount}`, 480, 160, { align: "right", width: 60 });

    doc.moveTo(40, 178).lineTo(540, 178).strokeColor(lightGray).lineWidth(0.5).stroke();

    const startY = 195;
    doc.fontSize(7.5).fillColor(lightGray).text("Invoice #", 40, startY);
    doc.text("Order Ref", 40 + 80, startY);
    doc.text("Customer", 40 + 170, startY);
    doc.text("Base Amount", 40 + 340, startY, { align: "right" });
    doc.text("GST 5%", 40 + 420, startY, { align: "right" });
    doc.text("Total", 540, startY, { align: "right", width: 60 });

    doc.moveTo(40, startY + 8).lineTo(540, startY + 8).strokeColor(lightGray).lineWidth(0.3).stroke();

    let y = startY + 16;
    for (const d of invoices) {
      doc.font("Helvetica").fillColor(black)
        .text(d.invoiceNumber, 40, y)
        .text(d.orderRef, 40 + 80, y)
        .text(d.customerName, 40 + 170, y, { width: 160 })
        .text(`₹${d.amount - d.gstAmount}`, 40 + 340, y, { align: "right" })
        .text(`₹${d.gstAmount}`, 40 + 420, y, { align: "right" })
        .text(`₹${d.amount}`, 540, y, { align: "right", width: 60 });
      y += 14;
    }

    doc.fontSize(8).fillColor(lightGray).text("Gray Cup Enterprises  ·  GSTIN: 06AAMCG4985H1Z4  ·  office@graycup.org", 40, doc.page.height - 40, { align: "center" });

    doc.end();
  });
}

export function formatInvoiceNumber(n: number): string {
  return `GCFINV-${String(n).padStart(4, "0")}`;
}

export interface ShippingLabelData {
  orderRef: string;
  waybill: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerPincode: string;
  productDesc: string;
  amount: number;
}

function drawShippingLabel(doc: typeof PDFDocument.prototype, d: ShippingLabelData, x: number, y: number, w: number, h: number) {
  const black = "#000000";
  const gray = "#555555";
  const light = "#999999";
  const pad = 12;

  // Border
  doc.rect(x, y, w, h).strokeColor("#cccccc").lineWidth(0.5).stroke();

  // FROM block — fixed height 40
  const fromH = 40;
  doc.rect(x, y, w, fromH).fillColor("#f5f5f5").fill();
  doc.rect(x, y, w, fromH).strokeColor("#cccccc").lineWidth(0.5).stroke();
  doc.fontSize(6).font("Helvetica").fillColor(light).text("FROM", x + pad, y + 7, { lineBreak: false });
  doc.fontSize(8).font("Helvetica-Bold").fillColor(black).text("Gray Cup Enterprises", x + pad, y + 16, { lineBreak: false });
  doc.fontSize(6).font("Helvetica").fillColor(gray).text("FF122 Rodeo Drive Mall, GT Road, Kundli, Sonipat, Haryana 131030", x + pad, y + 27, { width: w - pad * 2, lineBreak: false });

  // SHIP TO
  const shipToY = y + fromH + 7;
  doc.fontSize(6).font("Helvetica").fillColor(light).text("SHIP TO", x + pad, shipToY, { lineBreak: false });

  const nameY = shipToY + 10;
  doc.fontSize(13).font("Helvetica-Bold").fillColor(black).text(d.customerName.toUpperCase(), x + pad, nameY, { width: w - pad * 2, lineBreak: false });

  const addrY = nameY + 20;
  doc.fontSize(7.5).font("Helvetica").fillColor(gray).text(d.customerAddress, x + pad, addrY, { width: w - pad * 2, lineBreak: false });

  const pincodeY = addrY + 22;
  doc.fontSize(15).font("Helvetica-Bold").fillColor(black).text(d.customerPincode, x + pad, pincodeY, { lineBreak: false });

  const phoneY = pincodeY + 22;
  doc.fontSize(8).font("Helvetica").fillColor(gray).text(`Phone: ${d.customerPhone}`, x + pad, phoneY, { lineBreak: false });

  // Divider
  const divY = phoneY + 16;
  doc.moveTo(x + pad, divY).lineTo(x + w - pad, divY).strokeColor("#dddddd").lineWidth(0.4).stroke();

  // Order info block
  const infoY = divY + 8;
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(black).text(`ORDER: ${d.orderRef}`, x + pad, infoY, { lineBreak: false });
  doc.fontSize(9).font("Helvetica-Bold").fillColor(black).text(`AWB: ${d.waybill}`, x + pad, infoY + 12, { lineBreak: false });
  doc.fontSize(6.5).font("Helvetica").fillColor(gray).text(d.productDesc, x + pad, infoY + 26, { width: w - pad * 2, lineBreak: false });
  doc.fontSize(6.5).fillColor(light).text(`₹${d.amount}  •  Surface  •  Prepaid`, x + pad, infoY + 38, { lineBreak: false });
}

export async function generateShippingLabelPdf(labels: ShippingLabelData[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _enc, cb) { chunks.push(chunk); cb(); }
    });
    writable.on("finish", () => resolve(Buffer.concat(chunks)));
    writable.on("error", reject);
    doc.pipe(writable);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 20;
    const gap = 10;
    const cols = 2;
    const rows = 2;
    const labelW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
    const labelH = (pageH - margin * 2 - gap * (rows - 1)) / rows;

    for (let i = 0; i < labels.length; i += cols * rows) {
      if (i > 0) doc.addPage();
      const batch = labels.slice(i, i + cols * rows);
      for (let j = 0; j < batch.length; j++) {
        const col = j % cols;
        const row = Math.floor(j / cols);
        const x = margin + col * (labelW + gap);
        const y = margin + row * (labelH + gap);
        drawShippingLabel(doc, batch[j], x, y, labelW, labelH);
      }
    }

    doc.end();
  });
}

export async function generateInvoicePdf(d: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _enc, cb) { chunks.push(chunk); cb(); }
    });
    writable.on("finish", () => resolve(Buffer.concat(chunks)));
    writable.on("error", reject);
    doc.pipe(writable);

    const black = "#000000";
    const gray = "#666666";
    const lightGray = "#999999";
    const startX = 50;
    const endX = doc.page.width - 50;

    doc.fontSize(20).font("Helvetica-Bold").fillColor(black).text("Invoice", startX, doc.y);
    doc.fontSize(10).fillColor(gray).text(`Invoice #: ${d.invoiceNumber}`, startX, doc.y + 22);
    doc.fontSize(10).fillColor(gray).text(`Order: ${d.orderRef}`, startX, doc.y + 36);
    doc.fontSize(10).fillColor(gray).text(d.date, startX, doc.y + 50);

    let y = doc.y + 20;
    doc.fontSize(9).fillColor(lightGray).text("BILL TO", startX, y);
    doc.fontSize(11).font("Helvetica-Bold").fillColor(black).text(d.customerName, startX, y + 14);
    doc.font("Helvetica").fontSize(10).fillColor(gray).text(d.customerAddress + " " + d.customerPincode, startX, y + 28);
    doc.text(d.customerPhone, startX, doc.y + 14);
    if (d.customerEmail) doc.text(d.customerEmail, startX, doc.y + 14);

    y = doc.y + 10;
    doc.fontSize(9).fillColor(lightGray).text("FROM", startX, y);
    doc.fontSize(11).font("Helvetica-Bold").fillColor(black).text("Gray Cup Enterprises", startX, y + 14);
    doc.font("Helvetica").fontSize(10).fillColor(gray).text("FF122, Rodeo Drive Mall, GT Road, TDI City, Kundli, Sonipat, Haryana 131030", startX, y + 28, { width: 260 });
    doc.text("GSTIN: 06AAMCG4985H1Z4", startX, doc.y + 14);
    doc.text("office@graycup.org", startX, doc.y + 14);

    y = doc.y + 20;
    doc.moveTo(startX, y).lineTo(endX, y).strokeColor(lightGray).lineWidth(0.5).stroke();

    y += 12;
    doc.fontSize(9).fillColor(lightGray).text("ITEM", startX, y);
    doc.text("PACK", startX + 240, y);
    doc.text("QTY", startX + 340, y, { align: "center" });
    doc.text("AMOUNT", endX, y, { align: "right", width: 80 });

    y += 16;
    doc.fontSize(11).font("Helvetica").fillColor(black).text(d.productName, startX, y);
    doc.text(d.variantLabel, startX + 240, y);
    doc.text(String(d.quantity), startX + 340, y, { align: "center" });
    doc.text(`₹${d.amount}`, endX, y, { align: "right", width: 80 });

    y += 20;
    doc.moveTo(startX, y).lineTo(endX, y).strokeColor(lightGray).lineWidth(0.5).stroke();

    y += 12;
    const totX = endX - 200;
    doc.fontSize(10).fillColor(gray).text("Subtotal", totX, y, { width: 120 }).text(`₹${d.amount - d.gstAmount}`, endX, y, { align: "right", width: 80 });
    doc.text("GST 5%", totX, y + 16, { width: 120 }).text(`₹${d.gstAmount}`, endX, y + 16, { align: "right", width: 80 });
    doc.moveTo(totX, y + 30).lineTo(endX, y + 30).strokeColor(black).lineWidth(1).stroke();
    doc.fontSize(12).font("Helvetica-Bold").fillColor(black).text("Total", totX, y + 38, { width: 120 }).text(`₹${d.amount}`, endX, y + 38, { align: "right", width: 80 });

    doc.fontSize(9).fillColor(lightGray).text("Thank you for your order. This is a computer-generated invoice.", startX, doc.y + 30, { align: "center" });

    doc.end();
  });
}
import PDFDocument from "pdfkit";
import { Writable } from "stream";

interface InvoiceData {
  orderNumber?: number;
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
  awb?: string | null;
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
    if (d.orderNumber) {
      doc.fontSize(10).fillColor(gray).text(`Order #${d.orderNumber}`, startX, doc.y + 22);
      doc.fontSize(10).fillColor(gray).text(`Invoice #: ${d.invoiceNumber}`, startX, doc.y + 36);
      doc.fontSize(10).fillColor(gray).text(`Ref: ${d.orderRef}`, startX, doc.y + 50);
      doc.fontSize(10).fillColor(gray).text(d.date, startX, doc.y + 64);
    } else {
      doc.fontSize(10).fillColor(gray).text(`Invoice #: ${d.invoiceNumber}`, startX, doc.y + 22);
      doc.fontSize(10).fillColor(gray).text(`Order: ${d.orderRef}`, startX, doc.y + 36);
      doc.fontSize(10).fillColor(gray).text(d.date, startX, doc.y + 50);
    }

    if (d.awb) {
      doc.fontSize(10).fillColor(gray).text(`AWB: ${d.awb}`, startX, doc.y + 14);
    }

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
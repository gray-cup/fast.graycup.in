import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export interface ManualInvoiceData {
  invoiceNumber: string;
  date: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string | null;
  buyerAddress: string;
  buyerPincode: string;
  itemDescription: string;
  itemVariant?: string | null;
  quantity: number;
  amount: number;
  gstAmount: number;
  upiTransactionId: string;
  upiScreenshotDataUri?: string | null;
}

const c = {
  black: "#000000",
  dark: "#1a1a1a",
  gray: "#555555",
  muted: "#888888",
  border: "#e0e0e0",
  bg: "#f7f7f7",
  upi: "#1a73e8",
  upiBg: "#f0f7ff",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: c.dark, padding: 44 },

  header: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 16, borderBottom: `1 solid ${c.border}`, marginBottom: 20 },
  company: { fontSize: 14, fontFamily: "Helvetica-Bold", color: c.black, marginBottom: 4 },
  addr: { fontSize: 7.5, color: c.gray, marginBottom: 1.5 },
  hRight: { alignItems: "flex-end" },
  manualLabel: { fontSize: 6.5, color: "#c05000", letterSpacing: 1, marginBottom: 3 },
  invNum: { fontSize: 12, fontFamily: "Helvetica-Bold", color: c.black, marginBottom: 2 },
  invSmall: { fontSize: 7.5, color: c.gray, marginBottom: 1 },

  secLabel: { fontSize: 6.5, color: c.muted, letterSpacing: 1, marginBottom: 5 },
  billBox: { backgroundColor: c.bg, padding: 10, borderRadius: 3, marginBottom: 20 },
  custName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: c.black, marginBottom: 3 },
  custDetail: { fontSize: 8, color: c.gray, marginBottom: 1.5 },

  tHead: { flexDirection: "row", backgroundColor: c.bg, padding: "5 8", borderTop: `1 solid ${c.border}`, borderBottom: `1 solid ${c.border}` },
  tRow: { flexDirection: "row", padding: "6 8", borderBottom: `1 solid #f0f0f0` },
  thCell: { fontSize: 6.5, color: c.muted },
  tdCell: { fontSize: 8.5, color: c.dark },
  c1: { flex: 3 }, c2: { flex: 1.5 }, c3: { flex: 1, textAlign: "center" }, c4: { flex: 1.5, textAlign: "right" },

  totals: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4, marginBottom: 20 },
  totBox: { width: 190 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totLabel: { fontSize: 8, color: c.gray },
  totVal: { fontSize: 8, color: c.dark },
  divider: { borderTop: `1 solid ${c.dark}`, marginVertical: 4 },
  totFinal: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: c.black },

  upiSection: { backgroundColor: c.upiBg, padding: 12, borderRadius: 3, marginBottom: 16 },
  upiLabel: { fontSize: 6.5, color: c.upi, letterSpacing: 1, marginBottom: 5 },
  upiTxnId: { fontSize: 12, fontFamily: "Helvetica-Bold", color: c.upi, marginBottom: 3 },
  upiSmall: { fontSize: 7.5, color: c.gray },
  screenshot: { width: 160, height: 200, objectFit: "contain", marginTop: 10, borderRadius: 3, alignSelf: "flex-start" },

  footer: { position: "absolute", bottom: 28, left: 44, right: 44, textAlign: "center", fontSize: 7, color: c.muted, borderTop: `1 solid ${c.border}`, paddingTop: 7 },
});

export function ManualInvoicePdf({ data }: { data: ManualInvoiceData }) {
  const subtotal = data.amount;
  const gst = data.gstAmount;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.company}>Gray Cup Enterprises</Text>
            <Text style={s.addr}>FF122, Rodeo Drive Mall, GT Road, TDI City</Text>
            <Text style={s.addr}>Kundli, Sonipat, Haryana — 131030</Text>
            <Text style={s.addr}>GSTIN: 06AAMCG4985H1Z4  ·  office@graycup.org</Text>
          </View>
          <View style={s.hRight}>
            <Text style={s.manualLabel}>MANUAL TAX INVOICE</Text>
            <Text style={s.invNum}>{data.invoiceNumber}</Text>
            <Text style={s.invSmall}>{data.date}</Text>
          </View>
        </View>

        <Text style={s.secLabel}>BILL TO</Text>
        <View style={s.billBox}>
          <Text style={s.custName}>{data.buyerName}</Text>
          <Text style={s.custDetail}>{data.buyerAddress}</Text>
          <Text style={s.custDetail}>Pincode: {data.buyerPincode}</Text>
          <Text style={s.custDetail}>{data.buyerPhone}</Text>
          {data.buyerEmail ? <Text style={s.custDetail}>{data.buyerEmail}</Text> : null}
        </View>

        <Text style={s.secLabel}>ITEMS</Text>
        <View style={s.tHead}>
          <Text style={[s.thCell, s.c1]}>Description</Text>
          <Text style={[s.thCell, s.c2]}>Pack</Text>
          <Text style={[s.thCell, s.c3]}>Qty</Text>
          <Text style={[s.thCell, s.c4]}>Amount</Text>
        </View>
        <View style={s.tRow}>
          <Text style={[s.tdCell, s.c1]}>{data.itemDescription}</Text>
          <Text style={[s.tdCell, s.c2]}>{data.itemVariant || "—"}</Text>
          <Text style={[s.tdCell, s.c3]}>{data.quantity}</Text>
          <Text style={[s.tdCell, s.c4]}>Rs. {subtotal}</Text>
        </View>

        <View style={s.totals}>
          <View style={s.totBox}>
            <View style={s.totRow}>
              <Text style={s.totLabel}>Taxable Value (GST Inclusive)</Text>
              <Text style={s.totVal}>Rs. {subtotal}</Text>
            </View>
            <View style={s.totRow}>
              <Text style={s.totLabel}>GST @ 5%</Text>
              <Text style={s.totVal}>Rs. {gst}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.totRow}>
              <Text style={s.totFinal}>Total</Text>
              <Text style={s.totFinal}>Rs. {data.amount}</Text>
            </View>
          </View>
        </View>

        <Text style={s.secLabel}>PAYMENT</Text>
        <View style={s.upiSection}>
          <Text style={s.upiLabel}>UPI TRANSACTION ID</Text>
          <Text style={s.upiTxnId}>{data.upiTransactionId}</Text>
          <Text style={s.upiSmall}>Paid via UPI · {data.date}</Text>
          {data.upiScreenshotDataUri ? (
            <Image style={s.screenshot} src={data.upiScreenshotDataUri} />
          ) : null}
        </View>

        <Text style={s.footer}>
          Manual invoice · Gray Cup Enterprises · GSTIN: 06AAMCG4985H1Z4
        </Text>
      </Page>
    </Document>
  );
}

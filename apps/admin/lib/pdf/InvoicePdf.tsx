import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const c = {
  black: "#000000",
  dark: "#1a1a1a",
  gray: "#555555",
  muted: "#888888",
  border: "#e0e0e0",
  bg: "#f7f7f7",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: c.dark, padding: 44 },

  header: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 16, borderBottom: `1 solid ${c.border}`, marginBottom: 20 },
  company: { fontSize: 14, fontFamily: "Helvetica-Bold", color: c.black, marginBottom: 4 },
  addr: { fontSize: 7.5, color: c.gray, marginBottom: 1.5 },
  hRight: { alignItems: "flex-end" },
  taxLabel: { fontSize: 6.5, color: c.muted, letterSpacing: 1, marginBottom: 3 },
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
  totFinalLabel: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: c.black },
  totFinalVal: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: c.black },

  footer: { position: "absolute", bottom: 28, left: 44, right: 44, textAlign: "center", fontSize: 7, color: c.muted, borderTop: `1 solid ${c.border}`, paddingTop: 7 },
});

export interface InvoiceData {
  orderNumber: number;
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
  batchId?: string | null;
}

export function InvoicePdf({ data }: { data: InvoiceData }) {
  const subtotal = data.amount - data.gstAmount;
  const cgst = Math.round(data.gstAmount / 2);
  const sgst = data.gstAmount - cgst;

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
            <Text style={s.taxLabel}>TAX INVOICE</Text>
            <Text style={s.invNum}>{data.invoiceNumber}</Text>
            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: c.dark, marginBottom: 2 }}>Order #{data.orderNumber}</Text>
            <Text style={s.invSmall}>{data.orderRef}</Text>
            <Text style={s.invSmall}>{data.date}</Text>
          </View>
        </View>

        <Text style={s.secLabel}>BILL TO</Text>
        <View style={s.billBox}>
          <Text style={s.custName}>{data.customerName}</Text>
          <Text style={s.custDetail}>{data.customerAddress}</Text>
          <Text style={s.custDetail}>Pincode: {data.customerPincode}</Text>
          <Text style={s.custDetail}>{data.customerPhone}</Text>
          {data.customerEmail ? <Text style={s.custDetail}>{data.customerEmail}</Text> : null}
        </View>

        <Text style={s.secLabel}>ITEMS</Text>
        <View style={s.tHead}>
          <Text style={[s.thCell, s.c1]}>Description</Text>
          <Text style={[s.thCell, s.c2]}>Pack</Text>
          <Text style={[s.thCell, s.c3]}>Qty</Text>
          <Text style={[s.thCell, s.c4]}>Amount</Text>
        </View>
        <View style={s.tRow}>
          <Text style={[s.tdCell, s.c1]}>{data.productName}{data.batchId ? ` · Batch ${data.batchId}` : ""}</Text>
          <Text style={[s.tdCell, s.c2]}>{data.variantLabel}</Text>
          <Text style={[s.tdCell, s.c3]}>{data.quantity}</Text>
          <Text style={[s.tdCell, s.c4]}>Rs. {subtotal}</Text>
        </View>

        <View style={s.totals}>
          <View style={s.totBox}>
            <View style={s.totRow}>
              <Text style={s.totLabel}>Taxable Value</Text>
              <Text style={s.totVal}>Rs. {subtotal}</Text>
            </View>
            <View style={s.totRow}>
              <Text style={s.totLabel}>CGST @ 2.5%</Text>
              <Text style={s.totVal}>Rs. {cgst}</Text>
            </View>
            <View style={s.totRow}>
              <Text style={s.totLabel}>SGST @ 2.5%</Text>
              <Text style={s.totVal}>Rs. {sgst}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.totRow}>
              <Text style={s.totFinalLabel}>Total</Text>
              <Text style={s.totFinalVal}>Rs. {data.amount}</Text>
            </View>
          </View>
        </View>

        <Text style={s.footer}>
          Computer-generated invoice · Gray Cup Enterprises · GSTIN: 06AAMCG4985H1Z4
        </Text>
      </Page>
    </Document>
  );
}

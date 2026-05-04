import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const c = {
  black: "#000000",
  dark: "#1a1a1a",
  gray: "#555555",
  muted: "#888888",
  border: "#e0e0e0",
  bg: "#f0f0f0",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, color: c.dark, padding: 32 },

  heading: { fontSize: 18, fontFamily: "Helvetica-Bold", color: c.black, marginBottom: 3 },
  sub: { fontSize: 8, color: c.gray, marginBottom: 2 },
  company: { fontSize: 8, color: c.gray, marginBottom: 18 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  stat: { flex: 1, backgroundColor: c.bg, padding: 10, borderRadius: 3 },
  statLabel: { fontSize: 6.5, color: c.muted, marginBottom: 4 },
  statVal: { fontSize: 13, fontFamily: "Helvetica-Bold", color: c.black },

  tHead: { flexDirection: "row", backgroundColor: c.bg, padding: "5 6", borderTop: `1 solid ${c.border}`, borderBottom: `1 solid ${c.border}` },
  tRow: { flexDirection: "row", padding: "5 6", borderBottom: `1 solid #f0f0f0` },
  tTotalRow: { flexDirection: "row", padding: "6 6", borderTop: `1 solid ${c.dark}`, backgroundColor: "#fafafa" },
  th: { fontSize: 6.5, color: c.muted },
  td: { fontSize: 7.5, color: c.dark },
  tdBold: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: c.black },

  cInv: { width: 60 },
  cCust: { flex: 2 },
  cState: { flex: 1.5 },
  cPin: { width: 44 },
  cPhone: { width: 70 },
  cProd: { flex: 2 },
  cAmt: { width: 44, textAlign: "right" },
  cGst: { width: 36, textAlign: "right" },

  footer: { position: "absolute", bottom: 22, left: 32, right: 32, textAlign: "center", fontSize: 6.5, color: c.muted, borderTop: `1 solid ${c.border}`, paddingTop: 6 },
});

export interface GstRow {
  invoiceNumber: string;
  orderRef: string;
  customerName: string;
  state: string;
  pincode: string;
  phone: string;
  productName: string;
  amount: number;
  gstAmount: number;
}

export function GstSummaryPdf({ rows, date }: { rows: GstRow[]; date: string }) {
  const totalAmt = rows.reduce((s, r) => s + r.amount, 0);
  const totalGst = rows.reduce((s, r) => s + r.gstAmount, 0);
  const totalBase = totalAmt - totalGst;
  const totalCgst = Math.round(totalGst / 2);
  const totalSgst = totalGst - totalCgst;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.heading}>GST Summary Report</Text>
        <Text style={s.sub}>Generated on {date} · {rows.length} transaction{rows.length !== 1 ? "s" : ""}</Text>
        <Text style={s.company}>Gray Cup Enterprises · GSTIN: 06AAMCG4985H1Z4 · office@graycup.org</Text>

        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statLabel}>TAXABLE VALUE</Text>
            <Text style={s.statVal}>Rs. {totalBase}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>CGST @ 2.5%</Text>
            <Text style={s.statVal}>Rs. {totalCgst}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>SGST @ 2.5%</Text>
            <Text style={s.statVal}>Rs. {totalSgst}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>GRAND TOTAL</Text>
            <Text style={s.statVal}>Rs. {totalAmt}</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={s.tHead}>
          <Text style={[s.th, s.cInv]}>Invoice #</Text>
          <Text style={[s.th, s.cCust]}>Customer</Text>
          <Text style={[s.th, s.cState]}>State</Text>
          <Text style={[s.th, s.cPin]}>Pincode</Text>
          <Text style={[s.th, s.cPhone]}>Phone</Text>
          <Text style={[s.th, s.cProd]}>Product</Text>
          <Text style={[s.th, s.cAmt]}>Paid</Text>
          <Text style={[s.th, s.cGst]}>GST</Text>
        </View>

        {rows.map((r, i) => (
          <View key={i} style={s.tRow}>
            <Text style={[s.td, s.cInv]}>{r.invoiceNumber || "—"}</Text>
            <Text style={[s.td, s.cCust]}>{r.customerName}</Text>
            <Text style={[s.td, s.cState]}>{r.state}</Text>
            <Text style={[s.td, s.cPin]}>{r.pincode}</Text>
            <Text style={[s.td, s.cPhone]}>{r.phone}</Text>
            <Text style={[s.td, s.cProd]}>{r.productName}</Text>
            <Text style={[s.td, s.cAmt]}>Rs. {r.amount}</Text>
            <Text style={[s.td, s.cGst]}>Rs. {r.gstAmount}</Text>
          </View>
        ))}

        {/* Totals row */}
        <View style={s.tTotalRow}>
          <Text style={[s.tdBold, s.cInv]}></Text>
          <Text style={[s.tdBold, s.cCust]}>Total ({rows.length})</Text>
          <Text style={[s.tdBold, s.cState]}></Text>
          <Text style={[s.tdBold, s.cPin]}></Text>
          <Text style={[s.tdBold, s.cPhone]}></Text>
          <Text style={[s.tdBold, s.cProd]}></Text>
          <Text style={[s.tdBold, s.cAmt]}>Rs. {totalAmt}</Text>
          <Text style={[s.tdBold, s.cGst]}>Rs. {totalGst}</Text>
        </View>

        <Text style={s.footer}>
          Gray Cup Enterprises · GSTIN: 06AAMCG4985H1Z4 · Computer-generated document
        </Text>
      </Page>
    </Document>
  );
}

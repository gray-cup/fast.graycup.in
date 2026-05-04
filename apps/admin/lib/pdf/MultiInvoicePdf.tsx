import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { InvoiceData } from "./InvoicePdf";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", padding: 44 },
  header: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1 solid #e0e0e0", marginBottom: 20 },
  company: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#000", marginBottom: 4 },
  addr: { fontSize: 7.5, color: "#555", marginBottom: 1.5 },
  hRight: { alignItems: "flex-end" },
  taxLabel: { fontSize: 6.5, color: "#888", letterSpacing: 1, marginBottom: 3 },
  invNum: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#000", marginBottom: 2 },
  invSmall: { fontSize: 7.5, color: "#555", marginBottom: 1 },
  secLabel: { fontSize: 6.5, color: "#888", letterSpacing: 1, marginBottom: 5 },
  billBox: { backgroundColor: "#f7f7f7", padding: 10, borderRadius: 3, marginBottom: 20 },
  custName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#000", marginBottom: 3 },
  custDetail: { fontSize: 8, color: "#555", marginBottom: 1.5 },
  tHead: { flexDirection: "row", backgroundColor: "#f7f7f7", padding: "5 8", borderTop: "1 solid #e0e0e0", borderBottom: "1 solid #e0e0e0" },
  tRow: { flexDirection: "row", padding: "6 8", borderBottom: "1 solid #f0f0f0" },
  thCell: { fontSize: 6.5, color: "#888" },
  tdCell: { fontSize: 8.5, color: "#1a1a1a" },
  c1: { flex: 3 }, c2: { flex: 1.5 }, c3: { flex: 1, textAlign: "center" }, c4: { flex: 1.5, textAlign: "right" },
  totals: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4, marginBottom: 20 },
  totBox: { width: 190 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totLabel: { fontSize: 8, color: "#555" },
  totVal: { fontSize: 8, color: "#1a1a1a" },
  divider: { borderTop: "1 solid #1a1a1a", marginVertical: 4 },
  totFinal: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: "#000" },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, textAlign: "center", fontSize: 7, color: "#888", borderTop: "1 solid #e0e0e0", paddingTop: 7 },
});

function InvoicePage({ data }: { data: InvoiceData }) {
  const subtotal = data.amount - data.gstAmount;
  const cgst = Math.round(data.gstAmount / 2);
  const sgst = data.gstAmount - cgst;
  return (
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
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1a1a1a", marginBottom: 2 }}>Order #{data.orderNumber}</Text>
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
        <Text style={[s.tdCell, s.c1]}>{data.productName}</Text>
        <Text style={[s.tdCell, s.c2]}>{data.variantLabel}</Text>
        <Text style={[s.tdCell, s.c3]}>{data.quantity}</Text>
        <Text style={[s.tdCell, s.c4]}>Rs. {subtotal}</Text>
      </View>

      <View style={s.totals}>
        <View style={s.totBox}>
          <View style={s.totRow}><Text style={s.totLabel}>Taxable Value</Text><Text style={s.totVal}>Rs. {subtotal}</Text></View>
          <View style={s.totRow}><Text style={s.totLabel}>CGST @ 2.5%</Text><Text style={s.totVal}>Rs. {cgst}</Text></View>
          <View style={s.totRow}><Text style={s.totLabel}>SGST @ 2.5%</Text><Text style={s.totVal}>Rs. {sgst}</Text></View>
          <View style={s.divider} />
          <View style={s.totRow}><Text style={s.totFinal}>Total</Text><Text style={s.totFinal}>Rs. {data.amount}</Text></View>
        </View>
      </View>

      <Text style={s.footer}>Computer-generated invoice · Gray Cup Enterprises · GSTIN: 06AAMCG4985H1Z4</Text>
    </Page>
  );
}

export function MultiInvoiceDoc({ invoices }: { invoices: InvoiceData[] }) {
  return (
    <Document>
      {invoices.map((data) => (
        <InvoicePage key={data.orderRef} data={data} />
      ))}
    </Document>
  );
}

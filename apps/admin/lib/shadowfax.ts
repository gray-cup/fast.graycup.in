const SHADOWFAX_TOKEN = process.env.SHADOWFAX_TOKEN;
const SHADOWFAX_ENV = process.env.SHADOWFAX_ENV || "staging";

const BASE_URL =
  SHADOWFAX_ENV === "production"
    ? "https://dale.shadowfax.in/api"
    : "https://dale.staging.shadowfax.in/api";

// Warehouse / pickup address — where Shadowfax collects the parcel from
const WAREHOUSE_ADDRESS_LINE = process.env.SHADOWFAX_WAREHOUSE_ADDRESS || "Gate no.1, Police Colony, Pocket-6, Sector A5";
const WAREHOUSE_CITY = process.env.SHADOWFAX_WAREHOUSE_CITY || "Narela";
const WAREHOUSE_STATE = process.env.SHADOWFAX_WAREHOUSE_STATE || "Delhi";
const WAREHOUSE_PINCODE = parseInt(process.env.SHADOWFAX_WAREHOUSE_PINCODE || "110040", 10);
const WAREHOUSE_CONTACT = process.env.SHADOWFAX_WAREHOUSE_CONTACT || "";

const SELLER_GSTIN = "06AAMCG4985H1Z4";
const SELLER_NAME = "Gray Cup Enterprises";
const HSN_CODE = "2008";

export interface ShadowfaxOrderInput {
  orderRef: string;
  customerName: string;
  customerPhone: string;
  address: string;
  city?: string;
  state?: string;
  pincode: string;
  productDesc: string;
  totalAmount: number;
  gstAmount: number;
  weightGrams?: number;
  quantity?: number;
}

export interface ShadowfaxResponse {
  success: boolean;
  requestId?: string;
  error?: string;
}

export async function createShadowfaxOrder(input: ShadowfaxOrderInput): Promise<ShadowfaxResponse> {
  if (!SHADOWFAX_TOKEN) return { success: false, error: "SHADOWFAX_TOKEN not configured" };

  const baseAmount = input.totalAmount - input.gstAmount;
  const halfGst = input.gstAmount / 2;

  const warehouseDetails = {
    name: SELLER_NAME,
    contact: WAREHOUSE_CONTACT,
    address_line_1: WAREHOUSE_ADDRESS_LINE,
    city: WAREHOUSE_CITY,
    state: WAREHOUSE_STATE,
    pincode: WAREHOUSE_PINCODE,
  };

  const body = {
    order_type: "marketplace",
    order_details: {
      client_order_id: input.orderRef,
      actual_weight: input.weightGrams ?? 0,
      product_value: baseAmount,
      payment_mode: "Prepaid",
      cod_amount: 0,
      order_service: "regular",
    },
    customer_details: {
      name: input.customerName,
      contact: input.customerPhone,
      address_line_1: input.address,
      city: input.city ?? "",
      state: input.state ?? "",
      pincode: parseInt(input.pincode, 10),
    },
    pickup_details: warehouseDetails,
    rts_details: warehouseDetails,
    product_details: [
      {
        sku_name: input.productDesc,
        hsn_code: HSN_CODE,
        invoice_no: input.orderRef,
        price: baseAmount,
        seller_details: {
          seller_name: SELLER_NAME,
          seller_address: WAREHOUSE_ADDRESS_LINE,
          seller_state: WAREHOUSE_STATE,
          gstin_number: SELLER_GSTIN,
        },
        taxes: {
          cgst: halfGst,
          sgst: halfGst,
          igst: 0,
          total_tax: input.gstAmount,
        },
        additional_details: {
          quantity: input.quantity ?? 1,
        },
      },
    ],
  };

  try {
    const res = await fetch(`${BASE_URL}/v3/clients/orders/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${SHADOWFAX_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: JSON.stringify(data).slice(0, 300) };
    }

    const awb = data.data?.awb_number;
    if (awb) return { success: true, requestId: awb };

    return { success: false, error: data.message || JSON.stringify(data).slice(0, 300) };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function trackMultipleShadowfaxOrders(
  awbNumbers: string[]
): Promise<Record<string, { status: string; currentLocation: string }>> {
  if (!SHADOWFAX_TOKEN || awbNumbers.length === 0) return {};

  const result: Record<string, { status: string; currentLocation: string }> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < awbNumbers.length; i += 50) chunks.push(awbNumbers.slice(i, i + 50));

  for (const chunk of chunks) {
    try {
      const res = await fetch(`${BASE_URL}/v3/clients/orders/track/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${SHADOWFAX_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ awb_numbers: chunk }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const orders = data.data ?? data;
      for (const order of Array.isArray(orders) ? orders : Object.values(orders)) {
        const o = order as any;
        const awb = o.awb_number ?? o.awb;
        if (awb) {
          result[awb] = {
            status: o.status ?? o.status_display ?? "",
            currentLocation: o.current_location ?? o.city ?? "",
          };
        }
      }
    } catch {
      // continue with remaining chunks
    }
  }

  return result;
}

export function mapShadowfaxStatus(state: string): string | null {
  const s = state?.toLowerCase().trim() ?? "";
  if (!s) return null;

  if (s === "delivered") return "DELIVERED";
  if (["cancelled_by_customer", "cancelled"].includes(s)) return "CANCELLED";
  if (["rts", "lost", "undelivered"].includes(s)) return "RETURNED";
  if (["ofd", "in_transit", "dispatched"].includes(s)) return "DISPATCHED";
  if (["assigned_for_pickup", "new", "created"].includes(s)) return "PAID_DISPATCH_PENDING";

  return null;
}

export async function cancelShadowfaxOrder(
  awbNumber: string
): Promise<{ success: boolean; error?: string }> {
  if (!SHADOWFAX_TOKEN) return { success: false, error: "SHADOWFAX_TOKEN not configured" };
  try {
    const res = await fetch(`${BASE_URL}/v3/clients/orders/cancel/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${SHADOWFAX_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ awb_number: awbNumber }),
    });
    const data = await res.json();
    if (res.ok && (data.message?.toLowerCase().includes("success") || data.message?.toLowerCase().includes("cancel"))) {
      return { success: true };
    }
    return { success: false, error: data.message || data.errors || JSON.stringify(data) };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

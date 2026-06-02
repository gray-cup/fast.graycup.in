export interface ProductVariant {
  label: string;
  weightGrams: number;
  price: number; // GST-inclusive price in ₹
  deliveryCharge?: number; // flat delivery charge if applicable
  batchId?: string; // production batch identifier
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: "CTC Tea" | "Coffee";
  image_url: string;
  variants: ProductVariant[];
  origin: string;
  outOfStock?: boolean;
}

export const GST_RATE = 0.05; // Tea and coffee: 5% GST
export const FREE_DELIVERY_THRESHOLD = 1000; // free delivery on orders ₹1000+

export function isFreeDeliveryPincode(pincode: string): boolean {
  const n = parseInt(pincode, 10);
  return n >= 110001 && n <= 110099; // Delhi
}

export function gstAmount(price: number): number {
  return Math.round(price * GST_RATE);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export const products: Product[] = [
  {
    id: "tea-sample",
    slug: "tea-sample",
    name: "Tea Sample (150gm)",
    tagline: "Try before you commit",
    description:
      "A 150gm introductory pack of our house CTC + Orthodox blend. Grade includes BOPSM, BP, OF, DJ and GFOP from Dooars and Assam with no Artificial Additives.",
    category: "CTC Tea",
    image_url:
      "/samples.webp",
    origin: "Assam, India",
    outOfStock: true,
    variants: [
      { label: "150gm", weightGrams: 150, price: 100, batchId: "GRAYB1" },
    ],
  },
  {
    id: "ctc-blend-500",
    slug: "ctc-blend",
    name: "CTC + Orthodox Blend",
    tagline: "500gm Pack",
    description:
      "500gm of Assam & Dooars CTC + Orthodox blend, Grade includes BOPSM, BP, OF, DJ and GFOP from Dooars and Assam with no Artificial Additives.",
    category: "CTC Tea",
    image_url:
      "/500gm.png",
    origin: "Assam, India",
    variants: [
      { label: "500gm (1 Pack)", weightGrams: 500, price: 395, deliveryCharge: 30, batchId: "GRAYB1" },
      { label: "1kg (2 Packs)", weightGrams: 1000, price: 750, deliveryCharge: 30, batchId: "GRAYB1" },
      { label: "1.5kg (3 Packs)", weightGrams: 1500, price: 1100, deliveryCharge: 0, batchId: "GRAYB1" },
      { label: "2kg (4 Packs)", weightGrams: 2000, price: 1450, deliveryCharge: 0, batchId: "GRAYB1" },
    ],
  },
  {
    id: "giddapahar-darjeeling-orthodox",
    slug: "giddapahar-darjeeling-orthodox",
    name: "Giddapahar Darjeeling Orthodox",
    tagline: "Single-estate Darjeeling",
    description:
      "Single-estate Orthodox tea from Giddapahar, Darjeeling. Whole-leaf, hand-crafted, with a naturally sweet muscatel character.",
    category: "CTC Tea",
    image_url: "/giddapahar.png",
    origin: "Darjeeling, India",
    variants: [
      { label: "50gm", weightGrams: 50, price: 200, deliveryCharge: 30, batchId: "GRAYBD1" },
      { label: "100gm", weightGrams: 100, price: 330, deliveryCharge: 30, batchId: "GRAYBD1" },
    ],
  },
];

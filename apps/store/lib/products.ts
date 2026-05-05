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
}

export const GST_RATE = 0.05; // Tea and coffee: 5% GST

export function gstAmount(inclusivePrice: number): number {
  return Math.round(inclusivePrice - inclusivePrice / (1 + GST_RATE));
}

export function basePrice(inclusivePrice: number): number {
  return Math.round(inclusivePrice / (1 + GST_RATE));
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
    variants: [
      { label: "150gm", weightGrams: 150, price: 100, batchId: "GRAYB1" },
    ],
  },
  {
    id: "ctc-blend-500",
    slug: "ctc-blend",
    name: "CTC + Orthodox Blend (Early Access)",
    tagline: "Early Access 500gm Pack",
    description:
      "500gm of Assam & Dooars CTC + Orthodox blend, Grade includes BOPSM, BP, OF, DJ and GFOP from Dooars and Assam with no Artificial Additives.",
    category: "CTC Tea",
    image_url:
      "/500gm.png",
    origin: "Assam, India",
    variants: [
      { label: "500gm", weightGrams: 500, price: 360, deliveryCharge: 30, batchId: "GRAYB1" },
    ],
  },
];

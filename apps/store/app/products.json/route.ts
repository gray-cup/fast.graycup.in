import { NextResponse } from "next/server";
import { products } from "@/lib/products";
import type { Product } from "@/lib/products";

export const revalidate = 3600;

const BASE_URL = "https://fast.graycup.in";

function resolveUrl(path: string): string {
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
}

function mapProduct(product: Product) {
  const prices = product.variants.map((variant) => variant.price);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    category: product.category,
    origin: product.origin,
    url: `${BASE_URL}/products/${product.slug}`,
    image: resolveUrl(product.image_url),
    currency: "INR",
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
    },
    variants: product.variants.map((variant) => ({
      label: variant.label,
      weightGrams: variant.weightGrams,
      price: variant.price,
      deliveryCharge: variant.deliveryCharge ?? null,
    })),
    grindOptions: product.grindOptions ?? null,
    availability: product.outOfStock ? "out_of_stock" : "in_stock",
  };
}

export async function GET() {
  const body = {
    site: "fast.graycup.in",
    baseUrl: BASE_URL,
    currency: "INR",
    generatedAt: new Date().toISOString(),
    products: products.map(mapProduct),
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

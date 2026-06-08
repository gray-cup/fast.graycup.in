import { NextRequest, NextResponse } from "next/server";
import { ensureReviewsTable } from "@graycup/db";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }
  try {
    await ensureReviewsTable();
    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));
    return NextResponse.json({ reviews: rows });
  } catch (err) {
    console.error("reviews GET:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, authorName, reviewText } = body as {
      productId?: string;
      authorName?: string;
      reviewText?: string;
    };

    if (!productId || !authorName?.trim() || !reviewText?.trim()) {
      return NextResponse.json({ error: "productId, authorName, and reviewText are required" }, { status: 400 });
    }

    await ensureReviewsTable();
    const [row] = await db
      .insert(reviews)
      .values({ productId, authorName: authorName.trim(), body: reviewText.trim() })
      .returning();

    return NextResponse.json({ review: row }, { status: 201 });
  } catch (err) {
    console.error("reviews POST:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

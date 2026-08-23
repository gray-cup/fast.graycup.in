import { NextRequest, NextResponse } from "next/server";

// Cashfree redirects here with a browser POST (form-urlencoded body containing
// cf_status, cf_subscriptionId, etc.), not a GET with query params — a plain
// page component can't handle POST, so this route catches both and forwards
// to the actual result page as a GET.
async function handle(req: NextRequest) {
  const url = new URL(req.url);
  let ref = url.searchParams.get("ref");
  let status: string | null = null;

  if (req.method === "POST") {
    try {
      const form = await req.formData();
      status = (form.get("cf_status") as string) || null;
      ref = (form.get("cf_subscriptionId") as string) || ref;
    } catch {
      // no body — fall through with whatever came in the URL
    }
  }

  const dest = new URL("/subscription-success/confirmed", url.origin);
  if (ref) dest.searchParams.set("ref", ref);
  if (status) dest.searchParams.set("status", status);

  return NextResponse.redirect(dest, { status: 303 });
}

export const GET = handle;
export const POST = handle;

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/funnel/checkout
 * Creates a Stripe Checkout Session for a funnel offer (fe / oto1 / oto2 /
 * oto3 / oto1Ds / oto2Ds) with allow_promotion_codes enabled so buyers can
 * apply SAVE100 (or any affiliate coupon) at checkout. Returns the Checkout
 * URL for the browser to redirect to.
 *
 * Environment: STRIPE_SECRET_KEY must be a Stripe secret/restricted key with
 * Checkout Sessions write permission.
 */
const OFFERS: Record<
  string,
  { price: string; success: string; title: string }
> = {
  fe: {
    price: "price_1U1QQTCMo4saoxpIWU8W7kUz",
    success: "https://affilirank.com/funnel/oto1.html",
    title: "AffiliRank FE",
  },
  oto1: {
    price: "price_1U1QQUCMo4saoxpIwWWHKygG",
    success: "https://affilirank.com/funnel/oto2.html",
    title: "AffiliRank OTO1",
  },
  oto2: {
    price: "price_1U1QQVCMo4saoxpI9dvJq3vw",
    success: "https://affilirank.com/funnel/oto3.html",
    title: "AffiliRank OTO2",
  },
  oto3: {
    price: "price_1U1PH9CMo4saoxpIheAsOECx",
    success: "https://affilirank.com/funnel/thankyou.html",
    title: "AffiliRank Bundle",
  },
  mega: {
    price: "price_1U1SC6CMo4saoxpIcTRCHNFM",
    success: "https://affilirank.com/funnel/thankyou.html",
    title: "AffiliRank Mega Bundle",
  },
  oto1Ds: {
    price: "price_1U1PHACMo4saoxpIIXVVvqAU",
    success: "https://affilirank.com/funnel/oto2.html",
    title: "AffiliRank DS1",
  },
  oto2Ds: {
    price: "price_1U1QQYCMo4saoxpI9iuVynJt",
    success: "https://affilirank.com/funnel/oto3.html",
    title: "AffiliRank DS2",
  },
};

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Checkout is not configured yet" },
      { status: 500 }
    );
  }

  const { offer } = await req.json().catch(() => ({ offer: "" }));
  const cfg = OFFERS[String(offer ?? "").trim()];
  if (!cfg) {
    return NextResponse.json({ error: "Unknown offer" }, { status: 400 });
  }

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("allow_promotion_codes", "true");
  body.set("success_url", cfg.success);
  body.set("client_reference_id", `funnel-${offer}`);
  body.set("line_items[0][price]", cfg.price);
  body.set("line_items[0][quantity]", "1");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message ?? "Checkout failed" },
      { status: 500 }
    );
  }
  return NextResponse.json({ url: data.url });
}

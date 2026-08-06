/* ==========================================================================
   AffiliRank funnel — funnel configuration (EDIT THIS FILE)
   --------------------------------------------------------------------------
   Set `vsl` to your video sales letter embed URL (YouTube / Vimeo) when ready.

   STRIPE (recommended): Create Payment Links at dashboard.stripe.com/payment-links
   for each product and paste the URLs below. The checkout() function will use
   Stripe URLs when provided, falling back to JVZoo when they're empty.

   JVZOO (fallback): Replace PRODUCT_ID placeholders with real JVZoo product IDs.
   ========================================================================== */

window.FUNNEL = {
  brand: "AffiliRank",
  tagline: "Affiliate deal engine",
  affiliateId: "3582897",

  // ---- STRIPE PAYMENT LINKS (paste your real URLs here) ----
  stripeFe:      "https://buy.stripe.com/cNi6oGaAd9zx4Yy0hp1ZS01",
  stripeOto1:    "https://buy.stripe.com/cNidR89w9h1Z8aKd4b1ZS02",
  stripeOto2:    "https://buy.stripe.com/9B67sK8s5fXVdv4ggn1ZS03",
  stripeOto3:    "https://buy.stripe.com/8x27sKgYBbHF1Mm9RZ1ZS04",
  stripeOto1Ds:  "https://buy.stripe.com/8x23cubEhdPN2Qq5BJ1ZS05",
  stripeOto2Ds:  "https://buy.stripe.com/bJe7sK4bP8vtcr00hp1ZS06",

  // ---- JVZOO CHECKOUT LINKS (fallback if Stripe URLs are empty) ----
  fe:        "https://jvz0.com/c/3582897/FE_PRODUCT_ID/",
  oto1:      "https://jvz0.com/c/3582897/OTO1_PRODUCT_ID/",
  oto2:      "https://jvz0.com/c/3582897/OTO2_PRODUCT_ID/",
  oto3:      "https://jvz0.com/c/3582897/OTO3_PRODUCT_ID/",
  oto1Ds:    "https://jvz0.com/c/3582897/DS1_PRODUCT_ID/",
  oto2Ds:    "https://jvz0.com/c/3582897/DS2_PRODUCT_ID/",

  // ---- VIDEO SALES LETTER (YouTube or Vimeo embed URL) ----
  vsl: "",

  // ---- PRICES (update to match your Stripe/JVZoo prices) ----
  priceFe:     { now: "$79", was: "$99",  once: "One-time payment", coupon: "SAVE10", couponOff: "$10", couponTotal: "$69" },
  priceOto1:   { now: "$97", was: "$147", once: "One-time payment" },
  priceOto2:   { now: "$147", was: "$197", once: "One-time payment" },
  priceOto3:   { now: "$367", was: "$497", once: "One-time payment", coupon: "SAVE100", couponOff: "$100", couponTotal: "$267" },
  priceMega:   { now: "$467", was: "$497", once: "One-time payment", coupon: "SAVE100", couponOff: "$100", couponTotal: "$367" },
  priceOto1Ds: { now: "$37", was: "$97",  once: "One-time payment" },
  priceOto2Ds: { now: "$67", was: "$147", once: "One-time payment" },
};

/* ---- Fallback defaults so a single page still works if config.js is
   not loaded (e.g. when pasted into GoHighLevel). ---- */
window.FUNNEL_FALLBACK = window.FUNNEL || {
  brand: "AffiliRank",
  fe: "https://jvz0.com/c/3582897/FE_PRODUCT_ID/",
  oto1: "https://jvz0.com/c/3582897/OTO1_PRODUCT_ID/",
  oto2: "https://jvz0.com/c/3582897/OTO2_PRODUCT_ID/",
  oto3: "https://jvz0.com/c/3582897/OTO3_PRODUCT_ID/",
  oto1Ds: "https://jvz0.com/c/3582897/DS1_PRODUCT_ID/",
  oto2Ds: "https://jvz0.com/c/3582897/DS2_PRODUCT_ID/",
  vsl: "",
};

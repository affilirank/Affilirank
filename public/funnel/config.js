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
  stripeFe:      "",   // e.g. "https://buy.stripe.com/your_fe_link"
  stripeOto1:    "",
  stripeOto2:    "",
  stripeOto3:    "",
  stripeOto1Ds:  "",
  stripeOto2Ds:  "",

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
  priceFe:     { now: "$37", was: "$97",  once: "One-time payment" },
  priceOto1:   { now: "$67", was: "$97",  once: "One-time payment" },
  priceOto2:   { now: "$97", was: "$147", once: "One-time payment" },
  priceOto3:   { now: "$367", was: "$497", once: "One-time payment", coupon: "SAVE100", couponOff: "$100", couponTotal: "$267" },
  priceOto1Ds: { now: "$37", was: "$97",  once: "One-time payment" },
  priceOto2Ds: { now: "$47", was: "$147", once: "One-time payment" },
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

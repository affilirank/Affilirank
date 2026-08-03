/* ==========================================================================
   AffiliRank funnel — funnel configuration (EDIT THIS FILE)
   --------------------------------------------------------------------------
   Replace the PRODUCT_ID placeholders with your real JVZoo product IDs, e.g.
     https://jvz7.com/c/3582897/440485/
   Keep the trailing slash. Your affiliate id is baked into the /c/{id}/ part.
   Set `vsl` to your video sales letter embed URL (YouTube / Vimeo) when ready.
   ========================================================================== */

window.FUNNEL = {
  brand: "AffiliRank",
  tagline: "Affiliate deal engine",
  affiliateId: "3582897",

  // ---- CHECKOUT LINKS (JVZoo) — edit these ----
  fe:        "https://jvz0.com/c/3582897/FE_PRODUCT_ID/",
  oto1:      "https://jvz0.com/c/3582897/OTO1_PRODUCT_ID/",
  oto2:      "https://jvz0.com/c/3582897/OTO2_PRODUCT_ID/",
  oto3:      "https://jvz0.com/c/3582897/OTO3_PRODUCT_ID/",
  oto1Ds:    "https://jvz0.com/c/3582897/DS1_PRODUCT_ID/",
  oto2Ds:    "https://jvz0.com/c/3582897/DS2_PRODUCT_ID/",

  // ---- VIDEO SALES LETTER (YouTube or Vimeo embed URL) ----
  vsl: "",

  // ---- PRICES (placeholders — update to match your JVZoo prices) ----
  priceFe:     { now: "$37", was: "$97",  once: "One-time payment" },
  priceOto1:   { now: "$67", was: "$97",  once: "One-time payment" },
  priceOto2:   { now: "$97", was: "$147", once: "One-time payment" },
  priceOto3:   { now: "$147", was: "$297", once: "One-time payment" },
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

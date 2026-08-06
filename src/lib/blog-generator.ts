import type { BlogFaq, BlogPost, BlogSection, Deal } from "@/lib/types";
import {
  categoryLabel,
  discountPercent,
  formatPrice,
  slugify,
  truncate,
  uid,
} from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";

/**
 * SEO blog generator.
 *
 * Every deal published from the admin portal (or present in the store) gets a
 * fully-formed, SEO-packed article generated from the deal's own fields: a
 * 150–160 char meta description, keyword list, structured sections (what it
 * is, features, who it is for, pricing, why we love it), a FAQ block ready
 * for FAQPage schema, and affiliate CTA copy that always links to the deal's
 * real affiliate URL.
 *
 * Content is template-driven and deterministic for a given deal, so saving a
 * deal again simply regenerates a fresh, consistent article (price edits,
 * new highlights, etc. flow straight into the post).
 */

function shortName(title: string): string {
  return (title.split("|")[0] || title).trim() || title;
}

function cleanKeywords(title: string, category: string | null): string[] {
  const name = shortName(title);
  const words = name
    .replace(/[^a-z0-9 ]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const cat = category ? categoryLabel(category) : null;
  const base: string[] = [
    name,
    `${name} review`,
    `${name} lifetime deal`,
    `${name} pricing`,
    `${name} alternatives`,
  ];
  if (cat) {
    base.unshift(`${name} ${cat.toLowerCase()} tool`, cat);
  }
  base.push(
    "lifetime deal",
    "one-time payment software",
    "software deals",
    "buy once own forever",
    ...words.slice(0, 5)
  );
  return Array.from(new Set(base.map((k) => k.toLowerCase()))).slice(0, 12);
}

function discountLine(deal: Deal): string {
  const pct = discountPercent(deal.original_price, deal.price);
  const price = formatPrice(deal.price, deal.currency);
  const original = formatPrice(deal.original_price, deal.currency);
  if (pct && price && original) {
    return `For a limited time you can grab ${shortName(deal.title)} for a one-time payment of just ${price} (regularly ${original}) — that is a ${pct}% saving over buying at full price.`;
  }
  if (price) {
    return `For a limited time you can grab ${shortName(deal.title)} for a one-time payment of just ${price} — no monthly subscription, no hidden fees.`;
  }
  return `For a limited time you can grab ${shortName(deal.title)} for a single one-time payment — no monthly subscription, no hidden fees.`;
}

function guaranteeLine(deal: Deal): string {
  if (deal.coupon_code) {
    return `Use coupon code ${deal.coupon_code} at checkout (where shown) to make sure you lock in the best available price.`;
  }
  return "Use the button below to lock in today's best available price before this lifetime deal expires.";
}

function buildSections(deal: Deal): BlogSection[] {
  const name = shortName(deal.title);
  const cat = deal.category ? categoryLabel(deal.category) : null;
  const description = deal.description?.trim();

  const sections: BlogSection[] = [];

  // 1 — What it is
  const introParagraphs: string[] = [];
  if (description) {
    introParagraphs.push(description.replace(/\s+/g, " ").trim());
  } else {
    introParagraphs.push(
      `${name} is a ${cat ?? "premium"} digital product that gives you professional-grade capability at a fraction of the usual cost. Instead of paying month after month, you pay once and unlock the full product for life.`
    );
  }
  introParagraphs.push(
    `In this ${name} review, we cover exactly what it does, its key features, who it is best for, how the one-time pricing works, and answers to the most common questions. If you have been weighing up whether ${name} is worth the money, this is the complete picture.`
  );
  sections.push({
    heading: `What Is ${name}?`,
    paragraphs: introParagraphs,
    cta: true,
  });

  // 2 — Key features
  const features = (deal.highlights ?? []).slice(0, 7);
  const featureBullets =
    features.length >= 2
      ? features
      : [
          `${name} unlocks the full product with a single one-time payment`,
          "Lifetime access, including every future update",
          "No recurring subscription or hidden monthly fees",
          "Works straight out of the box with everything included",
          ...(cat ? [`Purpose-built for ${cat.toLowerCase()} workflows`] : []),
        ];
  sections.push({
    heading: `Key Features & Benefits of ${name}`,
    paragraphs: [
      `Here are the standout features that make ${name} worth a serious look:`,
    ],
    bullets: featureBullets,
  });

  // 3 — Who it is for
  const whoBullets = [
    `Solo founders and small business owners who want professional tools without a recurring bill`,
    ...(cat
      ? [`Marketers, creators and teams doing ${cat.toLowerCase()} work every day`]
      : []),
    "Freelancers who want to stop paying for the same tool month after month",
    "Anyone who prefers a buy-once-own-forever model over another subscription",
  ];
  sections.push({
    heading: `Who Is ${name} Best For?`,
    paragraphs: [
      `${name} is designed for people who want results without long-term commitments. If any of these sound like you, this lifetime deal is worth checking out:`,
    ],
    bullets: whoBullets,
    cta: true,
  });

  // 4 — Pricing
  sections.push({
    heading: `Pricing: One-Time Payment, Lifetime Access`,
    paragraphs: [
      `The biggest selling point of ${name} is the pricing model. ${discountLine(deal)}`,
      `There are no monthly subscriptions and no renewal charges — you pay once and keep the license forever. On top of that, the deal includes free updates, so the product only gets better over time without costing you a cent more.`,
      guaranteeLine(deal),
    ],
  });

  // 5 — Why we love it
  sections.push({
    heading: `Why We Love ${name}`,
    paragraphs: [
      `We built ${SITE_NAME} around one simple belief: small businesses thrive when they get world-class tools at a fair price. ${name} is exactly the kind of product we love to feature — it solves a real problem, is offered at a genuinely fair one-time price, and gives you the same capability you would otherwise rent forever.`,
      `If you are ready to stop bleeding money on subscriptions, ${name} is one of the smartest one-time purchases you can make this year.`,
    ],
    cta: true,
  });

  return sections;
}

function buildFaq(deal: Deal): BlogFaq[] {
  const name = shortName(deal.title);
  const price = formatPrice(deal.price, deal.currency);
  const pct = discountPercent(deal.original_price, deal.price);

  return [
    {
      question: `Is ${name} really a one-time payment?`,
      answer: `Yes. ${name} is sold as a lifetime license, not a subscription. You pay once${price ? ` (currently ${price})` : ""} and keep access for life — there are no monthly fees, no annual renewals and no surprise charges.`,
    },
    {
      question: `Do I get lifetime access and free updates with ${name}?`,
      answer: `Absolutely. The lifetime deal for ${name} includes the full product today and every future update, so the tool keeps improving without costing you anything extra.`,
    },
    {
      question: `How much can I save with the ${name} lifetime deal?`,
      answer: `Compared with the regular pricing${deal.original_price ? ` (${formatPrice(deal.original_price, deal.currency)})` : ""}, buying the lifetime license saves you a substantial amount${pct ? ` — around ${pct}%` : ""} — and you only ever pay once, so the savings keep compounding year after year.`,
    },
    {
      question: `How do I get ${name} at the best price?`,
      answer: `The best price is the one shown on this page, available through the official affiliate link. Click any "Get ${name}" button above, complete your purchase securely on the checkout page, and your license is delivered right away.`,
    },
    {
      question: `Is there a money-back guarantee on ${name}?`,
      answer: `Most lifetime deals we feature come with a risk-free guarantee, so you can try ${name} and get a refund if it isn't the right fit. The exact terms are shown on the official checkout page before you buy.`,
    },
    {
      question: `How long is the ${name} deal available?`,
      answer: `Lifetime deals like this one are typically available for a limited window only. If you are on the fence, we recommend grabbing ${name} while the one-time price is still live — once it's gone, you'll be back to paying full price every month.`,
    },
  ];
}

function estimateReadingTime(post: BlogPost): number {
  const words = [
    post.excerpt,
    ...post.sections.flatMap((s) => [
      s.heading,
      ...s.paragraphs,
      ...(s.bullets ?? []),
    ]),
    ...post.faq.flatMap((f) => [f.question, f.answer]),
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(3, Math.round(words / 210));
}

/** Build a complete, SEO-packed blog post from a deal. */
export function generateBlogPost(deal: Deal): BlogPost {
  const now = new Date().toISOString();
  const name = shortName(deal.title);
  const year = new Date().getFullYear();

  const sections = buildSections(deal);
  const faq = buildFaq(deal);

  const excerptSource =
    deal.description?.trim() ??
    `${name} is a ${deal.category ? categoryLabel(deal.category).toLowerCase() : "premium"} tool available as a lifetime deal — one-time payment, full access, no subscription. Read the complete review, features, pricing and FAQs.`;
  const excerpt = truncate(excerptSource, 158);

  const post: BlogPost = {
    id: uid("blog"),
    deal_id: deal.id,
    slug: `${deal.slug || slugify(name) || slugify(deal.title)}-review`,
    title: `${name}: Lifetime Deal Review, Features, Pricing & FAQs (${year})`,
    excerpt,
    cover_image: deal.hero_image,
    category: deal.category,
    keywords: cleanKeywords(name, deal.category),
    reading_time_minutes: 0,
    published: deal.published,
    created_at: deal.created_at ?? now,
    updated_at: now,
    sections,
    faq,
  };

  post.reading_time_minutes = estimateReadingTime(post);
  return post;
}

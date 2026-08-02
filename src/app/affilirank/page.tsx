import Link from "next/link";
import type { Metadata } from "next";
import {
  Zap,
  Newspaper,
  Infinity as InfinityIcon,
  MousePointerClick,
  BarChart3,
  FileSearch,
  Video,
  Rocket,
  KeyRound,
  Check,
  ArrowRight,
  ArrowLeft,
  Settings,
  ShieldCheck,
  Crown,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/constants";
import {
  LICENSE_FEATURES,
  BUNDLE_ENV,
  upsellUrls,
} from "@/lib/licensing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const url = `${SITE_URL}/affilirank`;
  return {
    title: `${SITE_NAME} — Rank first. Earn on autopilot.`,
    description:
      "Turn your affiliate deals into a self-publishing SEO machine. TikTok-style deal stream, auto-generated review articles, exit-intent popups and more — locked behind simple license keys you sell as upsells.",
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: `${SITE_NAME} — Rank first. Earn on autopilot.`,
      description:
        "Self-publishing SEO machine for affiliate deals. Sell it white-label with license-key unlocks.",
      images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — Rank first. Earn on autopilot.`,
      description:
        "Self-publishing SEO machine for affiliate deals. Sell it white-label with license-key unlocks.",
    },
  };
}

const TIERS = [
  {
    name: "Core",
    icon: Zap,
    price: "Included",
    desc: "The deal stream engine with everything you need to launch.",
    features: [
      "TikTok-style snap deal stream",
      "JVZoo one-click URL ingest + auto-scrape",
      "Countdown timers & coupons",
      "10 deal slots",
      "YouTube / Vimeo VSL playback",
      "Realtime sync via Supabase",
    ],
    highlight: false,
  },
  {
    name: "Bundle",
    icon: Crown,
    price: "Full version",
    desc: "Every module unlocked forever — what your buyers get.",
    features: [
      "Everything in Core",
      "SEO Blog module (auto articles)",
      "Unlimited deals",
      "Exit-intent popup",
      "Analytics module (GA4 + Meta Pixel)",
      "Deal detail pages with Product schema",
      "Pro video mode (MP4 / iframe / GIF)",
    ],
    highlight: true,
  },
];

export default function VslPage() {
  const urls = upsellUrls();
  const bundleUrl = urls.bundle;
  const featureRows = [
    { key: "blog", icon: Newspaper, def: LICENSE_FEATURES[0] },
    { key: "unlimited-deals", icon: InfinityIcon, def: LICENSE_FEATURES[1] },
    { key: "exit-intent", icon: MousePointerClick, def: LICENSE_FEATURES[2] },
    { key: "analytics", icon: BarChart3, def: LICENSE_FEATURES[3] },
    { key: "deal-pages", icon: FileSearch, def: LICENSE_FEATURES[4] },
    { key: "pro-video", icon: Video, def: LICENSE_FEATURES[5] },
  ];

  const faq = [
    {
      q: "How does the licensing work?",
      a: "Every deployment ships with the core deal stream unlocked. Advanced modules (SEO blog, unlimited deals, exit-intent, analytics, deal pages, pro video) are locked behind RSA-signed license keys. Buyers paste a key in the admin portal — no license server needed. A bundle key unlocks everything.",
    },
    {
      q: "Can I sell this as my own product?",
      a: "Yes. It's fully white-label. Rebrand it, give buyers their own deployment, and let them add their own affiliate ID. You keep the private key, so only you can mint new unlock keys.",
    },
    {
      q: "Is this a one-time payment?",
      a: "Everything here is designed for lifetime deals: one-time pricing, your affiliate commissions, and a product your buyers can deploy and own.",
    },
    {
      q: "Do I need a license server?",
      a: "No. Keys are verified offline with public-key cryptography. The app never phones home — buyers get instant activation, and you get forge-proof controls.",
    },
  ];

  return (
    <div className="min-h-[100svh] bg-void text-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0f1e]/95 shadow-lg shadow-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={30} />
            <span className="hidden text-sm font-semibold text-white/70 transition hover:text-white sm:inline">
              <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
              Back to the deal stream
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/blog"
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-violet-400/50 hover:text-white"
            >
              Blog
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-violet-400/50 hover:text-white"
            >
              <Settings className="mr-1 inline h-3.5 w-3.5" />
              Admin
            </Link>
            <a
              href={bundleUrl || "#buy"}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:brightness-110 cta-glow"
            >
              Get the Bundle
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,rgba(124,58,237,0.3),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-violet-300/90">
            <Zap className="mr-1 inline h-4 w-4 -translate-y-0.5" />
            White-label affiliate deal machine
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-6xl">
            Rank first.
            <br />
            <span className="text-gradient">Earn on autopilot.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
            {SITE_NAME} is the affiliate storefront that writes its own SEO.
            Paste a JVZoo link and it scrapes the offer, launches a TikTok-style
            deal stream, and auto-publishes a ranking review article — every
            CTA monetized with your affiliate tag.
          </p>

          {/* VSL video */}
          <div className="mx-auto mt-10 max-w-3xl">
            {process.env.NEXT_PUBLIC_VSL_EMBED_URL ? (
              <div className="aspect-video overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-violet-500/10">
                <iframe
                  src={process.env.NEXT_PUBLIC_VSL_EMBED_URL}
                  title={`${SITE_NAME} — video sales letter`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div
                id="buy"
                className="flex aspect-video flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/20 bg-panel text-white/40"
              >
                <Video className="h-10 w-10" />
                <p className="text-sm font-medium">
                  Your video sales letter goes here
                </p>
                <p className="max-w-md text-xs text-white/35">
                  Set{" "}
                  <code className="rounded bg-white/10 px-1.5 py-0.5">
                    NEXT_PUBLIC_VSL_EMBED_URL
                  </code>{" "}
                  to embed your VSL (YouTube, Vimeo, or direct MP4).
                </p>
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={bundleUrl || "#buy"}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-8 py-4 text-base font-bold text-white transition hover:brightness-110 cta-glow"
            >
              <Crown className="h-5 w-5" />
              Get the Full Version
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/30 px-8 py-4 text-base font-semibold text-white/80 transition hover:border-violet-400/50 hover:text-white"
            >
              See the Deal Stream Live
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-display text-3xl font-extrabold">
          Launch yours in <span className="text-gradient">3 steps</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Rocket,
              title: "1 · Deploy",
              body: "Stand up your own branded instance. Rebrand it, point it at your domain, connect Supabase for realtime data.",
            },
            {
              icon: KeyRound,
              title: "2 · Unlock",
              body: "Sell the six advanced modules as upsells. Buyers activate instantly by pasting an RSA-signed key you mint in seconds.",
            },
            {
              icon: ShieldCheck,
              title: "3 · Monetize",
              body: "Every stream card, blog CTA and deal page runs your affiliate link. One-time purchases + lifetime commissions.",
            },
          ].map((s) => (
            <div key={s.title} className="glass rounded-3xl p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features (the license modules) */}
      <section className="border-y border-white/10 bg-black/20">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-center font-display text-3xl font-extrabold">
            Six unlockable <span className="text-gradient">modules</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/55">
            The core stream ships unlocked. Every advanced module is gated
            behind a license key — sell them individually, or hand buyers a
            bundle key that unlocks everything.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureRows.map(({ key, icon: Icon, def }) => (
              <div
                key={key}
                className="glass flex flex-col rounded-3xl p-6 transition hover:border-violet-400/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-bold">
                    {def.label}
                  </h3>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">
                  {def.description}
                </p>
                {urls[key] ? (
                  <a
                    href={urls[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                  >
                    Unlock now <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-4 text-xs text-white/35">
                    <code className="rounded bg-white/10 px-1.5 py-0.5">
                      {def.env}
                    </code>{" "}
                    not configured
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-display text-3xl font-extrabold">
          Simple, <span className="text-gradient">one-time</span> pricing
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={
                t.highlight
                  ? "relative rounded-3xl border border-violet-400/40 bg-gradient-to-b from-violet-600/10 to-cyan-500/5 p-7 shadow-2xl shadow-violet-500/10"
                  : "glass rounded-3xl p-7"
              }
            >
              {t.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                  Most popular
                </span>
              )}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg ${
                    t.highlight
                      ? "bg-gradient-to-r from-violet-600 to-cyan-500"
                      : "bg-white/10"
                  }`}
                >
                  <t.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">{t.name}</h3>
                  <p className="text-sm font-semibold text-emerald-300">
                    {t.price}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/55">{t.desc}</p>
              <ul className="mt-5 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span className="text-white/75">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={t.highlight ? bundleUrl || "#buy" : "#modules"}
                className={`mt-6 flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold transition ${
                  t.highlight
                    ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:brightness-110 cta-glow"
                    : "border border-white/15 bg-black/30 text-white/80 hover:border-violet-400/50 hover:text-white"
                }`}
              >
                {t.highlight ? (
                  <>
                    <Crown className="h-4 w-4" /> Get the Bundle
                  </>
                ) : (
                  <>Included with every deployment</>
                )}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="text-center font-display text-3xl font-extrabold">
            Questions, <span className="text-gradient">answered</span>
          </h2>
          <div className="mt-10 space-y-3">
            {faq.map((f) => (
              <details
                key={f.q}
                className="glass group rounded-2xl px-5 py-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-white/85">
                  {f.q}
                  <span className="text-violet-300 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-white/55">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
          Ready to <span className="text-gradient">rank first?</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/60 sm:text-base">
          {SITE_TAGLINE} — launch your own affiliate deal machine today and
          start collecting lifetime commissions.
        </p>
        <a
          href={bundleUrl || "#buy"}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-10 py-4 text-base font-bold text-white transition hover:brightness-110 cta-glow"
        >
          <Crown className="h-5 w-5" />
          Get the Full Version
          <ArrowRight className="h-4 w-4" />
        </a>
        <p className="mt-6 text-xs text-white/40">
          {BUNDLE_ENV} configures the bundle checkout. Configured here:{" "}
          {bundleUrl ? "yes" : "no"}.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <p className="text-xs text-white/40">
              {SITE_NAME} — {SITE_TAGLINE}
            </p>
          </div>
          <nav className="flex items-center gap-4 text-xs text-white/50">
            <Link href="/" className="transition hover:text-white">
              Deal Stream
            </Link>
            <Link href="/blog" className="transition hover:text-white">
              Blog
            </Link>
            <Link href="/affilirank" className="transition hover:text-white">
              About the product
            </Link>
            <Link href="/admin" className="transition hover:text-white">
              Admin
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

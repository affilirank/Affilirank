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
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  Settings,
  Crown,
  Link2,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/constants";
import { upsellUrls } from "@/lib/licensing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const url = `${SITE_URL}/affilirank`;
  return {
    title: `${SITE_NAME} — Rank your deals. Earn on autopilot.`,
    description:
      "Turn any JVZoo offer into a self-ranking deal stream and SEO blog that writes itself. Every CTA monetized with your affiliate link. One-time price, lifetime commissions.",
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: `${SITE_NAME} — Rank your deals. Earn on autopilot.`,
      description:
        "A deal stream + SEO blog for affiliate marketers. Paste a JVZoo link and start ranking your offers on autopilot.",
      images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — Rank your deals. Earn on autopilot.`,
      description:
        "A deal stream + SEO blog for affiliate marketers. Paste a JVZoo link and start ranking your offers on autopilot.",
    },
  };
}

const TIERS = [
  {
    name: "Core",
    icon: Zap,
    price: "Core version",
    desc: "Your deal stream engine — ship it today, start selling from day one.",
    features: [
      "TikTok-style snap deal stream",
      "JVZoo one-click URL ingest + auto-scrape",
      "Your affiliate tag injected into every CTA",
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
    price: "The complete package",
    desc: "Every module unlocked forever — the end-user route to owning it all.",
    features: [
      "Everything in Core",
      "SEO Blog Module (auto-written ranking articles)",
      "Unlimited deals — no 10-deal cap",
      "Exit-intent popup + countdown",
      "Analytics module (GA4 + Meta Pixel)",
      "Deal detail pages with Product schema",
      "Pro video mode (MP4 / iframe / GIF)",
      "White-label rights — rebrand and resell your own copies",
    ],
    highlight: true,
  },
];

export default function VslPage() {
  const urls = upsellUrls();
  const FUNNEL = "https://get.affilirank.com";
  const bundleUrl = urls.bundle || FUNNEL;

  const modules = [
    {
      key: "blog",
      icon: Newspaper,
      label: "SEO Blog Module",
      desc: "Auto-written, keyword-optimized review articles that rank your deals on Google — every CTA goes to your affiliate checkout.",
      url: urls.blog || `${FUNNEL}/funnel/oto1.html`,
    },
    {
      key: "unlimited-deals",
      icon: InfinityIcon,
      label: "Unlimited Deals",
      desc: "Sell every offer you promote. No 10-deal cap on your stream — add as many lifetime deals as you want.",
      url: urls["unlimited-deals"] || `${FUNNEL}/funnel/oto1.html`,
    },
    {
      key: "exit-intent",
      icon: MousePointerClick,
      label: "Exit-Intent Popup",
      desc: "Catch visitors before they leave with a high-converting offer and countdown. More clicks, more commissions.",
      url: urls["exit-intent"] || `${FUNNEL}/funnel/oto2.html`,
    },
    {
      key: "analytics",
      icon: BarChart3,
      label: "Analytics Module",
      desc: "Know exactly what converts. GA4 + Meta Pixel tracking baked in — double your best-performing deals.",
      url: urls.analytics || `${FUNNEL}/funnel/oto2.html`,
    },
    {
      key: "deal-pages",
      icon: FileSearch,
      label: "Deal Detail Pages",
      desc: "A dedicated SEO landing page for every product, with rich Product schema and your affiliate link.",
      url: urls["deal-pages"] || `${FUNNEL}/funnel/oto2.html`,
    },
    {
      key: "pro-video",
      icon: Video,
      label: "Pro Video Mode",
      desc: "Go beyond YouTube & Vimeo — play MP4, iframe and GIF creative so no offer gets left behind.",
      url: urls["pro-video"] || `${FUNNEL}/funnel/oto2.html`,
    },
  ];

  const steps = [
    {
      icon: Link2,
      title: "1 · Paste a JVZoo link",
      body: "One-click ingest scrapes the title, image, video and price. Your affiliate tag is injected automatically into every checkout link.",
    },
    {
      icon: Sparkles,
      title: "2 · It publishes itself",
      body: "A TikTok-style stream card goes live instantly, and a Google-indexed review article is auto-written — every CTA monetized with your affiliate link.",
    },
    {
      icon: BarChart3,
      title: "3 · Rank and earn",
      body: "SEO articles, deal pages and exit-intent popups drive clicks on autopilot. A one-time purchase you own forever — lifetime commissions.",
    },
  ];

  const faq = [
    {
      q: "How does AffiliRank help me rank my deals?",
      a: "Every deal gets a keyword-optimized review article at /blog and a dedicated landing page at /deals/[slug] — both indexed by Google and packed with CTAs that link to your affiliate checkout. Publish once, and the articles keep ranking and converting for you.",
    },
    {
      q: "How does the licensing work?",
      a: "The core deal stream ships unlocked with every deployment. Advanced modules — SEO blog, unlimited deals, exit-intent, analytics, deal pages, pro video — are gated behind RSA-signed license keys. Activate instantly by pasting a key in the admin portal. No license server, no phone-home.",
    },
    {
      q: "What exactly is the Bundle?",
      a: "The Bundle is the full version: every module unlocked forever, including the SEO blog and unlimited deals. It also includes white-label rights — so if you want the end-user route of rebranding and reselling your own copies, that's yours.",
    },
    {
      q: "Is it a one-time payment?",
      a: "Yes. Everything here is designed lifetime-deal style: one-time pricing, your affiliate commissions, and a product you deploy, own and keep.",
    },
    {
      q: "Do I need a license server?",
      a: "No. Keys are verified offline with public-key cryptography. Buyers get instant activation, and you get forge-proof control over every unlock.",
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
            Affiliate deal marketing on autopilot
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-6xl">
            Rank your deals.
            <br />
            <span className="text-gradient">Earn on autopilot.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
            {SITE_NAME} turns any JVZoo offer into a self-ranking deal stream
            plus an SEO blog that writes itself — every view, article and popup
            monetized with your affiliate link. Publish once, rank in Google,
            collect lifetime commissions.
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
                  Embed your VSL (YouTube, Vimeo, or direct MP4) and it plays
                  right here.
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
          Start ranking in <span className="text-gradient">3 steps</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
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

      {/* Modules to unlock */}
      <section id="modules" className="border-y border-white/10 bg-black/20">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-center font-display text-3xl font-extrabold">
            Unlock more <span className="text-gradient">firepower</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/55">
            The core stream ships unlocked. Add SEO that ranks your deals on
            Google, unlimited slots, and conversion tools as one-time upsells —
            or grab the Bundle for everything at once.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ key, icon: Icon, label, desc, url }) => (
              <div
                key={key}
                className="glass flex flex-col rounded-3xl p-6 transition hover:border-violet-400/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-bold">{label}</h3>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">
                  {desc}
                </p>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                  >
                    Unlock now <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-4 text-xs text-white/35">
                    Unlock link coming soon
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
                href={bundleUrl || "#buy"}
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
                  <>
                    <Zap className="h-4 w-4" /> Get AffiliRank Core — $37
                  </>
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
          {SITE_TAGLINE} — publish your deals once and let {SITE_NAME} do the
          ranking, the writing and the converting while you collect lifetime
          commissions.
        </p>
        <a
          href={bundleUrl || "#buy"}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-10 py-4 text-base font-bold text-white transition hover:brightness-110 cta-glow"
        >
          <Crown className="h-5 w-5" />
          Get the Full Version
          <ArrowRight className="h-4 w-4" />
        </a>
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

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { getCurrentTenant } from "@/lib/tenant";
import { SITE_URL } from "@/lib/constants";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  return {
    title: "Terms of Service",
    description: `The terms and conditions that govern your use of ${tenant.name} (lifetimedealsbundle.com).`,
    alternates: { canonical: `${SITE_URL}/terms` },
  };
}

export default async function TermsOfService() {
  const tenant = await getCurrentTenant();
  const contact = `support@${tenant.domain}`;

  return (
    <div className="min-h-[100svh] bg-void text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
            <Logo size={28} />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/25 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Deals
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,rgba(124,58,237,0.25),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-violet-300/90">
            <FileText className="mr-1 inline h-4 w-4 -translate-y-0.5" />
            The Fine Print
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            Terms of Service
            <span className="text-gradient"> for {tenant.domain}</span>
          </h1>
          <p className="mt-3 text-xs text-white/45">
            Effective date: September 21, 2026 · Last updated: September 21, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <article className="mx-auto max-w-3xl space-y-10 px-4 py-12 text-sm leading-relaxed text-white/70 sm:px-6">
        <section className="space-y-3">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the
            website{" "}
            <span className="font-semibold text-white">{tenant.domain}</span>{" "}
            (the &ldquo;Site&rdquo;) operated by {tenant.name}
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By accessing or using the
            Site you agree to be bound by these Terms and our{" "}
            <Link
              className="text-cyan-300 underline decoration-cyan-300/40 transition hover:decoration-cyan-300"
              href="/privacy"
            >
              Privacy Policy
            </Link>
            . If you do not agree, do not use the Site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            1. What the Site Is
          </h2>
          <p>
            The Site is a curated directory and review service for lifetime and
            one-time-payment software deals (&ldquo;Deals&rdquo;). We compile
            Deal information — including titles, descriptions, prices, coupon
            codes, images and videos — from vendor websites and public
            sources. You can browse the deal stream, read auto-generated review
            articles, and click through to vendor checkout pages. The Site
            itself does not require visitor accounts and does not sell
            products directly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            2. No Warranties on Deal Information
          </h2>
          <p>
            Prices, discounts, coupon codes and offer terms are set by the
            vendors and can change or expire at any time without notice. While
            we work to keep the Site accurate and up to date, we make no
            warranty that any Deal, price, coupon or review shown here is
            current, complete or error-free. The authoritative price and terms
            are always those displayed on the vendor&apos;s official checkout
            page before you buy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            3. Purchases &amp; Refunds
          </h2>
          <p>
            When you click a Deal you leave our Site and transact directly with
            the vendor. Your purchase, payment, support, refunds and any
            disputes are governed exclusively by the vendor&apos;s terms and
            policies. We are not a party to that transaction and are not
            responsible for the vendor&apos;s products, pricing, fulfilment,
            refunds or conduct.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            4. Affiliate Disclosure
          </h2>
          <p>
            Many links on the Site are affiliate links. If you make a purchase
            through one, we may earn a commission from the vendor at no
            additional cost to you. This does not influence our rankings or
            reviews. Affiliate relationships are disclosed on deal pages and
            review articles.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            5. Acceptable Use
          </h2>
          <p>When using the Site, you agree not to:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Use the Site for any unlawful, fraudulent or harmful purpose.</li>
            <li>
              Scrape, harvest or copy Site content in bulk without our prior
              written permission.
            </li>
            <li>
              Interfere with or attempt to gain unauthorized access to the
              Site, its dashboard, its APIs or its infrastructure.
            </li>
            <li>
              Use automated systems to generate artificial traffic, clicks or
              conversions on the Site or the deals it links to.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            6. YouTube Publishing (Administrators)
          </h2>
          <p>
            The Site offers its administrators an optional publishing feature
            that connects a YouTube channel through Google OAuth and can
            generate and upload promotional videos to that channel. If you use
            this feature, you additionally agree that:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              You own or control the connected channel and have all rights
              necessary to the content uploaded through the feature.
            </li>
            <li>
              You are solely responsible for everything published to your
              channel, including compliance with{" "}
              <a
                className="text-cyan-300 underline decoration-cyan-300/40 transition hover:decoration-cyan-300"
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube&apos;s Terms of Service
              </a>
              , Community Guidelines, spam and deceptive-practices policies,
              and applicable advertising-disclosure laws.
            </li>
            <li>
              Generated videos are based on the deal data and media supplied
              through the dashboard; you are responsible for verifying their
              accuracy before and after publication.
            </li>
            <li>
              We may suspend the publishing feature, and you may disconnect
              your channel at any time from the dashboard.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            7. Intellectual Property
          </h2>
          <p>
            The Site&apos;s design, text, graphics and compilations are our
            property or licensed to us. Vendor names, logos, product images and
            videos belong to their respective owners and are used for
            identification and review purposes only. You may share links to
            the Site freely, but you may not republish substantial parts of it
            without permission.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            8. Third-Party Links &amp; Embeds
          </h2>
          <p>
            The Site links to, and embeds content from, third-party websites
            and services (vendor checkouts, YouTube, Vimeo). We do not control
            those parties and are not responsible for their content, policies
            or practices. Your use of third-party services is at your own risk
            and subject to their terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            9. Disclaimers
          </h2>
          <p>
            The Site is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; without warranties of any kind, express or
            implied, including warranties of accuracy, merchantability, fitness
            for a particular purpose and non-infringement. We do not warrant
            that the Site will be uninterrupted, secure or error-free.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            10. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, {tenant.name} and its
            operators shall not be liable for any indirect, incidental,
            special, consequential or punitive damages, or for any loss of
            profits, revenue, data or goodwill, arising from or related to
            your use of the Site or any Deal purchased through it. Our total
            liability for all claims shall not exceed USD 100 or the amount
            you paid to access the Site, whichever is greater. Some
            jurisdictions do not allow certain limitations, in which case they
            apply only to the extent permitted.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            11. Indemnification
          </h2>
          <p>
            You agree to indemnify and hold us harmless from claims, damages
            and expenses (including reasonable legal fees) arising from your
            misuse of the Site or your breach of these Terms — including, for
            administrators, content published to your connected YouTube
            channel through the publishing feature.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            12. Availability &amp; Termination
          </h2>
          <p>
            We may modify, suspend or discontinue any part of the Site —
            including individual Deals, blog articles or the publishing
            feature — at any time. We may also restrict or terminate access
            for violations of these Terms. Sections that by their nature
            should survive termination (intellectual property, disclaimers,
            liability, indemnification) will survive.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            13. Governing Law
          </h2>
          <p>
            These Terms are governed by the laws applicable at the
            operator&apos;s principal place of business, without regard to
            conflict-of-laws rules. Statutory consumer rights that cannot be
            waived are unaffected.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            14. Changes to These Terms
          </h2>
          <p>
            We may update these Terms from time to time. The effective date at
            the top shows when the current version took effect, and continued
            use of the Site after changes are posted constitutes acceptance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            15. Contact
          </h2>
          <p>
            Questions about these Terms? Email{" "}
            <a
              className="text-cyan-300 underline decoration-cyan-300/40 transition hover:decoration-cyan-300"
              href={`mailto:${contact}`}
            >
              {contact}
            </a>
            . The Site is operated by {tenant.name} ({SITE_URL}).
          </p>
        </section>
      </article>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/30">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <p className="text-xs text-white/40">
              {tenant.name} — {tenant.tagline}
            </p>
          </div>
          <nav className="flex items-center gap-4 text-xs text-white/50">
            <Link href="/" className="transition hover:text-white">
              Deal Stream
            </Link>
            <Link href="/blog" className="transition hover:text-white">
              Blog
            </Link>
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="text-white/80">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

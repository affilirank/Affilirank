import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getCurrentTenant } from "@/lib/tenant";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  return {
    title: "Privacy Policy",
    description: `How ${tenant.name} (lifetimedealsbundle.com) collects, uses and protects your data — including Google/YouTube account data connected through the admin dashboard.`,
    alternates: { canonical: `${SITE_URL}/privacy` },
  };
}

export default async function PrivacyPolicy() {
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
            <ShieldCheck className="mr-1 inline h-4 w-4 -translate-y-0.5" />
            Your Privacy
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            Privacy Policy
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
            This Privacy Policy explains how {tenant.name} (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;), the operator of the website{" "}
            <span className="font-semibold text-white">{tenant.domain}</span>
            {" "}(&ldquo;Site&rdquo;), collects, uses, stores and protects
            information when you visit the Site or, if you are a site
            administrator, when you connect your Google/YouTube account to the
            Site&apos;s publishing tools.
          </p>
          <p>
            By using the Site you agree to this policy. If you do not agree,
            please do not use the Site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            1. Information We Collect
          </h2>
          <h3 className="font-semibold text-white/90">Site visitors</h3>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-white/85">Usage events.</strong> When you
              interact with deals (clicks, coupon copies, shares, search and
              filter actions, video-watch milestones), we record the event
              type, the page URL, your browser&apos;s user-agent string and the
              time. These records do not contain your name, email address or
              any account identifier.
            </li>
            <li>
              <strong className="text-white/85">Analytics data.</strong> If
              enabled, Google Analytics 4 and the Meta Pixel collect standard
              analytics information (device type, pages viewed, approximate
              location derived from IP) while you browse.
            </li>
            <li>
              <strong className="text-white/85">Embedded players.</strong>{" "}
              Deal pages may embed YouTube and Vimeo players. These third
              parties may set their own cookies and log your IP address when
              the player loads. We do not control their data practices; see
              their respective privacy policies.
            </li>
          </ul>
          <p>
            We do not require visitors to create an account, and we do not
            collect visitor names, email addresses or payment details.
          </p>
          <h3 className="mt-5 font-semibold text-white/90">
            Site administrators (dashboard users)
          </h3>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-white/85">Google / YouTube account data.</strong>{" "}
              When you connect a YouTube channel, we receive and store: your
              YouTube channel ID, channel title, channel avatar URL, and OAuth
              access and refresh tokens for the requested scopes (see section
              2). We never receive or store your Google account password.
            </li>
            <li>
              <strong className="text-white/85">OAuth credentials.</strong>{" "}
              The Google OAuth client ID and client secret used by this
              Site&apos;s publishing tools.
            </li>
            <li>
              <strong className="text-white/85">Session cookie.</strong> A
              single first-party cookie (<code className="rounded bg-white/10 px-1 py-0.5 text-xs">ltd_admin_session</code>)
              keeps dashboard administrators signed in for up to 7 days.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            2. Google &amp; YouTube Data (Important)
          </h2>
          <p>
            The Site integrates with the YouTube Data API to let administrators
            publish promotional videos to their own channel. This section
            describes exactly what Google user data we access, why, and how to
            remove it.
          </p>
          <h3 className="font-semibold text-white/90">What we access</h3>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">
                youtube.readonly
              </code>{" "}
              — to identify the connected channel (channel ID, title and
              public avatar) so you can confirm the right channel is linked.
            </li>
            <li>
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">
                youtube
              </code>{" "}
              — to upload and manage the videos and Shorts our tooling
              generates for your channel, on the schedule you configure.
            </li>
          </ul>
          <h3 className="font-semibold text-white/90">How we use it</h3>
          <p>
            Google user data is used solely to operate the publishing feature
            you explicitly enabled: identifying your channel, generating videos
            from the deal data you supply, uploading them to your channel, and
            refreshing access tokens so the connection keeps working. We do not
            sell, rent or share Google user data with any third party, and we
            do not use it for advertising or for training machine-learning or
            AI models. The only parties that process it are our infrastructure
            providers (hosting and database) acting on our instructions, and
            Google itself when we call the YouTube API on your behalf.
          </p>
          <h3 className="font-semibold text-white/90">
            Storage, security and deletion
          </h3>
          <p>
            Tokens and channel details are stored in our database (Supabase)
            alongside the rest of the Site&apos;s settings and are transmitted
            only over encrypted connections. Disconnecting your channel in the
            dashboard immediately deletes the stored tokens and channel data.
            You can also revoke our access at any time via{" "}
            <a
              className="text-cyan-300 underline decoration-cyan-300/40 transition hover:decoration-cyan-300"
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Account → Third-party access
            </a>
            , or email us at{" "}
            <a
              className="text-cyan-300 underline decoration-cyan-300/40 transition hover:decoration-cyan-300"
              href={`mailto:${contact}`}
            >
              {contact}
            </a>{" "}
            and we will delete it for you.
          </p>
          <p>
            The Site&apos;s use and transfer of information received from
            Google APIs adheres to the{" "}
            <a
              className="text-cyan-300 underline decoration-cyan-300/40 transition hover:decoration-cyan-300"
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements, and to the{" "}
            <a
              className="text-cyan-300 underline decoration-cyan-300/40 transition hover:decoration-cyan-300"
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube API Services Terms of Service
            </a>{" "}
            and{" "}
            <a
              className="text-cyan-300 underline decoration-cyan-300/40 transition hover:decoration-cyan-300"
              href="https://www.youtube.com/t/terms_privacypolicy"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube API privacy policies
            </a>
            . For Google&apos;s own handling of your data, see{" "}
            <a
              className="text-cyan-300 underline decoration-cyan-300/40 transition hover:decoration-cyan-300"
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google&apos;s Privacy Policy
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            3. How We Use Information
          </h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>To operate the deal stream, search, blog and embedded videos.</li>
            <li>
              To measure aggregate engagement (which deals are clicked, saved
              or shared) so we can improve the Site.
            </li>
            <li>
              To keep the dashboard secure (admin session cookie) and to
              provide the YouTube publishing feature to administrators who
              enable it.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            4. Cookies
          </h2>
          <p>
            The Site sets one strictly necessary first-party cookie: the
            administrator session cookie. Third-party services described above
            (Google Analytics, Meta Pixel, YouTube/Vimeo players) may set
            additional cookies when they are loaded. You can block or delete
            cookies in your browser settings; the public deal stream works
            without them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            5. Affiliate Links
          </h2>
          <p>
            Some links on the Site are affiliate links: if you purchase a
            product after clicking one, we may receive a commission from the
            vendor at no additional cost to you. When you click an affiliate
            link you leave our Site, and the vendor&apos;s own privacy policy
            then applies to your data. We never receive your payment details.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            6. Data Sharing
          </h2>
          <p>
            We do not sell personal data. We share data only with: (a) the
            infrastructure providers needed to run the Site (hosting on Vercel,
            database on Supabase, and Google when calling the YouTube API);
            (b) analytics providers, if enabled; and (c) authorities, where
            legally required.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            7. Data Retention
          </h2>
          <p>
            Anonymous usage events are retained for analytics purposes while
            the Site operates. YouTube tokens and channel data are kept only
            while the channel remains connected and are deleted immediately
            upon disconnect (see section 2). Vendor deal content and blog
            articles are public content, retained until removed by the site
            operator.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            8. Security
          </h2>
          <p>
            All traffic is served over HTTPS. Administrative access is
            password-protected with session cookies, and OAuth client secrets
            and tokens are stored server-side only. No method of transmission
            or storage is perfectly secure, but we take reasonable measures to
            protect the data we hold.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            9. Children&apos;s Privacy
          </h2>
          <p>
            The Site is a business-to-business marketplace for software deals
            and is not directed at children under 13 (or 16 in the EEA/UK). We
            do not knowingly collect data from children. If you believe a
            child has provided us data, contact us and we will delete it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            10. Your Rights
          </h2>
          <p>
            Depending on your jurisdiction (e.g. GDPR, UK GDPR, CCPA), you may
            have rights to access, correct, delete or restrict the use of your
            personal data. Because the Site collects almost no personal data
            from visitors, most requests will concern Google/YouTube data
            connected by an administrator, which you can delete yourself as
            described in section 2. For anything else, email us at{" "}
            <a
              className="text-cyan-300 underline decoration-cyan-300/40 transition hover:decoration-cyan-300"
              href={`mailto:${contact}`}
            >
              {contact}
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            11. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. The effective
            date at the top shows when the current version took effect.
            Material changes will be highlighted on this page.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-white">
            12. Contact
          </h2>
          <p>
            Questions about this policy or your data? Email{" "}
            <a
              className="text-cyan-300 underline decoration-cyan-300/40 transition hover:decoration-cyan-300"
              href={`mailto:${contact}`}
            >
              {contact}
            </a>
            . The data controller for {tenant.domain} is the operator of
            record for {SITE_NAME} ({SITE_URL}).
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
            <Link href="/privacy" className="text-white/80">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

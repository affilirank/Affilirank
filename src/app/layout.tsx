import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { AnalyticsScripts } from "@/components/analytics-scripts";
import { getLicenseState } from "@/lib/data";
import { getCurrentTenant } from "@/lib/tenant";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/constants";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  keywords: [
    "lifetime deals",
    "software deals",
    "appsumo alternatives",
    "lifetime software",
    "digital products",
    "VSL",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_TAGLINE,
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_TAGLINE,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const VIDEO_HOSTS = [
  "https://player.vimeo.com",
  "https://i.vimeocdn.com",
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
  "https://i.ytimg.com",
];

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_TAGLINE,
    logo: `${SITE_URL}/logo.svg`,
    sameAs: [SITE_URL],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_TAGLINE,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const [analytics] = await Promise.all([
    getCurrentTenant().then((t) =>
      getLicenseState(t.id).then((s) => s.features.has("analytics"))
    ),
  ]);

  return (
    <html lang="en" className="dark">
      <head>
        {VIDEO_HOSTS.map((h) => (
          <link key={h} rel="preconnect" href={h} />
        ))}
        <link rel="dns-prefetch" href="https://mckqmyekgnpzhjdcqqxg.supabase.co" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {analytics && <AnalyticsScripts />}
        {children}
      </body>
    </html>
  );
}

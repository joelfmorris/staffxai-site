import type { Metadata } from "next";
import { Inter, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument-serif",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StaffxAI — Autonomous Marketing Engines",
    template: "%s | StaffxAI",
  },
  description:
    "StaffxAI builds and runs autonomous marketing engines — content, SEO, outbound, lead gen — producing the output of a full marketing team for a fraction of the cost. Built and managed by a 20+ year marketing operator in Melbourne, Australia.",
  metadataBase: new URL("https://www.staffxai.com.au"),
  openGraph: {
    title: "StaffxAI — Autonomous Marketing Engines",
    description:
      "StaffxAI builds and runs autonomous marketing engines — content, SEO, outbound, lead gen — producing the output of a full marketing team for a fraction of the cost. Built and managed by a 20+ year marketing operator in Melbourne, Australia.",
    siteName: "StaffxAI",
    type: "website",
    locale: "en_AU",
    url: "https://www.staffxai.com.au",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VF5ZGJBPZB"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VF5ZGJBPZB');
          `}
        </Script>
      </head>
      <body className="font-sans bg-white text-brand antialiased">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}

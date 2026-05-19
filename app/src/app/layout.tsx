import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Inter is the de-facto SaaS / fintech / dashboard font — variable-weight,
// crisp at every size, used by Linear, Vercel, Stripe, Notion, Tectonic.
// Replaces the placeholder Geist that ships with create-next-app.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Monospaced font for code-y bits (URLs, slugs, schema names, etc.)
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Big Star CRM",
  description: "The Big Star Circus CRM — built for kids activity businesses.",
  icons: {
    icon: "/bigstar-logo.png",
    apple: "/bigstar-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-zinc-50 text-zinc-900"
        style={{ fontFamily: "var(--font-sans), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}

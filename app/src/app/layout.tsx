import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { createServerSupabaseAdmin } from "@/lib/supabase-server";
import { MusicPlayer } from "@/components/music-player";

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

export async function generateMetadata(): Promise<Metadata> {
  let name = 'Big Star Circus'
  let logo = '/bigstar-logo.png'
  try {
    const sb = await createServerSupabaseAdmin()
    const { data: t } = await sb.from('tenants').select('name, logo_url').order('created_at').limit(1).maybeSingle()
    if (t?.name) name = t.name
    if (t?.logo_url) logo = t.logo_url
  } catch { /* fall back to defaults */ }
  return {
    title: `${name} CRM`,
    description: `${name} — business platform.`,
    icons: { icon: logo, apple: logo },
  }
}

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
        {/* Mounted once here so the studio radio keeps playing across every page. */}
        <MusicPlayer />
      </body>
    </html>
  );
}

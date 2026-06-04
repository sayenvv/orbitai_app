import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { BRAND_ICON, BRAND_NAME } from "@orbit/ui";
import { chatConfig } from "@/lib/config";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(chatConfig.url),
  title: {
    default: `${BRAND_NAME} — AI Chat & Study Assistant`,
    template: `%s — ${BRAND_NAME}`,
  },
  description: `${BRAND_NAME} — AI-powered chat, document library, and learning assistants`,
  applicationName: BRAND_NAME,
  alternates: {
    canonical: "/",
  },
  keywords: [
    BRAND_NAME,
    "AI chat",
    "AI assistant",
    "document chat",
    "study assistant",
    "AI apps",
  ],
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — AI Chat & Study Assistant`,
    description: `${BRAND_NAME} — AI-powered chat, document library, and learning assistants`,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — AI Chat & Study Assistant`,
    description: `${BRAND_NAME} — AI-powered chat, document library, and learning assistants`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: BRAND_ICON,
    apple: BRAND_ICON,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="fixed inset-0 h-dvh w-full overflow-hidden overscroll-none touch-manipulation">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

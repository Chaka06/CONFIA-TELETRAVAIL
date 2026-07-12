import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";
const TITLE = "Confssa — Plateforme de télétravail rémunéré";
const DESCRIPTION =
  "Confssa est une plateforme professionnelle de télétravail rémunéré : missions vérifiées, progression par paliers transparente, retraits sécurisés et parrainage traçable.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_BASE_URL),
  title: {
    default: TITLE,
    template: "%s | Confssa",
  },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: APP_BASE_URL,
    siteName: "Confssa",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 800, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={200}>
            {children}
            <Toaster richColors closeButton position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

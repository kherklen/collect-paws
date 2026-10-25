import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { getLang } from "@/lib/i18n/server";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Collect Savar",
  description: "Capture the stray cats and dogs you spot, and help the ones that need it.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#faf8ff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${nunito.variable} h-full antialiased`}>
      <body className="h-full">
        <LanguageProvider initial={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}

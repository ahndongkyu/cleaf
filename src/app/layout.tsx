import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/theme-provider";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "CLEAR FC",
  description: "CLEAR FC 축구 클럽 앱",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-icon-180.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CLEAR FC",
  },
};

export const viewport: Viewport = {
  themeColor: "#20302d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

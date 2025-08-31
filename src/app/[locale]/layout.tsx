import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { PlayerProvider } from "../contexts/PlayerContext";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {setRequestLocale} from 'next-intl/server';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "中国铁道 | Chrailways",
  description: "China Railway Network - Secure Login Portal",
};

export function generateStaticParams() {
  return [{locale: 'en'}, {locale: 'es'}, {locale: 'zh'}];
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: {locale: string};
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <PlayerProvider>
              {children}
            </PlayerProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import type React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { NostrProvider } from '@/components/nostr-provider';
import { Navbar } from '@/components/navbar';
import { UIAnimationProvider } from '@/components/ui-animation-context';
import { ConditionalNavigation } from '@/components/conditional-navigation';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import { PwaSplashScreen } from '@/components/pwa-splash-screen';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'A TO ₿ - Decentralized Package Delivery',
  description: 'A decentralized package delivery platform built on Nostr technology',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }],
    shortcut: '/icon-512.png',
    apple: '/icon-512.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/icon-512.png',
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <NostrProvider>
          <UIAnimationProvider>
            <Navbar />
            <div className="flex-1 flex flex-col pb-24 md:pb-0">
              {children}
            </div>
            <ConditionalNavigation />
            <PwaInstallPrompt />
            <PwaSplashScreen />
            <Toaster />
          </UIAnimationProvider>
        </NostrProvider>
      </body>
    </html>
  );
}

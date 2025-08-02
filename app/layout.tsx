import type React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { NostrProvider } from '@/components/nostr-provider';
import { Navbar } from '@/components/navbar';
import { UIAnimationProvider } from '@/components/ui-animation-context';
import { ConditionalNavigation } from '@/components/conditional-navigation';
import { PWAInstallModal } from '@/components/pwa-install-modal';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'A TO ₿ - Decentralized Package Delivery',
  description: 'A decentralized package delivery platform built on Nostr technology',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/app-icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/app-icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/app-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#00262D',
  viewportFit: 'cover',
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
            <Toaster />
            {process.env.NODE_ENV === 'production' && <PWAInstallModal autoShow={true} />}
          </UIAnimationProvider>
        </NostrProvider>
      </body>
    </html>
  );
}

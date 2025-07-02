'use client';

import { useNostr } from '@/components/nostr-provider';
import { Footer } from '@/components/ui/footer';
import { BottomNavbar } from './bottom-navbar';

export function ConditionalNavigation() {
  const { isLoggedIn } = useNostr();
  
  if (isLoggedIn) {
    return <BottomNavbar />;
  }
  
  return <Footer />;
} 
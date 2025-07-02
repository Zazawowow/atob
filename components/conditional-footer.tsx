'use client';

import { useNostr } from '@/components/nostr-provider';
import { Footer } from '@/components/ui/footer';

export function ConditionalFooter() {
  const { isLoggedIn } = useNostr();
  
  // Only show footer when user is not logged in
  if (isLoggedIn) {
    return null;
  }
  
  return <Footer />;
} 
'use client';

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface UIAnimationContextType {
  showUI: boolean;
  setShowUI: (show: boolean) => void;
}

const UIAnimationContext = createContext<UIAnimationContextType | undefined>(undefined);

export function UIAnimationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [showUI, setShowUI] = useState(pathname !== '/');

  const value = useMemo(() => ({ showUI, setShowUI }), [showUI]);

  return (
    <UIAnimationContext.Provider value={value}>
      {children}
    </UIAnimationContext.Provider>
  );
}

export function useUIAnimation() {
  const context = useContext(UIAnimationContext);
  if (context === undefined) {
    throw new Error('useUIAnimation must be used within a UIAnimationProvider');
  }
  return context;
} 
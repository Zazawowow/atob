'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIAnimationContextType {
  showUI: boolean;
  setShowUI: (show: boolean) => void;
}

const UIAnimationContext = createContext<UIAnimationContextType | undefined>(undefined);

export function UIAnimationProvider({ children }: { children: ReactNode }) {
  const [showUI, setShowUI] = useState(false);

  return (
    <UIAnimationContext.Provider value={{ showUI, setShowUI }}>
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
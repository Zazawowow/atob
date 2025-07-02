'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setInstallPrompt(null);
        }
      } catch (error) {
        console.error('Install prompt failed:', error);
      }
    }
  };

  // Only show if we have an install prompt and app isn't installed
  if (!installPrompt || isAppInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Button
        onClick={handleInstallClick}
        className="bg-gradient-to-r from-[#FF7170] to-[#FFE57F] text-white border-0 hover:shadow-glow-orange transition-all duration-300 animate-fade-in shadow-lg"
        size="lg"
      >
        <Download className="mr-2 h-5 w-5" />
        Install App
      </Button>
    </div>
  );
} 
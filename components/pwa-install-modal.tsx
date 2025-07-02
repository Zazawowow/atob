'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone, Monitor, Chrome } from 'lucide-react';
import Image from 'next/image';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallModalProps {
  trigger?: React.ReactNode;
  autoShow?: boolean;
}

export function PWAInstallModal({ trigger, autoShow = false }: PWAInstallModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [triggeredManually, setTriggeredManually] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone || isInWebAppiOS);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
      
      // Show floating button if user previously dismissed and we have autoShow enabled
      if (autoShow && localStorage.getItem('pwa-install-dismissed')) {
        setShowFloatingButton(true);
      }
      
      // Auto-show modal if enabled and not already dismissed
      if (autoShow && !localStorage.getItem('pwa-install-dismissed')) {
        setIsOpen(true);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      setIsOpen(false);
      setShowFloatingButton(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [autoShow]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Clean up
      setDeferredPrompt(null);
      setCanInstall(false);
    } catch (error) {
      console.error('Error during installation:', error);
    } finally {
      setInstalling(false);
      setIsOpen(false);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    if (!triggeredManually && autoShow) {
      localStorage.setItem('pwa-install-dismissed', 'true');
      setShowFloatingButton(true); // Show floating button after dismissing
    }
    setTriggeredManually(false);
  };

  const handleTriggerClick = () => {
    if (canInstall && deferredPrompt) {
      setTriggeredManually(true);
      setIsOpen(true);
    }
  };

  const handleFloatingButtonClick = () => {
    setTriggeredManually(true);
    setIsOpen(true);
    setShowFloatingButton(false); // Hide floating button when opening modal
  };

  // Don't show if already installed
  if (isInstalled && !trigger) {
    return null;
  }

  const InstallContent = () => (
    <div className="bg-black/90 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-0 overflow-hidden">
      <div className="relative">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 p-6 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg">
                <Download className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-cyber text-off-white">
                  Install A TO ₿
                </h2>
                <p className="text-gray-400 mt-1">
                  Get the full app experience
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* App Preview */}
          <div className="flex justify-center">
            <div className="relative w-64 h-32 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-lg border border-purple-500/20 flex items-center justify-center">
              <Image
                src="/app-icon.png"
                alt="A TO ₿ App Icon"
                width={48}
                height={48}
                className="rounded-lg"
              />
              <div className="absolute bottom-2 left-2 text-xs text-gray-400">
                A TO ₿
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-300">
              <Monitor className="h-5 w-5 text-cyan-400" />
              <span>Desktop app experience</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Smartphone className="h-5 w-5 text-purple-400" />
              <span>Quick access from desktop</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Chrome className="h-5 w-5 text-blue-400" />
              <span>Works offline</span>
            </div>
          </div>

          {/* Install Button */}
          <div className="flex gap-3">
            {canInstall && deferredPrompt ? (
              <Button
                onClick={handleInstall}
                disabled={installing}
                className="flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-purple-glow/20 transition-all duration-300"
              >
                {installing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Installing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Install App
                  </div>
                )}
              </Button>
            ) : (
              <div className="flex-1 text-center text-gray-400 text-sm py-3">
                <p>Installation not available</p>
                <p className="text-xs mt-1">Try using Chrome or Edge browser</p>
              </div>
            )}
            
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="px-6 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Maybe Later
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Installing creates a desktop shortcut and enables offline access</p>
            <p>You can uninstall anytime from your browser settings</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {trigger && !isInstalled && canInstall && deferredPrompt && (
        <div onClick={handleTriggerClick}>
          {trigger}
        </div>
      )}
      
      {trigger && (!canInstall || !deferredPrompt || isInstalled) && (
        <div onClick={() => {}}>
          <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
            {trigger}
          </div>
        </div>
      )}
      
      {/* Bottom-right positioned modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-[100] max-w-sm">
          <div className="animate-slide-up-fade">
            <InstallContent />
          </div>
        </div>
      )}

      {/* Floating circular install button */}
      {showFloatingButton && canInstall && deferredPrompt && !isOpen && (
        <div className="fixed bottom-6 right-6 z-[90]">
          <button
            onClick={handleFloatingButtonClick}
            className="group relative w-14 h-14 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full shadow-lg hover:shadow-purple-glow/50 transform hover:scale-110 transition-all duration-300 animate-pulse-slow"
            title="Install A TO ₿ App"
          >
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 blur-md scale-150 group-hover:scale-[1.7] transition-transform duration-300"></div>
            
            {/* Inner button */}
            <div className="relative flex items-center justify-center w-full h-full">
              <Download className="h-6 w-6 text-white group-hover:animate-bounce" />
            </div>

            {/* Notification dot */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black animate-pulse"></div>
          </button>
        </div>
      )}
    </>
  );
} 
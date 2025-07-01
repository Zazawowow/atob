'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { NostrLogin } from './nostr-login';
import { NostrSignup } from './nostr-signup';
import { Button } from './ui/button';

interface NostrAuthModalProps {
  trigger?: React.ReactNode;
  onAuth?: (publicKey: string) => void;
}

export function NostrAuthModal({ trigger, onAuth }: NostrAuthModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'login' | 'signup'>('login');

  const handleLogin = (publicKey: string) => {
    if (onAuth) {
      onAuth(publicKey);
    }
    setIsOpen(false);
  };

  const handleSignup = (publicKey: string, privateKey: string) => {
    // You might want to handle the privateKey differently
    if (onAuth) {
      onAuth(publicKey);
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            Login with Nostr
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 bg-transparent border-none">
        {view === 'login' ? (
          <NostrLogin
            onLogin={handleLogin}
            onSignup={() => setView('signup')}
          />
        ) : (
          <NostrSignup
            onSignup={handleSignup}
            onBackToLogin={() => setView('login')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
} 
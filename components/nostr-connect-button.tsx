'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getNpub } from '@/lib/nostr-keys';
import { useNostr } from '@/components/nostr-provider';
import { Key, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function NostrConnectButton() {
  const { publicKey, isReady, isLoggedIn, logout } = useNostr();
  const [npub, setNpub] = useState<string>('');

  useEffect(() => {
    if (publicKey) {
      try {
        const fullNpub = getNpub(publicKey);
        setNpub(fullNpub.slice(0, 10) + '...' + fullNpub.slice(-4));
      } catch (error) {
        console.error('Error formatting npub:', error);
        setNpub(publicKey.slice(0, 8) + '...');
      }
    }
  }, [publicKey]);

  // Custom hollow button style with blue outline
  const gradientButtonClass =
    'bg-transparent text-blue-400 border border-blue-400 hover:border-blue-300 hover:text-blue-300 hover:shadow-blue-glow transform hover:-translate-y-1 transition-all duration-300';

  if (!isReady) {
    return (
      <Button disabled className='flex items-center gap-2 bg-black/40 border border-gray-500/50 text-gray-400'>
        <span className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full'></span>
        Loading...
      </Button>
    );
  }

  if (isLoggedIn) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={`flex items-center gap-2 cursor-pointer ${gradientButtonClass}`}
          >
            <User className='h-4 w-4' />
            {npub}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='bg-black/90 border border-cyan-500/30 backdrop-blur-lg'>
          <div>
            <DropdownMenuLabel className='text-cyan-300'>Account</DropdownMenuLabel>
            <DropdownMenuSeparator className='bg-cyan-500/20' />
            <Link href='/profile'>
              <DropdownMenuItem className='cursor-pointer text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400 focus:bg-cyan-500/10 focus:text-cyan-400'>
                <User className='mr-2 h-4 w-4' />
                <span>Profile</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem onClick={logout} className='cursor-pointer text-gray-300 hover:bg-pink-500/10 hover:text-pink-400 focus:bg-pink-500/10 focus:text-pink-400'>
              <LogOut className='mr-2 h-4 w-4' />
              <span>Logout</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link href='/login'>
      <Button className={`flex items-center gap-2 ${gradientButtonClass}`}>
        <Key className='h-4 w-4' />
        Login with Nostr
      </Button>
    </Link>
  );
}

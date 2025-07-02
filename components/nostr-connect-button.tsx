'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getNpub } from '@/lib/nostr-keys';
import { useNostr } from '@/components/nostr-provider';
import { Key, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NostrAuthModal } from './nostr-auth-modal';
import { getUserProfile } from '@/lib/nostr-service';

export function NostrConnectButton() {
  const { publicKey, isReady, isLoggedIn, logout, login } = useNostr();
  const [npub, setNpub] = useState<string>('');
  const [profile, setProfile] = useState<{
    name?: string;
    display_name?: string;
    picture?: string;
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

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

  // Fetch user profile when publicKey changes
  useEffect(() => {
    if (publicKey && isLoggedIn) {
      setLoadingProfile(true);
      getUserProfile(publicKey)
        .then((profileData) => {
          setProfile(profileData);
        })
        .catch((error) => {
          console.error('Failed to fetch profile:', error);
        })
        .finally(() => {
          setLoadingProfile(false);
        });
    } else {
      setProfile(null);
    }
  }, [publicKey, isLoggedIn]);

  // Custom hollow button style with purple outline
  const gradientButtonClass = 'btn-outline-purple';

  if (!isReady) {
    return (
      <Button disabled className='flex items-center gap-2 bg-black/40 border border-gray-500/50 text-gray-400'>
        <span className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full'></span>
        Loading...
      </Button>
    );
  }

  if (isLoggedIn) {
    const displayName = profile?.display_name || profile?.name || npub;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={`flex items-center gap-2 cursor-pointer ${gradientButtonClass}`}
          >
            {profile?.picture ? (
              <div className='w-4 h-4 rounded-full overflow-hidden bg-gray-300 flex-shrink-0'>
                <Image
                  src={profile.picture}
                  alt='Profile'
                  width={16}
                  height={16}
                  className='w-full h-full object-cover'
                  onError={(e) => {
                    // Fallback to user icon if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <User className='h-4 w-4 hidden' />
              </div>
            ) : (
              <User className='h-4 w-4' />
            )}
            {loadingProfile ? 'Loading...' : displayName}
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
    <NostrAuthModal
      trigger={
        <Button className={`flex items-center gap-2 ${gradientButtonClass}`}>
          <Key className='h-4 w-4' />
          Login with Nostr
        </Button>
      }
      onAuth={login}
    />
  );
}

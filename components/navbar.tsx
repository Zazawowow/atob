'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NostrConnectButton } from '@/components/nostr-connect-button';
import { useNostr } from '@/components/nostr-provider';
import { useUIAnimation } from '@/components/ui-animation-context';
import { NostrAuthModal } from './nostr-auth-modal';
import { PostJobModal } from '@/components/post-job-modal';
import { PostPackageModal } from '@/components/post-package-modal';
import { Truck } from 'lucide-react';

export function Navbar() {
  const { isLoggedIn, isReady, login } = useNostr();
  const { showUI } = useUIAnimation();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const pathname = usePathname();

  // Handle scroll effect for navbar
  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If not ready yet, show nothing (will be handled by page loading state)
  if (!mounted || !isReady) {
    return null;
  }

  const ProtectedDesktopLink = ({ href, children, hoverColor, activeColor }: { href: string, children: React.ReactNode, hoverColor: string, activeColor: string }) => {
    let isActive = isLoggedIn && pathname.startsWith(href);

    if (isLoggedIn) {
      return (
        <Link
          href={href}
          className={`text-gray-300 ${hoverColor} transition-colors font-medium ${isActive ? activeColor : ''}`}
        >
          {children}
        </Link>
      );
    }
    
    return (
      <NostrAuthModal
        trigger={
          <button className={`text-gray-300 ${hoverColor} transition-colors font-medium`}>
            {children}
          </button>
        }
        onAuth={login}
      />
    );
  };

  const PostButton = ({ children, onClick, hoverColor }: { children: React.ReactNode, onClick: () => void, hoverColor: string }) => {
    if (isLoggedIn) {
      return (
        <button
          onClick={onClick}
          className={`text-gray-300 ${hoverColor} transition-colors font-medium`}
        >
          {children}
        </button>
      );
    }
    
    return (
      <NostrAuthModal
        trigger={
          <button className={`text-gray-300 ${hoverColor} transition-colors font-medium`}>
            {children}
          </button>
        }
        onAuth={login}
      />
    );
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-1000 ${
          scrolled ? 'bg-[#0A0A0A] backdrop-blur-lg shadow-lg' : 'bg-transparent'
        } ${
          showUI ? 'animate-slide-up-fade opacity-100' : 'opacity-0'
        }`}
      >
        <div className='container mx-auto px-4 py-4 flex justify-between items-center'>
          <Link href='/' className='flex items-center gap-2'>
            <span className='font-cyber font-bold text-xl text-off-white drop-shadow-md'>A TO ₿</span>
          </Link>

          <div className='flex items-center gap-6'>
            {/* Desktop-only Navigation Links */}
            <div className='hidden md:flex items-center gap-6'>
              <PostButton onClick={() => setShowPackageModal(true)} hoverColor='hover:text-cyan-400'>
                Post Package
              </PostButton>
              <PostButton onClick={() => setShowJobModal(true)} hoverColor='hover:text-green-400'>
                Post Job
              </PostButton>
              <ProtectedDesktopLink href='/view-packages' hoverColor='hover:text-purple-400' activeColor='text-purple-400'>
                Find Jobs
              </ProtectedDesktopLink>
              <ProtectedDesktopLink href='/my-activities' hoverColor='hover:text-pink-400' activeColor='text-pink-400'>
                <span>My Activities</span>
              </ProtectedDesktopLink>
            </div>
            
            {/* Login button visible on all screen sizes */}
            <NostrConnectButton />
          </div>
        </div>
      </nav>

      {/* Modals */}
      <PostJobModal
        open={showJobModal}
        onOpenChange={setShowJobModal}
      />
      
      <PostPackageModal
        open={showPackageModal}
        onOpenChange={setShowPackageModal}
      />
    </>
  );
}

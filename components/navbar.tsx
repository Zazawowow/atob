'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Menu, X } from 'lucide-react';
import { NostrConnectButton } from '@/components/nostr-connect-button';
import { useNostr } from '@/components/nostr-provider';
import { useUIAnimation } from '@/components/ui-animation-context';
import { NostrAuthModal } from './nostr-auth-modal';

export function Navbar() {
  const { isLoggedIn, isReady, login } = useNostr();
  const { showUI } = useUIAnimation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  const ProtectedDesktopLink = ({ href, children, hoverColor }: { href: string, children: React.ReactNode, hoverColor: string }) => {
    if (isLoggedIn) {
      return (
        <Link
          href={href}
          className={`text-gray-300 ${hoverColor} transition-colors font-medium`}
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

  const ProtectedMobileLink = ({ href, children, hoverBg, hoverText, hoverBorder }: { 
    href: string, 
    children: React.ReactNode, 
    hoverBg: string, 
    hoverText: string, 
    hoverBorder: string 
  }) => {
    if (isLoggedIn) {
      return (
        <Link
          href={href}
          className={`py-3 px-4 ${hoverBg} rounded-lg transition-colors text-gray-300 ${hoverText} border border-transparent ${hoverBorder}`}
          onClick={() => setIsMenuOpen(false)}
        >
          {children}
        </Link>
      );
    }
    
    return (
      <NostrAuthModal
        trigger={
          <button className={`w-full text-left py-3 px-4 ${hoverBg} rounded-lg transition-colors text-gray-300 ${hoverText} border border-transparent ${hoverBorder}`}>
            {children}
          </button>
        }
        onAuth={login}
      />
    );
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-1000 ${
        scrolled ? 'bg-black/80 backdrop-blur-lg shadow-lg border-b border-cyan-500/20' : 'bg-transparent'
      } ${
        showUI ? 'animate-slide-up-fade opacity-100' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className='container mx-auto px-4 py-4 flex justify-between items-center'>
        <Link href='/' className='flex items-center gap-2'>
          <span className='font-cyber font-bold text-xl text-white drop-shadow-md'>A TO ₿</span>
        </Link>

        {/* Desktop Navigation */}
        <div className='hidden md:flex items-center gap-6'>
          <ProtectedDesktopLink href='/post-package' hoverColor='hover:text-cyan-400'>
            Post Package
          </ProtectedDesktopLink>
          <ProtectedDesktopLink href='/view-packages' hoverColor='hover:text-purple-400'>
            View Map
          </ProtectedDesktopLink>
          <ProtectedDesktopLink href='/my-deliveries' hoverColor='hover:text-pink-400'>
            My Deliveries
          </ProtectedDesktopLink>
          <NostrConnectButton />
        </div>

        {/* Mobile Menu Button */}
        <button
          className='md:hidden text-white'
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className='md:hidden bg-black/90 border-t border-cyan-500/20 shadow-lg animate-fade-in backdrop-blur-lg'>
          <div className='container mx-auto px-4 py-4 flex flex-col gap-4'>
            <ProtectedMobileLink 
              href='/post-package' 
              hoverBg='hover:bg-cyan-500/10' 
              hoverText='hover:text-cyan-400' 
              hoverBorder='hover:border-cyan-500/30'
            >
              Post Package
            </ProtectedMobileLink>
            <ProtectedMobileLink 
              href='/view-packages' 
              hoverBg='hover:bg-purple-500/10' 
              hoverText='hover:text-purple-400' 
              hoverBorder='hover:border-purple-500/30'
            >
              View Map
            </ProtectedMobileLink>
            <ProtectedMobileLink 
              href='/my-deliveries' 
              hoverBg='hover:bg-pink-500/10' 
              hoverText='hover:text-pink-400' 
              hoverBorder='hover:border-pink-500/30'
            >
              My Deliveries
            </ProtectedMobileLink>
            <div className='py-3 px-4'>
              <NostrConnectButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

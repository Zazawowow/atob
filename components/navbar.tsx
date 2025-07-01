'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Menu, X } from 'lucide-react';
import { NostrConnectButton } from '@/components/nostr-connect-button';
import { useNostr } from '@/components/nostr-provider';
import { useUIAnimation } from '@/components/ui-animation-context';

export function Navbar() {
  const { isLoggedIn, isReady } = useNostr();
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
          <Link
            href={isLoggedIn ? '/post-package' : '/login'}
            className='text-gray-300 hover:text-cyan-400 transition-colors font-medium'
          >
            Post Package
          </Link>
          <Link
            href={isLoggedIn ? '/view-packages' : '/login'}
            className='text-gray-300 hover:text-purple-400 transition-colors font-medium'
          >
            View Map
          </Link>
          <Link
            href={isLoggedIn ? '/my-deliveries' : '/login'}
            className='text-gray-300 hover:text-pink-400 transition-colors font-medium'
          >
            My Deliveries
          </Link>
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
            <Link
              href={isLoggedIn ? '/post-package' : '/login'}
              className='py-3 px-4 hover:bg-cyan-500/10 rounded-lg transition-colors text-gray-300 hover:text-cyan-400 border border-transparent hover:border-cyan-500/30'
              onClick={() => setIsMenuOpen(false)}
            >
              Post Package
            </Link>
            <Link
              href={isLoggedIn ? '/view-packages' : '/login'}
              className='py-3 px-4 hover:bg-purple-500/10 rounded-lg transition-colors text-gray-300 hover:text-purple-400 border border-transparent hover:border-purple-500/30'
              onClick={() => setIsMenuOpen(false)}
            >
              View Map
            </Link>
            <Link
              href={isLoggedIn ? '/my-deliveries' : '/login'}
              className='py-3 px-4 hover:bg-pink-500/10 rounded-lg transition-colors text-gray-300 hover:text-pink-400 border border-transparent hover:border-pink-500/30'
              onClick={() => setIsMenuOpen(false)}
            >
              My Deliveries
            </Link>
            <div className='py-3 px-4 w-full'>
              <NostrConnectButton fullWidth />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

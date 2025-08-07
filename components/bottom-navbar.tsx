'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNostr } from '@/components/nostr-provider';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Plus, User } from 'lucide-react';
import { PostChoiceModal } from '@/components/post-choice-modal';
import { PostJobModal } from '@/components/post-job-modal';
import { PostPackageModal } from '@/components/post-package-modal';

// Admin npub - this is the only admin user
const ADMIN_NPUB = 'npub10wzfa7jkqj6c65xyr93hhxrns37ml9tss82jvymv8fymwdtu6cts3h6pvr';

// Custom SVG Icons
const MapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 107.86 122.88" fill="currentColor">
    <path d="M86.07,81.78c13.22,4.16,21.79,10.81,21.79,18.31,0,12.59-24.14,22.79-53.93,22.79S0,112.68,0,100.09c0-7.68,9-14.47,22.73-18.6.5.76,1,1.52,1.51,2.26q1.61,2.34,3.33,4.6c-9.62,2.58-15.79,6.56-15.79,11,0,7.78,18.67,14.09,41.71,14.09s41.7-6.31,41.7-14.09c0-4.16-5.34-7.9-13.84-10.48,1.67-2.29,3.24-4.67,4.72-7.12ZM71.65,84.49A70.47,70.47,0,0,1,56.22,97.26a2.17,2.17,0,0,1-2.48.08A87,87,0,0,1,32.27,78.19C24.45,68.38,19.53,57.5,17.84,47,16.13,36.4,17.73,26.18,23,17.87A35.87,35.87,0,0,1,31,9C38.47,3.08,47-.06,55.47,0A34.42,34.42,0,0,1,78.68,9.48,34.33,34.33,0,0,1,84.88,17c5.68,9.37,6.91,21.31,4.41,33.41a73.54,73.54,0,0,1-17.64,34v0Zm-17.8-65.6A18.25,18.25,0,1,1,35.6,37.14,18.24,18.24,0,0,1,53.85,18.89Z"/>
  </svg>
);

const ViewPackagesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 512 340.88" fill="currentColor">
    <path d="m359.22 83.71-40.13-.27V29.25c0-8.07-3.27-15.36-8.6-20.65C305.2 3.27,297.91 0,289.84 0H29.26C20.37 0,12.38 4.02,7 10.33-.62 19.28.01 27.94.01 38.32V263.2c0 15.91 13.12 30.01 29.25 30.01h47.77c4.4 0 7.93-3.54 7.93-7.93s-3.53-7.92-7.93-7.92v.04H29.21c-7.46 0-13.35-6.95-13.35-14.2V38.09c0-6.96-1.35-13.06 4.01-18.35a13.32 13.32 0 0 1 9.39-3.88h260.58c3.68 0 7.04 1.52 9.46 3.94 2.41 2.42 3.94 5.77 3.94 9.45V277.4h-62.92c-4.39 0-7.93 3.54-7.93 7.93s3.54 7.92 7.93 7.92h70.84c4.39 0 7.93-3.53 7.93-7.92v-9.01h32.03c3.62-82.49 122.08-93.87 134.13 0h26.02c6.7-80.43-33.02-111.69-93.43-118.76-4.34-18.88-12.63-36.4-21.99-53.72-11.13-20.59-13.73-19.76-36.63-20.13zM159.48 43.69c6.18 0 12.23.7 18.03 2.02 5.97 1.35 11.7 3.37 17.09 5.96.58.28.83.99.55 1.57-.09.19-.22.34-.38.45l-6.14 4.94-5.76 4.79c-.33.28-.77.34-1.15.2-3.5-1.27-7.16-2.25-10.92-2.91-3.66-.64-7.45-.98-11.31-.98-17.32 0-33.77 6.81-46.01 19.06-12.26 12.27-19.07 28.68-19.07 46.02 0 26.38 15.93 50.11 40.19 60.15 33.28 13.79 71.42-2.34 85.04-35.26a64.96 64.96 0 0 0 4.93-24.89c0-4.22-.4-8.36-1.21-12.5-.06-.36.04-.72.25-.98l5.2-6.68 5.36-6.69a1.17 1.17 0 0 1 2.01.36c2.95 8.52 4.43 17.48 4.43 26.49 0 10.98-2.19 21.46-6.15 31.01-16.98 41.02-64.5 61.14-105.98 43.96-30.14-12.47-50.12-41.97-50.12-74.97 0-21.57 8.51-42.11 23.76-57.36 15.25-15.25 35.79-23.76 57.36-23.76zm-1.83 189.79c-29.65 0-53.7 24.05-53.7 53.7 0 29.65 24.05 53.7 53.7 53.7 29.65 0 53.69-24.05 53.69-53.7-.04-29.65-24.04-53.7-53.69-53.7zm0 33.06c-11.37 0-20.65 9.22-20.65 20.64 0 11.38 9.23 20.65 20.65 20.65 11.37 0 20.65-9.23 20.65-20.65-.05-11.42-9.28-20.64-20.65-20.64zm260.37-40.96c-29.64 0-53.69 24.05-53.69 53.7 0 29.65 24.05 53.7 53.69 53.7 29.65 0 53.7-24.05 53.7-53.7 0-29.65-24.05-53.7-53.7-53.7zm-20.64 53.7c0 11.38 9.22 20.65 20.64 20.65s20.65-9.23 20.65-20.65c0-11.42-9.23-20.64-20.65-20.64-11.39 0-20.64 9.24-20.64 20.64zm-34.31-172.65-24.19-.45v51.47h51.24c-6.32-18.36-15.67-35.19-27.05-51.02z"/>
    <path d="m122.55 112.76 18.14-.24 1.35.35c3.66 2.11 7.11 4.52 10.33 7.26 2.33 1.96 4.55 4.11 6.66 6.44 6.51-10.48 13.44-20.09 20.77-28.93 8.02-9.69 16.54-18.48 25.48-26.5l1.77-.69h19.79l-3.99 4.44c-12.27 13.63-23.39 27.71-33.45 42.24a411.664 411.664 0 0 0-27.05 45l-2.49 4.8-2.28-4.89c-4.22-9.06-9.27-17.37-15.3-24.8-6.02-7.43-13.04-14.02-21.21-19.63l1.48-4.85z"/>
  </svg>
);

export function BottomNavbar() {
  const { isLoggedIn } = useNostr();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (isLoggedIn) {
        try {
          // const userNpub = await getUserNpub();
          // setIsAdmin(userNpub === ADMIN_NPUB);
          // Temporarily commenting out to fix build issue
          setIsAdmin(false); // Assume not admin for now
        } catch (error) {
          console.error('Failed to check admin status:', error);
        }
      }
    };
    
    checkAdmin();
  }, [isLoggedIn]);

  // This navbar should be visible when logged in on any page
  const shouldShowNavbar = isLoggedIn;

  if (!shouldShowNavbar) {
    return null;
  }

  const navItems = [
    { href: '/view-packages', label: 'Browse', icon: <MapIcon /> },
    { href: '/my-activities', label: 'My Activities', icon: <ViewPackagesIcon /> },
  ];

  const handlePlusClick = () => {
    setShowChoiceModal(true);
  };

  const handleJobSelect = () => {
    setShowJobModal(true);
  };

  const handlePackageSelect = () => {
    setShowPackageModal(true);
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm border-t border-cyan-500/20 z-40 pb-safe">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          {/* Left nav items */}
          <div className="flex-1 flex justify-around">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center py-2 transition-all duration-300',
                    isActive
                      ? 'text-cyan-300'
                      : 'text-gray-500 hover:text-cyan-400'
                  )}
                >
                  <div className={cn(
                    'transition-all duration-300',
                    isActive ? 'text-glow-cyan-wide' : ''
                  )}>
                    {item.icon}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Center + button */}
          <div className="flex justify-center">
            <button
              onClick={handlePlusClick}
              className="flex flex-col items-center justify-center py-2 transition-all duration-300 text-cyan-400 hover:text-cyan-300"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-cyan-500/25 transition-all duration-300">
                <Plus className="h-6 w-6 text-off-white" />
              </div>
            </button>
          </div>

          {/* Right nav items - Account */}
          <div className="flex-1 flex justify-around">
            <Link
              href="/profile"
              className={cn(
                'flex flex-col items-center justify-center py-2 transition-all duration-300',
                pathname.startsWith('/profile')
                  ? 'text-cyan-300'
                  : 'text-gray-500 hover:text-cyan-400'
              )}
            >
              <div className={cn(
                'transition-all duration-300',
                pathname.startsWith('/profile') ? 'text-glow-cyan-wide' : ''
              )}>
                <User className="w-5 h-5" />
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Modals */}
      <PostChoiceModal
        open={showChoiceModal}
        onOpenChange={setShowChoiceModal}
        onSelectJob={handleJobSelect}
        onSelectPackage={handlePackageSelect}
      />
      
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
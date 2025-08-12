'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNostr } from '@/components/nostr-provider';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Plus, User, MapPin, Package, ListChecks, Settings } from 'lucide-react';
import { PostChoiceModal } from '@/components/post-choice-modal';
import { PostJobModal } from '@/components/post-job-modal';
import { PostPackageModal } from '@/components/post-package-modal';

// Admin npub - this is the only admin user
const ADMIN_NPUB = 'npub10wzfa7jkqj6c65xyr93hhxrns37ml9tss82jvymv8fymwdtu6cts3h6pvr';

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
  if (!shouldShowNavbar) return null;

  const handlePlusClick = () => setShowChoiceModal(true);
  const handleJobSelect = () => setShowJobModal(true);
  const handlePackageSelect = () => setShowPackageModal(true);

  type Item =
    | { key: string; type: 'link'; href: string; label: string; icon: React.ReactNode }
    | { key: string; type: 'action'; onClick: () => void; label: string; icon: React.ReactNode };

  const items: Item[] = [
    { key: 'browse', type: 'link', href: '/view-packages', label: 'Find', icon: <MapPin className='w-6 h-6' /> },
    { key: 'activities', type: 'link', href: '/my-activities', label: 'Activities', icon: <ListChecks className='w-6 h-6' /> },
    { key: 'post', type: 'action', onClick: handlePlusClick, label: 'Post', icon: <Plus className='w-6 h-6' /> },
    { key: 'profile', type: 'link', href: '/profile', label: 'Profile', icon: <User className='w-6 h-6' /> },
    { key: 'settings', type: 'link', href: '/settings', label: 'Settings', icon: <Settings className='w-6 h-6' /> },
  ];

  const renderItem = (item: Item) => {
    const baseClass = 'group flex flex-col items-center justify-center py-2 px-2';
    const commonInner = (
      <>
        <div className='rounded-xl p-2 transition-colors duration-200 group-hover:bg-white/10'>
          {item.icon}
        </div>
        <span className='sr-only'>{item.label}</span>
      </>
    );

    if (item.type === 'link') {
      const isActive = pathname.startsWith(item.href);
      return (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            baseClass,
            isActive ? 'text-cyan-300' : 'text-gray-400 hover:text-cyan-200'
          )}
        >
          <div className={cn('transition-all duration-200', isActive ? 'text-glow-cyan-wide' : '')}>
            {commonInner}
          </div>
        </Link>
      );
    }

    // action
    return (
      <button
        key={item.key}
        onClick={item.onClick}
        className={cn(baseClass, 'text-gray-200 hover:text-cyan-200')}
        aria-label={item.label}
      >
        <div className='rounded-full w-12 h-12 bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg hover:shadow-cyan-500/25 transition-all duration-300'>
          <Plus className='w-6 h-6 text-off-white' />
        </div>
        <span className='sr-only'>Post</span>
      </button>
    );
  };

  return (
    <>
      <nav className='md:hidden fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-md border-t border-white/10 z-40 pb-safe'>
        <div className='container mx-auto px-3 py-2'>
          <div className='grid grid-cols-5 items-center'>
            {items.map(renderItem)}
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
      <PostJobModal open={showJobModal} onOpenChange={setShowJobModal} />
      <PostPackageModal open={showPackageModal} onOpenChange={setShowPackageModal} />
    </>
  );
} 
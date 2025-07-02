'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNostr } from '@/components/nostr-provider';
import { cn } from '@/lib/utils';

export function BottomNavbar() {
  const { isLoggedIn } = useNostr();
  const pathname = usePathname();

  // This navbar should only be visible on pages that require login
  const protectedPages = ['/post-package', '/view-packages', '/my-deliveries', '/profile', '/settings'];
  const shouldShowNavbar = isLoggedIn && protectedPages.some(page => pathname.startsWith(page));

  if (!shouldShowNavbar) {
    return null;
  }

  const navItems = [
    { href: '/post-package', label: 'Post' },
    { href: '/view-packages', label: 'Map' },
    { href: '/my-deliveries', label: 'Me' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-cyan-500/10 z-40">
      <div className="container mx-auto px-4 py-2 flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 text-center py-2 font-cyber uppercase tracking-widest transition-all duration-300',
                isActive
                  ? 'text-cyan-300 text-glow-cyan-wide'
                  : 'text-gray-500 hover:text-cyan-400'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 
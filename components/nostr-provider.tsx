'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { type PackageData } from '@/lib/nostr-types';
import { getPackages } from '@/lib/nostr';
import { toast } from 'sonner';
import { NostrErrorHandler } from '@/lib/error-handler';
import { DataConsistencyManager } from '@/lib/data-consistency-manager';

interface NostrContextType {
  publicKey: string;
  isReady: boolean;
  hasExtension: boolean;
  isLoggedIn: boolean;
  login: (publicKey: string, privateKey?: string) => void;
  logout: () => void;
  packages: PackageData[];
  packagesLoading: boolean;
  fetchPackages: () => Promise<void>;
}

const NostrContext = createContext<NostrContextType>({
  publicKey: '',
  isReady: false,
  hasExtension: false,
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
  packages: [],
  packagesLoading: true,
  fetchPackages: async () => {},
});

export const useNostr = () => useContext(NostrContext);

export function NostrProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [publicKey, setPublicKey] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [hasExt, setHasExt] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  const fetchPackages = useCallback(async () => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }
    
    console.log('Fetching packages in provider...');
    
    // Use error handler for WebSocket-related failures
    const pkgs = await NostrErrorHandler.withErrorHandling(
      async () => await getPackages(),
      [], // Fallback to empty array
      'Failed to fetch packages, using cached data'
    );
    
    setPackages(pkgs);
    setPackagesLoading(false);
  }, []); // Empty dependency array to prevent recreation

  useEffect(() => {
    setMounted(true);

    // Install error handler for WebSocket errors (double-check installation)
    try {
      NostrErrorHandler.install();
      console.log('🛡️ NostrErrorHandler installed in NostrProvider');
    } catch (installError) {
      console.warn('Failed to install NostrErrorHandler in NostrProvider:', installError);
    }

    // Only access localStorage in browser environment
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const storedPubkey = localStorage.getItem('nostr_pubkey');
      if (storedPubkey) {
        setPublicKey(storedPubkey);
        setIsLoggedIn(true);
      }
    }

    const hasExtension =
      typeof window !== 'undefined' && window.nostr !== undefined;
    setHasExt(hasExtension);
    setIsReady(true);
  }, []);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }
    
    if (isLoggedIn) {
      setPackagesLoading(true);
      fetchPackages(); // Initial fetch on login

      // Start data consistency manager for real-time updates
      DataConsistencyManager.start({
        enableRealtime: true,
        syncInterval: 30000, // 30 seconds
        onPackageUpdate: (packages) => {
          console.log('📊 Real-time package update received:', packages.length);
          setPackages(packages);
        },
        onError: (error) => {
          console.error('📊 Data consistency error:', error);
          // Don't show toast for consistency errors to avoid spam
        }
      });

      return () => {
        DataConsistencyManager.stop();
      };
    } else {
      // Stop data consistency manager when logged out
      DataConsistencyManager.stop();
    }
  }, [isLoggedIn, fetchPackages]); // Add fetchPackages back to satisfy ESLint

  const login = useCallback((pubkey: string, privkey?: string) => {
    setPublicKey(pubkey);
    setIsLoggedIn(true);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('nostr_pubkey', pubkey);
      if (privkey) {
        localStorage.setItem('nostr_privkey', privkey);
      }
    }
  }, []);

  const logout = useCallback(() => {
    setPublicKey('');
    setIsLoggedIn(false);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('nostr_pubkey');
      localStorage.removeItem('nostr_privkey');
    }
    setPackages([]); // Clear packages on logout
    router.replace('/');
  }, [router]);

  const contextValue = useMemo(() => ({
    publicKey,
    isReady: mounted && isReady,
    hasExtension: hasExt,
    isLoggedIn: mounted && isLoggedIn,
    login,
    logout,
    packages,
    packagesLoading,
    fetchPackages,
  }), [publicKey, mounted, isReady, hasExt, isLoggedIn, packages, packagesLoading, fetchPackages, login, logout]);

  return (
    <NostrContext.Provider value={contextValue}>
      {children}
    </NostrContext.Provider>
  );
}

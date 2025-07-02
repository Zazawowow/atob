'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { type PackageData } from '@/lib/nostr-types';
import { getPackages } from '@/lib/nostr';
import { toast } from 'sonner';

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
    console.log('Fetching packages in provider...');
    try {
      const pkgs = await getPackages();
      setPackages(pkgs);
    } catch (error) {
      toast.error('Error Fetching Packages', {
        description: 'Could not update package list.',
      });
      console.error('Error fetching packages in provider:', error);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);

    const storedPubkey = localStorage.getItem('nostr_pubkey');
    if (storedPubkey) {
      setPublicKey(storedPubkey);
      setIsLoggedIn(true);
    }

    const hasExtension =
      typeof window !== 'undefined' && window.nostr !== undefined;
    setHasExt(hasExtension);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      setPackagesLoading(true);
      fetchPackages(); // Initial fetch on login

      const interval = setInterval(fetchPackages, 15000); // Refresh every 15 seconds

      return () => clearInterval(interval);
    }
  }, [isLoggedIn, fetchPackages]);

  const login = (pubkey: string, privkey?: string) => {
    setPublicKey(pubkey);
    setIsLoggedIn(true);
    localStorage.setItem('nostr_pubkey', pubkey);
    if (privkey) {
      localStorage.setItem('nostr_privkey', privkey);
    }
  };

  const logout = () => {
    setPublicKey('');
    setIsLoggedIn(false);
    localStorage.removeItem('nostr_pubkey');
    localStorage.removeItem('nostr_privkey');
    setPackages([]); // Clear packages on logout
    router.replace('/');
  };

  const contextValue = {
    publicKey,
    isReady: mounted && isReady,
    hasExtension: hasExt,
    isLoggedIn: mounted && isLoggedIn,
    login,
    logout,
    packages,
    packagesLoading,
    fetchPackages,
  };

  return (
    <NostrContext.Provider value={contextValue}>
      {children}
    </NostrContext.Provider>
  );
}

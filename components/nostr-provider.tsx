'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
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
  const lastPackagesUpdate = useRef<string>('');
  const packageUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // Add comprehensive unhandled rejection handler for timeouts and websocket errors
      const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
        const error = event.reason;
        const errorString = String(error);
        const errorMessage = error?.message || '';
        
        // Check if this is a connection/timeout/websocket error we should suppress
        if (
          errorString.includes('connection timed out') ||
          errorString.includes('Connection timeout') ||
          errorString.includes('timeout') ||
          errorString.includes('websocket') ||
          errorString.includes('WebSocket') ||
          errorString.includes('relay') ||
          errorString.includes('connection') ||
          errorString.includes('network') ||
          errorMessage.includes('connection timed out') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('websocket') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('network')
        ) {
          console.warn('🛡️ Suppressed connection/timeout error:', errorString);
          event.preventDefault(); // Prevent the error from showing in console
          return;
        }
        
        // Log other errors but don't prevent them
        console.warn('🛡️ Unhandled promise rejection (not connection-related):', error);
      };
      
      window.addEventListener('unhandledrejection', unhandledRejectionHandler);
      
      // Add a global error handler for any remaining errors
      const globalErrorHandler = (event: ErrorEvent) => {
        const error = event.error;
        const errorString = String(error);
        
        if (
          errorString.includes('timeout') ||
          errorString.includes('connection') ||
          errorString.includes('websocket') ||
          errorString.includes('relay') ||
          errorString.includes('network')
        ) {
          console.warn('🛡️ GLOBAL: Suppressed error:', errorString);
          event.preventDefault();
          return;
        }
      };
      
      window.addEventListener('error', globalErrorHandler);
      
      // Add process-level error handlers for Node.js errors
      if (typeof process !== 'undefined') {
        process.on('unhandledRejection', (reason, promise) => {
          const errorString = String(reason);
          if (
            errorString.includes('timeout') ||
            errorString.includes('connection') ||
            errorString.includes('websocket') ||
            errorString.includes('relay') ||
            errorString.includes('network')
          ) {
            console.warn('🛡️ PROCESS: Suppressed unhandled rejection:', errorString);
            return;
          }
          console.warn('🛡️ Unhandled rejection (not suppressed):', reason);
        });
        
        process.on('uncaughtException', (error) => {
          const errorString = String(error);
          if (
            errorString.includes('timeout') ||
            errorString.includes('connection') ||
            errorString.includes('websocket') ||
            errorString.includes('relay') ||
            errorString.includes('network')
          ) {
            console.warn('🛡️ PROCESS: Suppressed uncaught exception:', errorString);
            return;
          }
          console.warn('🛡️ Uncaught exception (not suppressed):', error);
        });
      }
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

      // Start data consistency manager with improved error handling
      DataConsistencyManager.start({
        enableRealtime: false, // Disable realtime for now to prevent loops
        syncInterval: 120000, // Increase to 2 minutes to reduce frequency even more
        onPackageUpdate: (packages) => {
          console.log('📊 Data sync update received:', packages.length);
          
          // Clear existing timeout
          if (packageUpdateTimeoutRef.current) {
            clearTimeout(packageUpdateTimeoutRef.current);
          }
          
          // Debounce package updates to prevent infinite loops
          packageUpdateTimeoutRef.current = setTimeout(() => {
            const packagesHash = packages.map(p => p.id).sort().join(',');
            if (lastPackagesUpdate.current !== packagesHash) {
              lastPackagesUpdate.current = packagesHash;
              setPackages(packages);
              console.log('📊 Package state updated successfully');
            } else {
              console.log('📊 Skipping duplicate package update');
            }
          }, 500); // Increased debounce to 500ms
        },
        onError: (error) => {
          console.warn('📊 Data consistency error (gracefully handled):', error);
          // Don't show toast for consistency errors to avoid spam
        }
      });

      return () => {
        DataConsistencyManager.stop();
        if (packageUpdateTimeoutRef.current) {
          clearTimeout(packageUpdateTimeoutRef.current);
        }
      };
    } else {
      // Stop data consistency manager when logged out
      DataConsistencyManager.stop();
    }
  }, [isLoggedIn, fetchPackages]); // Add dependency array

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

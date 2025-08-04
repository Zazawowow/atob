'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getRelays, checkRelay } from '@/lib/nostr-service';
import { Wifi, WifiOff, Shield } from 'lucide-react';

export function NostrStatus() {
  const [status, setStatus] = useState<
    'checking' | 'connected' | 'disconnected'
  >('checking');
  const [relayUrl, setRelayUrl] = useState<string>('');

  useEffect(() => {
    const checkRelayStatus = async () => {
      const relays = getRelays();
      const relay = relays[0]; // We only have one relay
      setRelayUrl(relay);

      try {
        const isWorking = await checkRelay(relay);
        setStatus(isWorking ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('Error checking relay status:', error);
        setStatus('disconnected');
      }
    };

    checkRelayStatus();

    // Check relay periodically
    const interval = setInterval(checkRelayStatus, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='inline-flex items-center'>
            {status === 'checking' ? (
              <Badge variant='outline' className='gap-1 px-2 py-0 h-6'>
                <div className='animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full'></div>
                <span>Checking</span>
              </Badge>
            ) : status === 'connected' ? (
              <Badge
                variant='outline'
                className='gap-1 px-2 py-0 h-6 bg-green-50 text-green-700 border-green-200'
              >
                <Wifi className='h-3 w-3' />
                <span>Connected</span>
              </Badge>
            ) : (
              <Badge
                variant='outline'
                className='gap-1 px-2 py-0 h-6 bg-red-50 text-red-700 border-red-200'
              >
                <WifiOff className='h-3 w-3' />
                <span>Disconnected</span>
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className='space-y-2 max-w-xs'>
            <div className='flex items-center gap-2'>
              <Shield className='h-4 w-4 text-blue-400' />
              <p className='font-medium'>Custom Nostr Relay</p>
            </div>
            <div className='text-xs space-y-1'>
              <div className='flex items-center justify-between'>
                <span className='truncate text-gray-600'>{relayUrl}</span>
                {status === 'checking' ? (
                  <span className='text-gray-500'>Checking...</span>
                ) : status === 'connected' ? (
                  <span className='text-green-600'>Connected</span>
                ) : (
                  <span className='text-red-600'>Failed</span>
                )}
              </div>
            </div>
            <p className='text-xs text-gray-500 mt-2'>
              Secure dedicated relay for enhanced privacy
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

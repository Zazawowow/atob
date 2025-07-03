'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getRelays, setRelays, checkRelay } from '@/lib/nostr-service';
import { Badge } from '@/components/ui/badge';
import { SettingsIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import Image from 'next/image';

export default function Settings() {
  const [relays, setRelaysList] = useState<string[]>([]);
  const [newRelay, setNewRelay] = useState('');
  const [relayStatus, setRelayStatus] = useState<
    Record<string, boolean | null>
  >({});
  const [isChecking, setIsChecking] = useState(false);

  // Default relays to suggest
  const suggestedRelays = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.snort.social',
    'wss://relay.nostr.band',
    'wss://nostr-pub.wellorder.net',
    'wss://relay.nostr.bg',
    'wss://nostr.bitcoiner.social',
    'wss://nostr.onsats.org',
    'wss://nostr.plebchain.org',
    'wss://nostr.orangepill.dev',
    'wss://nostr.zkid.social',
    'wss://nostr.btcmp.com',
    'wss://nostr.bitcoiner.social',
    'wss://nostr.plebchain.org',
    'wss://nostr.orangepill.dev',
    'wss://nostr.zkid.social',
    'wss://nostr.btcmp.com'
  ];

  useEffect(() => {
    // Load relays from storage
    const storedRelays = getRelays();
    setRelaysList(storedRelays);

    // Initialize status as null (unchecked)
    const initialStatus: Record<string, boolean | null> = {};
    storedRelays.forEach((relay) => {
      initialStatus[relay] = null;
    });
    setRelayStatus(initialStatus);
  }, []);

  const handleAddRelay = () => {
    if (!newRelay) return;

    // Validate relay URL
    if (!newRelay.startsWith('wss://')) {
      toast.error('Invalid relay URL', {
        description: 'Relay URL must start with wss://',
      });
      return;
    }

    // Check if relay already exists
    if (relays.includes(newRelay)) {
      toast.error('Relay already exists', {
        description: 'This relay is already in your list',
      });
      return;
    }

    // Add new relay
    const updatedRelays = [...relays, newRelay];
    setRelaysList(updatedRelays);
    setRelays(updatedRelays);
    setNewRelay('');

    // Set initial status as null (unchecked)
    setRelayStatus((prev) => ({
      ...prev,
      [newRelay]: null,
    }));

    toast.success('Relay added', {
      description: 'New relay has been added to your list',
    });
  };

  const handleRemoveRelay = (relay: string) => {
    const updatedRelays = relays.filter((r) => r !== relay);
    setRelaysList(updatedRelays);
    setRelays(updatedRelays);

    // Remove from status
    setRelayStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[relay];
      return newStatus;
    });

    toast.success('Relay removed', {
      description: 'Relay has been removed from your list',
    });
  };

  const handleAddSuggestedRelay = (relay: string) => {
    if (relays.includes(relay)) {
      toast.error('Relay already exists', {
        description: 'This relay is already in your list',
      });
      return;
    }

    const updatedRelays = [...relays, relay];
    setRelaysList(updatedRelays);
    setRelays(updatedRelays);

    // Set initial status as null (unchecked)
    setRelayStatus((prev) => ({
      ...prev,
      [relay]: null,
    }));

    toast.success('Relay added', {
      description: 'Suggested relay has been added to your list',
    });
  };

  const checkRelays = async () => {
    setIsChecking(true);

    // Check all relays in parallel
    const checkPromises = relays.map(async (relay) => {
      const isWorking = await checkRelay(relay);
      return { relay, isWorking };
    });

    // Update status as results come in
    for (const promise of checkPromises) {
      const { relay, isWorking } = await promise;
      setRelayStatus((prev) => ({
        ...prev,
        [relay]: isWorking,
      }));
    }

    setIsChecking(false);
    toast.success('Relay check complete', {
      description: 'All relays have been checked for connectivity',
    });
  };

  return (
    <div className='container mx-auto px-4 pt-24 pb-8 relative z-10'>
      <div className='fixed inset-0 -z-10'>
        <Image
          src='/hero-3.jpeg'
          alt='Background'
          fill
          className='object-cover object-center brightness-[0.3]'
          priority
        />
        <div className='absolute inset-0 bg-black/30' />
      </div>
      <Card className='max-w-2xl mx-auto bg-background/90 backdrop-blur-sm border border-cyan-500/20 shadow-2xl shadow-primary/10'>
        <CardHeader>
          <div className='flex items-center gap-4'>
            <SettingsIcon className='size-8 text-off-white' />
            <CardTitle className='flex items-center text-off-white font-cyber text-2xl'>
              NOSTR SETTINGS
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className='space-y-8 pt-6'>
          <div className='space-y-4'>
            <div className='flex justify-between items-center'>
              <h3 className='text-lg font-medium text-off-white'>Nostr Relays</h3>
              <Button
                variant='outline'
                size='sm'
                onClick={checkRelays}
                disabled={isChecking}
                className='btn-outline-blue'
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`}
                />
                {isChecking ? 'Checking...' : 'Check All'}
              </Button>
            </div>

            <div className='space-y-3'>
              {relays.map((relay) => (
                <div
                  key={relay}
                  className='flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10'
                >
                  <div className='flex items-center gap-2 overflow-hidden'>
                    <span className='truncate text-off-white-90'>{relay}</span>
                    {relayStatus[relay] === true && (
                      <Badge variant='success'>Connected</Badge>
                    )}
                    {relayStatus[relay] === false && (
                      <Badge variant='destructive'>Failed</Badge>
                    )}
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => handleRemoveRelay(relay)}
                    className='text-off-white-60 hover:text-pink-400'
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-off-white">Nostr Relays</h3>
              <div className="space-y-2">
                <Label htmlFor="new-relay" className="text-off-white">
                  Add a new relay
                </Label>
                <div className="flex flex-col space-y-2">
                  <Input
                    id="new-relay"
                    type="url"
                    placeholder='wss://relay.damus.io'
                    value={newRelay}
                    onChange={(e) => setNewRelay(e.target.value)}
                    className='bg-black/20 border-white/20 text-off-white focus:ring-cyan-400'
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRelay()}
                  />
                  <Button
                    onClick={handleAddRelay}
                    size='sm'
                    className='btn-blue w-full'
                  >
                    <PlusCircle className='mr-2 h-4 w-4' /> Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className='space-y-4 border-t border-white/10 pt-6'>
            <h3 className='text-lg font-medium text-off-white'>Suggested Relays</h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              {suggestedRelays
                .filter((relay) => !relays.includes(relay))
                .map((relay) => (
                  <Button
                    key={relay}
                    variant='outline'
                    className='justify-start overflow-hidden btn-outline-purple text-off-white'
                    onClick={() => handleAddSuggestedRelay(relay)}
                  >
                    <Plus className='h-4 w-4 mr-2 flex-shrink-0' />
                    <span className='truncate'>{relay}</span>
                  </Button>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

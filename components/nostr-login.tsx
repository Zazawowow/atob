'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Key, AlertCircle, ExternalLink } from 'lucide-react';
import { nip19, getPublicKey } from 'nostr-tools';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';

interface NostrLoginProps {
  onLogin: (publicKey: string) => void;
  onSignup: () => void;
  onCancel?: () => void;
}

export function NostrLogin({ onLogin, onSignup, onCancel }: NostrLoginProps) {
  const [loading, setLoading] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [nsecKey, setNsecKey] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [activeTab, setActiveTab] = useState('extension');

  // Check if browser extension is available - only on client side
  useEffect(() => {
    const extensionExists =
      typeof window !== 'undefined' && window.nostr !== undefined;
    setHasExtension(extensionExists);
    if (!extensionExists) {
      setActiveTab('nsec');
    }
    setMounted(true);
  }, []);

  const handleExtensionLogin = async () => {
    setLoading(true);
    try {
      if (!window.nostr) {
        throw new Error('No Nostr extension found');
      }

      const publicKey = await window.nostr.getPublicKey();
      if (!publicKey) {
        throw new Error('Failed to get public key from extension');
      }

      // Store the public key in localStorage
      localStorage.setItem('nostr_pubkey', publicKey);

      toast.success('Successfully connected to Nostr', {
        description: 'You are now logged in with your Nostr extension',
      });

      onLogin(publicKey);
    } catch (error) {
      console.error('Extension login error:', error);
      toast.error('Login Failed', {
        description:
          'Could not connect to your Nostr extension. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNsecLogin = async () => {
    setLoading(true);
    try {
      if (!nsecKey) {
        throw new Error('Please enter your nsec key');
      }

      // Trim whitespace from the nsec key
      const trimmedNsec = nsecKey.trim();
      console.log('Attempting to decode nsec key:', trimmedNsec);

      // Basic validation of nsec format
      if (!trimmedNsec.startsWith('nsec1')) {
        throw new Error('Invalid nsec key format - must start with nsec1');
      }

      try {
        // Decode the nsec key
        console.log('Calling nip19.decode...');
        const decoded = nip19.decode(trimmedNsec);
        console.log('Decoded result:', decoded);
        
        const { type, data } = decoded;
        if (type !== 'nsec' || !(data instanceof Uint8Array)) {
          throw new Error('Invalid nsec key format');
        }

        // Get the public key directly from the Uint8Array
        const publicKey = getPublicKey(data);
        console.log('Generated public key:', publicKey);

        // Convert Uint8Array to hex string for storage
        const privateKey = Array.from(data)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // Store both keys in localStorage
        localStorage.setItem('nostr_pubkey', publicKey);
        localStorage.setItem('nostr_privkey', privateKey);

        toast.success('Successfully logged in with nsec', {
          description: 'You are now logged in with your nsec key',
        });

        onLogin(publicKey);
      } catch (decodeError) {
        console.error('Detailed decode error:', decodeError);
        if (decodeError instanceof Error) {
          if (decodeError.message.includes('checksum')) {
            throw new Error('Invalid nsec key - please check for any extra characters or spaces');
          }
          throw new Error(`Decode error: ${decodeError.message}`);
        }
        throw decodeError;
      }
    } catch (error) {
      console.error('Nsec login error:', error);
      toast.error('Login Failed', {
        description: error instanceof Error ? error.message : 'Invalid nsec key',
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't render extension-specific content until after client-side mount
  if (!mounted) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader className='flex flex-col items-center justify-center text-center pt-8'>
          <div className='w-24 h-24 relative mb-4'>
            <Image
              src='/logo.png'
              alt='Logo'
              layout='fill'
              objectFit='contain'
            />
          </div>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex justify-center py-4'>
            <div className='animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full'></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='w-full max-w-sm mx-auto bg-background/90 backdrop-blur-sm border-2 border-primary/20 shadow-2xl shadow-primary/10'>
      <CardHeader className='flex flex-col items-center justify-center text-center pt-8'>
        <h1 className='font-cyber text-3xl font-bold mb-2 text-blue-400'>A TO ₿</h1>
      </CardHeader>
      <CardContent className='px-6 pb-6'>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full'
        >
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger 
              value='extension' 
              disabled={!hasExtension}
            >
              Browser Extension
            </TabsTrigger>
            <TabsTrigger 
              value='nsec'
            >
              Private Key (nsec)
            </TabsTrigger>
          </TabsList>
          <TabsContent 
            value='extension'
          >
            <div className='space-y-4 h-[116px]'>
              <p className='text-sm text-[#FAFAFA]/90 text-center'>
                Login using your Nostr browser extension (
                <a 
                  href='https://chromewebstore.google.com/detail/alby-bitcoin-wallet-for-l/iokeahhehimjnekafflcihljlcjccdbe'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-400 hover:text-blue-300 transition-colors duration-200'
                >
                  Alby
                </a>
                , {' '}
                <a 
                  href='https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-400 hover:text-blue-300 transition-colors duration-200'
                >
                  nos2x
                </a>
                ).
              </p>
              <Button
                onClick={handleExtensionLogin}
                className='w-full font-bold text-lg py-6 bg-blue-400 hover:bg-blue-400/90 text-white shadow-[0_0_15px_rgba(96,165,250,0.15)] hover:shadow-[0_0_25px_rgba(96,165,250,0.25)] transition-all duration-300'
                disabled={loading}
              >
                {loading ? (
                  <span className='animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full'></span>
                ) : (
                  <Key className='h-5 w-5 mr-2' />
                )}
                Extension Login
              </Button>
            </div>
          </TabsContent>
          <TabsContent 
            value='nsec'
          >
            <div className='space-y-4 h-[116px]'>
              <div className="relative">
                <Input
                  type='password'
                  placeholder='Enter your nsec...'
                  value={nsecKey}
                  onChange={(e) => setNsecKey(e.target.value)}
                  className='w-full text-center text-lg py-6 bg-black/20 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 placeholder:text-[#FAFAFA]/60 text-[#FAFAFA] transition-all duration-300 pr-24'
                />
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setNsecKey(text);
                      toast.success('Pasted from clipboard');
                    } catch (err) {
                      toast.error('Failed to read clipboard');
                    }
                  }}
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm bg-blue-400/10 hover:bg-blue-400/20 text-[#FAFAFA] rounded-md border border-blue-400/20 transition-all duration-200"
                >
                  Paste
                </button>
              </div>
              <Button
                onClick={handleNsecLogin}
                className='w-full font-bold text-lg py-6 bg-blue-400 hover:bg-blue-400/90 text-white shadow-[0_0_15px_rgba(96,165,250,0.15)] hover:shadow-[0_0_25px_rgba(96,165,250,0.25)] transition-all duration-300'
                disabled={loading || !nsecKey}
              >
                {loading ? (
                  <span className='animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full'></span>
                ) : (
                  <Key className='h-5 w-5 mr-2' />
                )}
                Login with nsec
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <div className='flex items-center space-x-2 mt-6'>
          <Checkbox
            id='remember'
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
            className='border-primary/50 data-[state=checked]:bg-primary bg-[#FAFAFA]'
          />
          <label
            htmlFor='remember'
            className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#FAFAFA]'
          >
            Remember me
          </label>
        </div>
      </CardContent>
      <CardFooter className='flex flex-col gap-4 pb-8'>
        <div className='flex flex-col items-center gap-2'>
          <p className='text-sm text-center text-[#FAFAFA]'>
            Don't have a nostr account?
          </p>
          <button
            onClick={onSignup}
            className='underline text-blue-400 hover:text-blue-300 transition-colors duration-200'
          >
            Sign up
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}

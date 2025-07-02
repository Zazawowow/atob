'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Key } from 'lucide-react';
import * as secp from '@noble/secp256k1';
import { nip19 } from 'nostr-tools';

interface NostrSignupProps {
  onSignup: (publicKey: string, privateKey: string) => void;
  onBackToLogin: () => void;
}

export function NostrSignup({ onSignup, onBackToLogin }: NostrSignupProps) {
  const [loading, setLoading] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<{
    nsec: string;
    npub: string;
  } | null>(null);

  const handleGenerateKeys = async () => {
    setLoading(true);
    try {
      // Generate random private key
      const privateKeyBytes = secp.utils.randomPrivateKey();
      
      // Convert to hex string
      const privateKey = Array.from(privateKeyBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Convert back to Uint8Array for nsec encoding
      const privateKeyUint8 = new Uint8Array(
        privateKey.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
      
      const nsec = nip19.nsecEncode(privateKeyUint8);
      const npub = nip19.npubEncode(privateKey);
      
      setGeneratedKeys({ nsec, npub });
      
      toast.success('Keys generated successfully', {
        description: 'Make sure to save your private key securely!',
      });

      // Don't automatically pass the keys back to parent - wait for user to confirm they saved the key
    } catch (error) {
      console.error('Key generation error:', error);
      toast.error('Failed to generate keys', {
        description: 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  if (generatedKeys) {
    return (
      <Card className='w-full max-w-sm mx-auto bg-background/90 backdrop-blur-sm border-2 border-primary/20 shadow-2xl shadow-primary/10'>
        <CardHeader className='flex flex-col items-center justify-center text-center pt-8'>
          <h1 className='font-cyber text-3xl font-bold mb-2 text-pink-400'>SAVE YOUR ACCOUNT KEY</h1>
        </CardHeader>
        <CardContent className='px-6 pb-6 space-y-6'>
          <div className='text-center'>
            <p className='text-base text-off-white mb-6'>
              Here is your newly generated account key. It allows you to purchase anonymously, and is stored in your browser on this device only.
            </p>
            <p className='text-base font-bold text-off-white mb-6'>
              Be sure to save it, or you'll lose access to your account
            </p>
            
            <div className='relative'>
              <div className='p-3 bg-black/20 rounded-md text-sm break-all text-off-white border border-blue-400/20 pr-20'>
                {generatedKeys.nsec}
              </div>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(generatedKeys.nsec);
                    toast.success('Copied to clipboard');
                  } catch (err) {
                    toast.error('Failed to copy');
                  }
                }}
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm bg-blue-400/10 hover:bg-blue-400/20 text-off-white rounded-md border border-blue-400/20 transition-all duration-200"
              >
                Copy
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex flex-col gap-4 pb-8'>
          <Button
            onClick={() => onSignup(generatedKeys.npub, generatedKeys.nsec)}
            className='btn-blue'
          >
            I have saved my key
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className='w-full max-w-sm mx-auto bg-background/90 backdrop-blur-sm border-2 border-primary/20 shadow-2xl shadow-primary/10'>
      <CardHeader className='flex flex-col items-center justify-center text-center pt-8 pb-8 relative overflow-hidden bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20'>
        {/* Circuit-like pattern overlay */}
        <div className='absolute inset-0 opacity-10'>
          <div className='absolute top-2 left-4 w-8 h-8 border border-cyan-400 transform rotate-45'></div>
          <div className='absolute top-6 right-6 w-6 h-6 border border-purple-400 rounded-full'></div>
          <div className='absolute bottom-4 left-8 w-4 h-4 bg-blue-400 transform rotate-45'></div>
          <div className='absolute bottom-2 right-4 w-10 h-1 bg-gradient-to-r from-cyan-400 to-transparent'></div>
          <div className='absolute top-1/2 left-2 w-1 h-12 bg-gradient-to-b from-purple-400 to-transparent'></div>
          <div className='absolute top-1/3 right-2 w-12 h-1 bg-gradient-to-l from-blue-400 to-transparent'></div>
        </div>
        {/* Grid pattern overlay */}
        <div 
          className='absolute inset-0 opacity-5'
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(96,165,250,0.3) 1px, transparent 1px),
              linear-gradient(rgba(96,165,250,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        ></div>
        <div className='flex items-center gap-3 relative z-10'>
          <span className='text-2xl'>📧</span>
          <h1 className='font-cyber text-3xl font-bold mb-2 text-blue-400 drop-shadow-lg'>NO EMAILS NEEDED</h1>
          <span className='text-2xl'>🗑️</span>
        </div>
      </CardHeader>
      <CardContent className='px-6 pb-6 space-y-6'>
        <div className='text-center'>
          <p className='text-base text-off-white-90 mb-2'>
            Generate a new Nostr private key to get started.
          </p>
          <p className='text-base text-off-white-70 mb-6'>
            No more need for emails and passwords
          </p>
          
          <Button
            onClick={handleGenerateKeys}
            className='btn-blue'
            disabled={loading}
          >
            {loading ? (
              <span className='animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full'></span>
            ) : (
              <Key className='h-5 w-5 mr-2' />
            )}
            Generate New Keys
          </Button>
        </div>
      </CardContent>
      <CardFooter className='flex flex-col gap-4 pb-8'>
        <div className='flex flex-col items-center gap-2'>
          <p className='text-base text-center text-off-white'>
            Already have a nostr account?
          </p>
          <button
            onClick={onBackToLogin}
            className='underline text-blue-400 hover:text-blue-300 transition-colors duration-200'
          >
            Login
          </button>
        </div>
      </CardFooter>
    </Card>
  );
} 
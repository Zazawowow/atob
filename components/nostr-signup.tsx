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

      // Pass the keys back to the parent
      onSignup(npub, nsec);
    } catch (error) {
      console.error('Key generation error:', error);
      toast.error('Failed to generate keys', {
        description: 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className='w-full max-w-sm mx-auto bg-background/90 backdrop-blur-sm border-2 border-primary/20 shadow-2xl shadow-primary/10'>
      <CardHeader className='flex flex-col items-center justify-center text-center pt-8'>
        <h1 className='font-cyber text-3xl font-bold mb-2 text-blue-400'>A TO ₿</h1>
      </CardHeader>
      <CardContent className='px-6 pb-6 space-y-6'>
        <div className='text-center'>
          <h2 className='text-xl font-bold mb-2 text-[#FAFAFA]'>Create New Account</h2>
          <p className='text-sm text-[#FAFAFA]/90 mb-6'>
            Generate a new Nostr private key to get started
          </p>
          
          <Button
            onClick={handleGenerateKeys}
            className='w-full font-bold text-lg py-6 bg-blue-400 hover:bg-blue-400/90 text-white shadow-[0_0_15px_rgba(96,165,250,0.15)] hover:shadow-[0_0_25px_rgba(96,165,250,0.25)] transition-all duration-300'
            disabled={loading}
          >
            {loading ? (
              <span className='animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full'></span>
            ) : (
              <Key className='h-5 w-5 mr-2' />
            )}
            Generate New Keys
          </Button>

          {generatedKeys && (
            <div className='mt-6 text-left space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1 text-[#FAFAFA]'>Your Public Key (npub)</label>
                <div className='p-3 bg-black/20 rounded-md text-xs break-all text-[#FAFAFA] border border-blue-400/20'>
                  {generatedKeys.npub}
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium mb-1 text-[#FAFAFA]'>Your Private Key (nsec)</label>
                <div className='p-3 bg-black/20 rounded-md text-xs break-all text-[#FAFAFA] border border-blue-400/20'>
                  {generatedKeys.nsec}
                </div>
              </div>
              <p className='text-sm text-amber-400 mt-4'>
                ⚠️ Save your private key somewhere safe! You'll need it to log in.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className='flex flex-col gap-4 pb-8'>
        <div className='text-xs uppercase text-[#FAFAFA] text-center'>
          Or
        </div>
        <div className='flex flex-col items-center gap-2'>
          <p className='text-sm text-center text-[#FAFAFA]'>
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
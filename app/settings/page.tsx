'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, Shield, Users, Lock, CheckCircle, XCircle } from 'lucide-react';
import { useNostr } from '@/components/nostr-provider';
// import { getUserNpub } from '@/lib/nostr-secure';
import Image from 'next/image';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const { isReady, isLoggedIn, publicKey, logout } = useNostr();
  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [relayStatus, setRelayStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    if (isReady && isLoggedIn) {
      loadUserNpub();
      checkRelayStatus();
    }
  }, [isReady, isLoggedIn]);

  const loadUserNpub = async () => {
    try {
      // const npub = await getUserNpub();
      // setUserNpub(npub);
      
      // Temporary mock npub
      setUserNpub('npub10wzfa7jkqj6c65xyr93hhxrns37ml9tss82jvymv8fymwdtu6cts3h6pvr');
    } catch (error) {
      console.error('Failed to load user npub:', error);
    }
  };

  const checkRelayStatus = async () => {
    setRelayStatus('checking');
    try {
      // Simple WebSocket test to check relay status
      const ws = new WebSocket('wss://nostr.l484.com');
      
      ws.onopen = () => {
        setRelayStatus('connected');
        ws.close();
      };
      
      ws.onerror = () => {
        setRelayStatus('disconnected');
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (relayStatus === 'checking') {
          setRelayStatus('disconnected');
        }
      }, 5000);
    } catch (error) {
      setRelayStatus('disconnected');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const getRelayStatusIcon = () => {
    switch (relayStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getRelayStatusText = () => {
    switch (relayStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Checking...';
    }
  };

  const getRelayStatusColor = () => {
    switch (relayStatus) {
      case 'connected':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'disconnected':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  if (!isReady) {
    return (
      <div className='container mx-auto px-4 pt-24 pb-8'>
        <div className='flex justify-center items-center h-64'>
          <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
          <p className='ml-2'>Loading Nostr...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className='container mx-auto px-4 pt-24 pb-8'>
        <Card className='max-w-2xl mx-auto bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
          <CardContent className='p-8 text-center'>
            <Lock className='h-16 w-16 mx-auto mb-4 text-gray-400' />
            <h3 className='text-xl font-cyber text-off-white mb-2'>Authentication Required</h3>
            <p className='text-gray-400 mb-6'>
              You must be logged in with Nostr to access settings.
            </p>
            <Button onClick={() => window.location.href = '/'} className='btn-purple'>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className='min-h-screen'>
      <div className='fixed inset-0 -z-10'>
        <Image
          src='/hero-4.jpeg'
          alt='Background'
          fill
          className='object-cover object-center brightness-[0.3]'
          priority
        />
        <div className='absolute inset-0 bg-black/40' />
      </div>
      
      <div className='container mx-auto px-4 pt-24 pb-12 relative z-10'>
        <div className='max-w-4xl mx-auto space-y-6'>
          {/* Header */}
          <div className='text-center mb-8'>
            <h1 className='text-3xl md:text-4xl font-cyber text-off-white mb-2'>
              <div className='flex items-center justify-center gap-3'>
                <div className='p-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-md'>
                  <Settings className='h-8 w-8 text-off-white' />
                </div>
                SETTINGS
              </div>
            </h1>
            <p className='text-purple-300 text-lg'>
              Manage your secure account and system access
            </p>
          </div>

          {/* User Info */}
          <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
            <CardHeader>
              <CardTitle className='flex items-center text-off-white font-cyber text-xl'>
                <Users className='h-6 w-6 text-purple-400 mr-3' />
                USER INFORMATION
              </CardTitle>
              <CardDescription className='text-purple-300'>
                Your Nostr identity and connection status
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg'>
                  <p className='text-sm text-purple-300 mb-1'>Public Key</p>
                  <p className='text-xs font-mono text-purple-200 break-all'>
                    {publicKey ? `${publicKey.slice(0, 12)}...${publicKey.slice(-8)}` : 'Not available'}
                  </p>
                </div>
                <div className='p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg'>
                  <p className='text-sm text-purple-300 mb-1'>Npub</p>
                  <p className='text-xs font-mono text-purple-200 break-all'>
                    {userNpub ? `${userNpub.slice(0, 12)}...${userNpub.slice(-8)}` : 'Not available'}
                  </p>
                </div>
              </div>
              
              <div className='flex justify-between items-center'>
                <Button
                  onClick={checkRelayStatus}
                  variant='outline'
                  className='btn-outline-purple'
                  disabled={relayStatus === 'checking'}
                >
                  Check Relay Status
                </Button>
                <Button
                  onClick={handleLogout}
                  variant='outline'
                  className='btn-outline-red'
                >
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Relay Status */}
          <Card className='bg-black/30 border border-blue-500/20 rounded-2xl shadow-blue-glow/10 backdrop-blur-sm'>
            <CardHeader>
              <CardTitle className='flex items-center text-off-white font-cyber text-xl'>
                <Shield className='h-6 w-6 text-blue-400 mr-3' />
                SECURE RELAY STATUS
              </CardTitle>
              <CardDescription className='text-blue-300'>
                Connection status to our secure relay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg'>
                <div className='flex items-center gap-3'>
                  {getRelayStatusIcon()}
                  <div>
                    <p className='text-blue-300 font-medium'>wss://nostr.l484.com</p>
                    <p className='text-blue-400 text-sm'>Our secure relay</p>
                  </div>
                </div>
                <Badge className={getRelayStatusColor()}>
                  {getRelayStatusText()}
                </Badge>
              </div>
              
              <div className='mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg'>
                <p className='text-sm text-yellow-400'>
                  <strong>Security Note:</strong> This application exclusively uses our secure relay. 
                  All data is encrypted and only accessible to approved users.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Info */}
          <Card className='bg-black/30 border border-green-500/20 rounded-2xl shadow-green-glow/10 backdrop-blur-sm'>
            <CardHeader>
              <CardTitle className='flex items-center text-off-white font-cyber text-xl'>
                <Lock className='h-6 w-6 text-green-400 mr-3' />
                SECURITY FEATURES
              </CardTitle>
              <CardDescription className='text-green-300'>
                How your data is protected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='p-4 bg-green-500/10 border border-green-500/20 rounded-lg'>
                  <h4 className='text-green-300 font-medium mb-2'>End-to-End Encryption</h4>
                  <p className='text-green-400 text-sm'>
                    All job and package data is encrypted using NIP-04, ensuring only approved users can decrypt and view the content.
                  </p>
                </div>
                <div className='p-4 bg-green-500/10 border border-green-500/20 rounded-lg'>
                  <h4 className='text-green-300 font-medium mb-2'>Access Control</h4>
                  <p className='text-green-400 text-sm'>
                    Only approved npubs can view and interact with secure jobs and packages. Unauthorized users cannot access any data.
                  </p>
                </div>
                <div className='p-4 bg-green-500/10 border border-green-500/20 rounded-lg'>
                  <h4 className='text-green-300 font-medium mb-2'>Secure Relay</h4>
                  <p className='text-green-400 text-sm'>
                    All data is stored exclusively on our secure relay (nostr.l484.com). No other relays are used or accessible.
                  </p>
                </div>
                <div className='p-4 bg-green-500/10 border border-green-500/20 rounded-lg'>
                  <h4 className='text-green-300 font-medium mb-2'>Nostr Authentication</h4>
                  <p className='text-green-400 text-sm'>
                    Users authenticate using Nostr keys, providing cryptographic proof of identity without centralized servers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

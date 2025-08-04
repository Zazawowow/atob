'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Users, Plus, Trash2, Copy, Check, Crown, Settings, Lock } from 'lucide-react';
import { useNostr } from '@/components/nostr-provider';
// import { getUserNpub, isNpubApproved } from '@/lib/nostr-secure';
import Image from 'next/image';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

// Admin npub - this is the only admin user
const ADMIN_NPUB = 'npub10wzfa7jkqj6c65xyr93hhxrns37ml9tss82jvymv8fymwdtu6cts3h6pvr';

export default function AdminPage() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useNostr();
  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [approvedNpubs, setApprovedNpubs] = useState<string[]>([]);
  const [newNpub, setNewNpub] = useState('');
  const [copiedNpub, setCopiedNpub] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReady && isLoggedIn) {
      loadUserNpub();
      loadApprovedNpubs();
    }
  }, [isReady, isLoggedIn]);

  const loadUserNpub = async () => {
    try {
      // const npub = await getUserNpub();
      // setUserNpub(npub);
      // setIsAdmin(npub === ADMIN_NPUB);
      
      // Temporary mock - assume admin for testing
      setUserNpub(ADMIN_NPUB);
      setIsAdmin(true);
    } catch (error) {
      console.error('Failed to load user npub:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovedNpubs = async () => {
    try {
      // For now, we'll use a simple localStorage approach
      // In production, this would be stored on the relay or in a database
      const stored = localStorage.getItem('approved_npubs');
      if (stored) {
        const npubs = JSON.parse(stored);
        setApprovedNpubs(npubs);
      } else {
        // Initialize with admin npub
        const initialNpubs = [ADMIN_NPUB];
        setApprovedNpubs(initialNpubs);
        localStorage.setItem('approved_npubs', JSON.stringify(initialNpubs));
      }
    } catch (error) {
      console.error('Failed to load approved npubs:', error);
      toast.error('Failed to load approved users');
    }
  };

  const handleAddNpub = async () => {
    if (!newNpub.trim()) {
      toast.error('Please enter a valid npub');
      return;
    }

    // Validate npub format
    if (!newNpub.startsWith('npub1')) {
      toast.error('Invalid npub format. Must start with npub1');
      return;
    }

    // Check if already approved
    if (approvedNpubs.includes(newNpub)) {
      toast.error('This npub is already approved');
      return;
    }

    // Add to approved list
    const updatedNpubs = [...approvedNpubs, newNpub];
    setApprovedNpubs(updatedNpubs);
    localStorage.setItem('approved_npubs', JSON.stringify(updatedNpubs));
    setNewNpub('');
    
    toast.success('User approved successfully');
  };

  const handleRemoveNpub = async (npubToRemove: string) => {
    // Don't allow removing the admin npub
    if (npubToRemove === ADMIN_NPUB) {
      toast.error('Cannot remove admin user');
      return;
    }

    const updatedNpubs = approvedNpubs.filter(npub => npub !== npubToRemove);
    setApprovedNpubs(updatedNpubs);
    localStorage.setItem('approved_npubs', JSON.stringify(updatedNpubs));
    
    toast.success('User removed from approved list');
  };

  const copyToClipboard = async (npub: string) => {
    try {
      await navigator.clipboard.writeText(npub);
      setCopiedNpub(npub);
      toast.success('Npub copied to clipboard');
      setTimeout(() => setCopiedNpub(null), 2000);
    } catch (error) {
      toast.error('Failed to copy npub');
    }
  };

  const formatNpub = (npub: string) => {
    return `${npub.slice(0, 12)}...${npub.slice(-8)}`;
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
              You must be logged in with Nostr to access admin panel.
            </p>
            <Button onClick={() => router.push('/')} className='btn-purple'>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className='container mx-auto px-4 pt-24 pb-8'>
        <Card className='max-w-2xl mx-auto bg-black/30 border border-red-500/20 rounded-2xl shadow-red-glow/10 backdrop-blur-sm'>
          <CardContent className='p-8 text-center'>
            <Shield className='h-16 w-16 mx-auto mb-4 text-red-400' />
            <h3 className='text-xl font-cyber text-off-white mb-2'>Access Denied</h3>
            <p className='text-gray-400 mb-6'>
              You do not have admin privileges to access this page.
            </p>
            <Button onClick={() => router.push('/')} className='btn-red'>
              Go Back
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
          src='/hero-5.jpeg'
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
                  <Crown className='h-8 w-8 text-off-white' />
                </div>
                ADMIN PANEL
              </div>
            </h1>
            <p className='text-purple-300 text-lg'>
              Manage approved users and system access
            </p>
          </div>

          {/* Admin Info */}
          <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
            <CardHeader>
              <CardTitle className='flex items-center text-off-white font-cyber text-xl'>
                <Crown className='h-6 w-6 text-yellow-400 mr-3' />
                ADMIN INFORMATION
              </CardTitle>
              <CardDescription className='text-purple-300'>
                You are the system administrator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-yellow-400 mb-1'>Admin Npub</p>
                    <p className='text-xs font-mono text-yellow-300'>{formatNpub(ADMIN_NPUB)}</p>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => copyToClipboard(ADMIN_NPUB)}
                    className='text-yellow-400 hover:text-yellow-300'
                  >
                    {copiedNpub === ADMIN_NPUB ? (
                      <Check className='h-4 w-4' />
                    ) : (
                      <Copy className='h-4 w-4' />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add New User */}
          <Card className='bg-black/30 border border-blue-500/20 rounded-2xl shadow-blue-glow/10 backdrop-blur-sm'>
            <CardHeader>
              <CardTitle className='flex items-center text-off-white font-cyber text-xl'>
                <Plus className='h-6 w-6 text-blue-400 mr-3' />
                APPROVE NEW USER
              </CardTitle>
              <CardDescription className='text-blue-300'>
                Add a new npub to the approved users list
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='new-npub' className='text-off-white-90'>Npub to Approve</Label>
                <div className='flex gap-2'>
                  <Input
                    id='new-npub'
                    placeholder='npub1...'
                    value={newNpub}
                    onChange={(e) => setNewNpub(e.target.value)}
                    className='flex-1 bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400'
                  />
                  <Button onClick={handleAddNpub} className='btn-blue'>
                    <Plus className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approved Users List */}
          <Card className='bg-black/30 border border-green-500/20 rounded-2xl shadow-green-glow/10 backdrop-blur-sm'>
            <CardHeader>
              <CardTitle className='flex items-center text-off-white font-cyber text-xl'>
                <Users className='h-6 w-6 text-green-400 mr-3' />
                APPROVED USERS ({approvedNpubs.length})
              </CardTitle>
              <CardDescription className='text-green-300'>
                Users who can access secure jobs and packages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3 max-h-96 overflow-y-auto'>
                {approvedNpubs.map((npub) => (
                  <div
                    key={npub}
                    className='flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg'
                  >
                    <div className='flex items-center gap-3'>
                      <Badge variant='outline' className='text-xs'>
                        {npub === ADMIN_NPUB ? (
                          <div className='flex items-center gap-1'>
                            <Crown className='h-3 w-3' />
                            Admin
                          </div>
                        ) : (
                          'Approved'
                        )}
                      </Badge>
                      <span className='text-sm font-mono text-green-300'>{formatNpub(npub)}</span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => copyToClipboard(npub)}
                        className='text-green-400 hover:text-green-300'
                      >
                        {copiedNpub === npub ? (
                          <Check className='h-4 w-4' />
                        ) : (
                          <Copy className='h-4 w-4' />
                        )}
                      </Button>
                      {npub !== ADMIN_NPUB && (
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleRemoveNpub(npub)}
                          className='text-red-400 hover:text-red-300'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
            <CardHeader>
              <CardTitle className='flex items-center text-off-white font-cyber text-xl'>
                <Settings className='h-6 w-6 text-purple-400 mr-3' />
                SYSTEM INFORMATION
              </CardTitle>
              <CardDescription className='text-purple-300'>
                Current system status and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg'>
                  <h4 className='text-purple-300 font-medium mb-2'>Secure Relay</h4>
                  <p className='text-purple-400 text-sm'>wss://nostr.l484.com</p>
                </div>
                <div className='p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg'>
                  <h4 className='text-purple-300 font-medium mb-2'>Encryption</h4>
                  <p className='text-purple-400 text-sm'>NIP-04 End-to-End</p>
                </div>
                <div className='p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg'>
                  <h4 className='text-purple-300 font-medium mb-2'>Access Control</h4>
                  <p className='text-purple-400 text-sm'>Approved Users Only</p>
                </div>
                <div className='p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg'>
                  <h4 className='text-purple-300 font-medium mb-2'>Admin User</h4>
                  <p className='text-purple-400 text-sm'>1 Active Admin</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
} 
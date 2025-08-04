'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Plus, Trash2, Copy, Check } from 'lucide-react';
// import { getApprovedNpubs, isNpubApproved, getUserNpub } from '@/lib/nostr-secure';

interface ApprovedNpubsManagerProps {
  onNpubsChange?: (npubs: string[]) => void;
}

export function ApprovedNpubsManager({ onNpubsChange }: ApprovedNpubsManagerProps) {
  const [approvedNpubs, setApprovedNpubs] = useState<string[]>([]);
  const [newNpub, setNewNpub] = useState('');
  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedNpub, setCopiedNpub] = useState<string | null>(null);

  useEffect(() => {
    loadApprovedNpubs();
    loadUserNpub();
  }, []);

  const loadApprovedNpubs = async () => {
    try {
      // const npubs = await getApprovedNpubs();
      // setApprovedNpubs(npubs);
      
      // Temporary mock data
      const mockNpubs = ['npub10wzfa7jkqj6c65xyr93hhxrns37ml9tss82jvymv8fymwdtu6cts3h6pvr'];
      setApprovedNpubs(mockNpubs);
      onNpubsChange?.(mockNpubs);
    } catch (error) {
      console.error('Failed to load approved npubs:', error);
      toast.error('Failed to load approved npubs');
    } finally {
      setLoading(false);
    }
  };

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

    // In a real implementation, you would:
    // 1. Validate the npub is valid
    // 2. Store it in your approved list (relay event, database, etc.)
    // 3. Update the local state
    
    const updatedNpubs = [...approvedNpubs, newNpub];
    setApprovedNpubs(updatedNpubs);
    onNpubsChange?.(updatedNpubs);
    setNewNpub('');
    
    toast.success('Npub added to approved list');
  };

  const handleRemoveNpub = async (npubToRemove: string) => {
    // Don't allow removing the current user's npub
    if (npubToRemove === userNpub) {
      toast.error('Cannot remove your own npub');
      return;
    }

    const updatedNpubs = approvedNpubs.filter(npub => npub !== npubToRemove);
    setApprovedNpubs(updatedNpubs);
    onNpubsChange?.(updatedNpubs);
    
    toast.success('Npub removed from approved list');
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            Approved Npubs
          </CardTitle>
          <CardDescription>
            Managing access control for secure jobs and packages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          Approved Npubs
        </CardTitle>
        <CardDescription>
          Only approved npubs can view and interact with secure jobs and packages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new npub */}
        <div className="space-y-2">
          <Label htmlFor="new-npub">Add Approved Npub</Label>
          <div className="flex gap-2">
            <Input
              id="new-npub"
              placeholder="npub1..."
              value={newNpub}
              onChange={(e) => setNewNpub(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddNpub} className="btn-blue">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Current user's npub */}
        {userNpub && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-400">Your Npub</p>
                <p className="text-xs text-blue-300">{formatNpub(userNpub)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(userNpub)}
                className="text-blue-400 hover:text-blue-300"
              >
                {copiedNpub === userNpub ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Approved npubs list */}
        <div className="space-y-2">
          <Label>Approved Npubs ({approvedNpubs.length})</Label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {approvedNpubs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No approved npubs yet
              </p>
            ) : (
              approvedNpubs.map((npub) => (
                <div
                  key={npub}
                  className="flex items-center justify-between p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {npub === userNpub ? 'You' : 'Approved'}
                    </Badge>
                    <span className="text-sm font-mono">{formatNpub(npub)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(npub)}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      {copiedNpub === npub ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {npub !== userNpub && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveNpub(npub)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-400">
            <strong>Security Note:</strong> Only approved npubs can view and interact with secure jobs and packages. 
            All data is encrypted and stored only on our secure relay.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 
'use client';

import { useEffect, useState } from 'react';
import { useNostr } from '@/components/nostr-provider';
import { getUserProfile, getMyDeliveries } from '@/lib/nostr-client';
import { getNpub } from '@/lib/nostr-keys';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Star,
  Package,
  CheckCircle,
  Truck,
  User,
} from 'lucide-react';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CourierBadges } from '@/components/courier-badges';

// Types
interface ProfileData {
  name?: string;
  display_name?: string;
  displayName?: string;
  picture?: string;
  about?: string;
  website?: string;
  nip05?: string;
  followers?: number;
  following?: number;
  deliveries?: number;
  rating?: number;
  pubkey?: string;
}

interface DeliveryData {
  id: string;
  created_at: number;
  tags?: [string, string][];
}

// Skeleton component for loading states
function Skeleton({ className, as = 'div' }: { className?: string; as?: 'div' | 'span' }) {
  const Tag = as;
  return <Tag className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

// Utility function for time formatting
function getTimeAgo(timestamp: number): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - timestamp * 1000) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
  return `${Math.floor(seconds / 31536000)} years ago`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { publicKey, isReady, isLoggedIn } = useNostr();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [npub, setNpub] = useState<string>('');
  const [reputationScore, setReputationScore] = useState(0);
  const [recentDeliveries, setRecentDeliveries] = useState<DeliveryData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !isLoggedIn || !publicKey) {
      setLoading(false);
      return;
    }

    const loadProfileData = async () => {
      try {
        setError(null);
        setLoading(true);

        // Fetch profile and deliveries in parallel
        const [profileData, deliveries] = await Promise.all([
          getUserProfile(publicKey),
          getMyDeliveries(),
        ]);
        
        console.log('Profile data received:', profileData);
        setProfile(profileData);
        if (profileData) {
          calculateReputationScore(profileData);
        }
        setRecentDeliveries(deliveries.slice(0, 5));

        // Get npub for display
        const fullNpub = await getNpub(publicKey);
        setNpub(fullNpub);

      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [isReady, isLoggedIn, publicKey]);

  const calculateReputationScore = (profileData: ProfileData): void => {
    const deliveryCount = profileData.deliveries || 0;
    const followers = profileData.followers || 0;
    const following = profileData.following || 0;

    let score = Math.min(4, deliveryCount * 0.4);
    if (following > 0) {
      const ratio = followers / following;
      score += Math.min(1, ratio * 0.5);
    } else if (followers > 0) {
      score += 1;
    }
    score = Math.max(0, Math.min(5, score));
    setReputationScore(score);
  };

  // Not logged in state
  if (!isLoggedIn) {
    return (
      <div className='container mx-auto px-4 pt-24 pb-8 relative z-10'>
        <div className='max-w-5xl mx-auto'>
          <Card className='bg-background/90 backdrop-blur-sm border border-purple-500/20 shadow-2xl'>
            <CardContent className='p-8 text-center'>
              <div className='text-purple-400 mb-4'>
                <User className='h-12 w-12 mx-auto' />
              </div>
              <h2 className='text-xl font-semibold text-white mb-2'>Not Logged In</h2>
              <p className='text-white/70 mb-4'>Please log in to view your profile</p>
              <Button
                onClick={() => router.push('/')}
                className='bg-primary hover:bg-primary/80'
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className='container mx-auto px-4 pt-24 pb-8 relative z-10'>
        <div className='max-w-5xl mx-auto'>
          <Card className='bg-background/90 backdrop-blur-sm border border-red-500/20 shadow-2xl'>
            <CardContent className='p-8 text-center'>
              <div className='text-red-400 mb-4'>
                <User className='h-12 w-12 mx-auto' />
              </div>
              <h2 className='text-xl font-semibold text-white mb-2'>Error Loading Profile</h2>
              <p className='text-white/70 mb-4'>{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className='bg-primary hover:bg-primary/80'
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center relative z-10'>
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
        <div className='flex items-center space-x-3'>
          <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
          <p className='text-white text-lg'>Loading profile...</p>
        </div>
      </div>
    );
  }

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
      <div className='max-w-5xl mx-auto'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Left Column: Profile Card */}
          <div className='lg:col-span-1 space-y-8'>
            <Card className='bg-background/90 backdrop-blur-sm border border-purple-500/20 shadow-2xl shadow-primary/10'>
              <CardHeader>
                <CardTitle className='flex items-center text-off-white text-2xl'>
                  <User className='mr-3 h-5 w-5 text-purple-400' />
                  AGENT PROFILE
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-2'>
                <div className='flex flex-col items-center text-center'>
                  {profile?.picture ? (
                    <div className='relative'>
                      <img
                        src={profile.picture}
                        alt={profile.display_name || profile.displayName || profile.name || 'User'}
                        className='w-28 h-28 rounded-full object-cover border-2 border-purple-400/50 shadow-lg'
                        onLoad={() => console.log('Profile image loaded successfully:', profile.picture)}
                        onError={(e) => {
                          console.error('Profile image failed to load:', profile.picture);
                          // Hide the image and show fallback
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.parentElement?.querySelector('.fallback-avatar');
                          if (fallback) {
                            fallback.classList.remove('hidden');
                          }
                        }}
                      />
                      <div className='fallback-avatar hidden absolute inset-0 w-28 h-28 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg border-2 border-purple-400/50'>
                        <User className='h-14 w-14 text-off-white' />
                      </div>
                    </div>
                  ) : (
                    <div className='w-28 h-28 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg border-2 border-purple-400/50'>
                      <User className='h-14 w-14 text-off-white' />
                    </div>
                  )}
                  <h2 className='text-2xl font-bold mt-4 text-off-white'>
                    {profile?.display_name || profile?.displayName || profile?.name || 'Anonymous Agent'}
                  </h2>
                  <p className='text-sm text-purple-300 break-all mt-1 font-mono'>
                    {npub ? `${npub.slice(0, 10)}...${npub.slice(-4)}` : 'Loading...'}
                  </p>
                  {profile?.about && (
                    <p className='text-sm text-white/70 mt-2 max-w-xs'>
                      {profile.about}
                    </p>
                  )}
                </div>

                <div className='grid grid-cols-3 gap-4 text-center pt-6 mt-6 border-t border-white/10'>
                  <div>
                    <p className='text-2xl font-bold text-off-white'>
                      {profile?.followers || 0}
                    </p>
                    <p className='text-xs text-off-white-70 uppercase tracking-wider'>
                      Followers
                    </p>
                  </div>
                  <div>
                    <p className='text-2xl font-bold text-off-white'>
                      {profile?.following || 0}
                    </p>
                    <p className='text-xs text-off-white-70 uppercase tracking-wider'>
                      Following
                    </p>
                  </div>
                  <div>
                    <p className='text-2xl font-bold text-off-white'>
                      {profile?.deliveries || 0}
                    </p>
                    <p className='text-xs text-off-white-70 uppercase tracking-wider'>
                      Deliveries
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='bg-background/90 backdrop-blur-sm border border-cyan-500/20 shadow-2xl shadow-primary/10'>
              <CardHeader>
                <CardTitle className='flex items-center text-off-white text-2xl'>
                  <Star className='mr-3 h-5 w-5 text-cyan-400' />
                  REPUTATION
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-center justify-center space-x-4'>
                  <div className='bg-gradient-to-r from-cyan-500 to-purple-500 p-3 rounded-full'>
                    <Star
                      className='h-8 w-8 text-off-white'
                      fill='currentColor'
                    />
                  </div>
                  <div>
                    <p className='text-4xl font-bold text-off-white'>
                      {reputationScore.toFixed(1)}
                      <span className='text-2xl text-off-white-70'>
                        /5.0
                      </span>
                    </p>
                  </div>
                </div>
                <Progress
                  value={reputationScore * 20}
                  className='mt-4 h-2'
                />
                <p className='text-center text-xs mt-2 text-off-white-60'>
                  Based on deliveries & network trust
                </p>
              </CardContent>
            </Card>

            {/* Courier Badges Card */}
            <Card className='bg-background/90 backdrop-blur-sm border border-pink-500/20 shadow-2xl shadow-primary/10'>
              <CardHeader>
                <CardTitle className='flex items-center text-off-white text-2xl'>
                  <Star className='mr-3 h-5 w-5 text-pink-400' />
                  COURIER STATUS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CourierBadges
                  trustScore={reputationScore}
                  deliveryCount={profile?.deliveries || 0}
                  followers={profile?.followers || 0}
                  following={profile?.following || 0}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Recent Deliveries */}
          <div className='lg:col-span-2 space-y-8'>
            <Card className='bg-background/90 backdrop-blur-sm border border-pink-500/20 shadow-2xl shadow-primary/10 h-full'>
              <CardHeader>
                <CardTitle className='flex items-center text-off-white text-2xl'>
                  <Truck className='mr-3 h-5 w-5 text-pink-400' />
                  DELIVERY LOG
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentDeliveries.length > 0 ? (
                  <ul className='space-y-4'>
                    {recentDeliveries.map((delivery, index) => (
                      <li
                        key={delivery.id || index}
                        className='flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/10'
                      >
                        <div className='flex items-center'>
                          <div className='p-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-md mr-4'>
                            <Package className='h-6 w-6 text-off-white' />
                          </div>
                          <div>
                            <p className='font-semibold text-off-white'>
                              Package Delivered
                            </p>
                            <p className='text-sm text-off-white-70'>
                              To:{' '}
                              {delivery.tags?.find(
                                (t: [string, string]) => t[0] === 'location'
                              )?.[1] || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='flex items-center text-sm text-green-400'>
                            <CheckCircle className='h-4 w-4 mr-1' />
                            Completed
                          </div>
                          <p className='text-xs text-off-white-60 mt-1'>
                            {getTimeAgo(delivery.created_at)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className='text-center py-12'>
                    <Package className='mx-auto h-12 w-12 text-pink-400/50 mb-4' />
                    <h3 className='text-xl font-semibold text-off-white'>
                      No Deliveries Yet
                    </h3>
                    <p className='text-off-white-70 mt-2'>
                      Your completed deliveries will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 
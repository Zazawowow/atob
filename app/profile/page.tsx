'use client';

import { useEffect, useState } from 'react';
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
  ServerCrash,
  User,
  KeyRound,
  LogOut,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { getUserProfile, type ProfileData, getMyDeliveries } from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import { getNpub } from '@/lib/nostr-keys';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

function getTimeAgo(timestamp: number) {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - timestamp * 1000) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + ' years ago';
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + ' months ago';
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + ' days ago';
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + ' hours ago';
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + ' minutes ago';
  }
  return Math.floor(seconds) + ' seconds ago';
}

export default function Profile() {
  const { publicKey, isReady, logout } = useNostr();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [npub, setNpub] = useState<string>('');
  const [reputationScore, setReputationScore] = useState(0);
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!publicKey || !isReady) {
      setLoading(false);
      return;
    }

    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const fullNpub = getNpub(publicKey);
        setNpub(fullNpub);

        // Fetch profile and deliveries in parallel
        const [profileData, deliveries] = await Promise.all([
          getUserProfile(publicKey),
          getMyDeliveries(),
        ]);
        
        setProfile(profileData);
        calculateReputationScore(profileData);
        setRecentDeliveries(deliveries.slice(0, 5));

      } catch (error) {
        toast.error('Error', {
          description: 'Failed to load profile data.',
        });
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [publicKey, isReady]);

  const calculateReputationScore = (profileData: ProfileData) => {
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

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!isReady || !publicKey) {
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
        <div className='flex justify-center items-center h-64'>
          <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
          <p className='ml-2 text-white'>
            {isReady ? 'Please log in to see your profile' : 'Loading Nostr...'}
          </p>
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
                  {loading ? (
                    <Skeleton className='w-28 h-28 rounded-full' />
                  ) : profile?.picture ? (
                    <img
                      src={profile.picture}
                      alt={profile.displayName || profile.name || 'User'}
                      className='w-28 h-28 rounded-full object-cover border-2 border-purple-400/50 shadow-lg'
                    />
                  ) : (
                    <div className='w-28 h-28 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg border-2 border-purple-400/50'>
                      <User className='h-14 w-14 text-off-white' />
                    </div>
                  )}
                  <h2 className='text-2xl font-bold mt-4 text-off-white'>
                    {loading ? (
                      <Skeleton className='h-8 w-48' />
                    ) : (
                      profile?.displayName || profile?.name || 'Anonymous Agent'
                    )}
                  </h2>
                  <p className='text-sm text-purple-300 break-all mt-1 font-mono'>
                    {loading ? (
                      <Skeleton className='h-5 w-32' />
                    ) : (
                      `${npub.slice(0, 10)}...${npub.slice(-4)}`
                    )}
                  </p>
                </div>

                <div className='grid grid-cols-3 gap-4 text-center pt-6 mt-6 border-t border-white/10'>
                  <div>
                    <p className='text-2xl font-bold text-off-white'>
                      {loading ? (
                        <Skeleton className='h-8 w-12 mx-auto' />
                      ) : (
                        profile?.followers || 0
                      )}
                    </p>
                    <p className='text-xs text-off-white-70 uppercase tracking-wider'>
                      Followers
                    </p>
                  </div>
                  <div>
                    <p className='text-2xl font-bold text-off-white'>
                      {loading ? (
                        <Skeleton className='h-8 w-12 mx-auto' />
                      ) : (
                        profile?.following || 0
                      )}
                    </p>
                    <p className='text-xs text-off-white-70 uppercase tracking-wider'>
                      Following
                    </p>
                  </div>
                  <div>
                    <p className='text-2xl font-bold text-off-white'>
                      {loading ? (
                        <Skeleton className='h-8 w-12 mx-auto' />
                      ) : (
                        profile?.deliveries || 0
                      )}
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
                {loading ? (
                  <div className='space-y-4'>
                    <div className='flex justify-center'>
                      <Skeleton className='h-16 w-48' />
                    </div>
                    <Skeleton className='h-2 w-full' />
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Recent Deliveries */}
          <div className='lg:col-span-2'>
            <Card className='bg-background/90 backdrop-blur-sm border border-pink-500/20 shadow-2xl shadow-primary/10 h-full'>
              <CardHeader>
                <CardTitle className='flex items-center text-off-white text-2xl'>
                  <Truck className='mr-3 h-5 w-5 text-pink-400' />
                  DELIVERY LOG
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ul className='space-y-4'>
                    {[...Array(3)].map((_, i) => (
                      <li
                        key={i}
                        className='flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/10'
                      >
                        <div className='flex items-center gap-4'>
                          <Skeleton className='h-12 w-12 rounded-md' />
                          <div className='space-y-2'>
                            <Skeleton className='h-4 w-32' />
                            <Skeleton className='h-4 w-48' />
                          </div>
                        </div>
                        <Skeleton className='h-6 w-24' />
                      </li>
                    ))}
                  </ul>
                ) : recentDeliveries.length > 0 ? (
                  <ul className='space-y-4'>
                    {recentDeliveries.map((delivery, index) => (
                      <li
                        key={index}
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

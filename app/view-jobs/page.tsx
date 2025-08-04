'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Briefcase, MapPin, Users, Bitcoin, Clock, Eye } from 'lucide-react';
import Link from 'next/link';
import { getJobs, applyForJob, getEffectiveStatus } from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import Image from 'next/image';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function ViewJobs() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useNostr();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    if (!isReady || !isLoggedIn) return;

    setLoading(true);
    setError(null);

    try {
      const allJobs = await getJobs();
      setJobs(allJobs);
      console.log('Loaded jobs:', allJobs.length);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setError('Failed to load jobs. Please try again.');
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [isReady, isLoggedIn]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRefresh = () => {
    loadJobs();
  };

  const handleApplyForJob = async (jobId: string) => {
    try {
      await applyForJob(jobId);
      toast.success('Application submitted successfully');
      loadJobs(); // Refresh the list
    } catch (error) {
      console.error('Failed to apply for job:', error);
      toast.error('Failed to apply for job');
    }
  };

  const formatCompensation = (compensation: string) => {
    const amount = parseInt(compensation);
    if (isNaN(amount)) return compensation;
    
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(2)} BTC`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k sats`;
    } else {
      return `${amount} sats`;
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
            <Briefcase className='h-16 w-16 mx-auto mb-4 text-gray-400' />
            <h3 className='text-xl text-off-white mb-2'>Authentication Required</h3>
            <p className='text-gray-400 mb-6'>
              You must be logged in with Nostr to view jobs.
            </p>
            <Button onClick={() => router.push('/')} className='btn-purple'>
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
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Header */}
          <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
            <div>
              <h1 className='text-3xl md:text-4xl text-off-white mb-2'>
                Available Jobs
              </h1>
              <p className='text-purple-300 text-lg'>
                Browse and apply for available jobs
              </p>
            </div>
            <div className='flex gap-2'>
              <Button onClick={handleRefresh} variant='outline' className='btn-outline-purple'>
                Refresh
              </Button>
              <Link href='/post-job'>
                <Button className='btn-purple'>
                  Post Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Jobs List */}
          <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
            <CardHeader>
                                <CardTitle className='text-off-white text-xl'>
                All Jobs ({jobs.length})
              </CardTitle>
              <CardDescription className='text-purple-300'>
                List of all available jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='flex justify-center items-center h-32'>
                  <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
                  <p className='ml-2'>Loading jobs...</p>
                </div>
              ) : error ? (
                <div className='text-center text-red-400 py-8'>
                  <p>{error}</p>
                  <Button onClick={handleRefresh} className='mt-4 btn-purple'>
                    Try Again
                  </Button>
                </div>
              ) : jobs.length === 0 ? (
                <div className='text-center text-gray-400 py-8'>
                  <Briefcase className='h-16 w-16 mx-auto mb-4 opacity-50' />
                  <p>No jobs available</p>
                  <Link href='/post-job'>
                    <Button className='mt-4 btn-purple'>
                      Post First Job
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {jobs.map((job) => {
                    const effectiveStatus = getEffectiveStatus(job);
                    
                    return (
                      <Card key={job.id} className='bg-black/20 border border-purple-500/10 hover:border-purple-500/30 transition-all duration-300'>
                        <CardHeader className='pb-3'>
                          <div className='flex justify-between items-start'>
                            <CardTitle className='text-off-white text-lg line-clamp-2'>
                              {job.title}
                            </CardTitle>
                            <Badge className='bg-green-500/10 text-green-400 border-green-500/30'>
                              {effectiveStatus === 'available' ? 'Available' : 'Filled'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className='space-y-3'>
                          <div className='flex items-center gap-2 text-sm'>
                            <MapPin className='h-4 w-4 text-purple-400' />
                            <span className='text-gray-300'>{job.location}</span>
                          </div>
                          
                          <div className='flex items-center gap-2 text-sm'>
                            <Users className='h-4 w-4 text-blue-400' />
                            <span className='text-gray-300'>
                              {job.peopleNeeded} person{job.peopleNeeded > 1 ? 's' : ''} needed
                            </span>
                          </div>
                          
                          <div className='flex items-center gap-2 text-sm'>
                            <Bitcoin className='h-4 w-4 text-yellow-400' />
                            <span className='text-gray-300'>
                              {formatCompensation(job.compensation)}
                            </span>
                          </div>
                          
                          {job.duration && (
                            <div className='flex items-center gap-2 text-sm'>
                              <Clock className='h-4 w-4 text-cyan-400' />
                              <span className='text-gray-300'>{job.duration}</span>
                            </div>
                          )}
                          
                          {job.description && (
                            <p className='text-sm text-gray-400 line-clamp-2'>
                              {job.description}
                            </p>
                          )}
                        </CardContent>
                        <CardFooter className='pt-3'>
                          <div className='flex gap-2 w-full'>
                            <Button 
                              variant='outline' 
                              size='sm' 
                              className='flex-1 btn-outline-purple'
                              onClick={() => handleApplyForJob(job.id)}
                            >
                              <Eye className='h-4 w-4 mr-1' />
                              Apply
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
} 
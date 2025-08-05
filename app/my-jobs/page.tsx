'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Briefcase, RefreshCw, Trash2, CheckCircle, Users, MapPin, Bitcoin } from 'lucide-react';
import Link from 'next/link';
import { getMyJobs, deleteJob, completeJob } from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import { type JobData } from '@/lib/nostr-types';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function MyJobs() {
  const { isReady, isLoggedIn } = useNostr();
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    if (!isReady) return;
    
    try {
      setLoading(true);
      const jobsData = await getMyJobs();
      setJobs(jobsData);
      console.log(`Loaded ${jobsData.length} jobs`);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      toast.error('Failed to load your jobs');
    } finally {
      setLoading(false);
    }
  }, [isReady]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  }, [loadJobs]);

  const handleDelete = useCallback(async (jobId: string) => {
    try {
      setDeletingId(jobId);
      await deleteJob(jobId);
      toast.success('Job deleted successfully!');
      await loadJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Error', {
        description: 'Failed to delete job. Please try again.',
      });
    } finally {
      setDeletingId(null);
    }
  }, [loadJobs]);

  const handleComplete = useCallback(async (jobId: string) => {
    try {
      setCompletingId(jobId);
      await completeJob(jobId);
      toast.success('Job completed successfully!');
      await loadJobs();
    } catch (error) {
      console.error('Error completing job:', error);
      toast.error('Error', {
        description: 'Failed to complete job. Please try again.',
      });
    } finally {
      setCompletingId(null);
    }
  }, [loadJobs]);

  const formatCompensation = (compensation: string) => {
    try {
      const amount = parseInt(compensation);
      if (isNaN(amount)) return compensation;
      return `${amount} sats`;
    } catch {
      return compensation;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-400/10 text-green-400 border-green-400/30';
      case 'in_progress':
        return 'bg-blue-400/10 text-blue-400 border-blue-400/30';
      case 'completed':
        return 'bg-purple-400/10 text-purple-400 border-purple-400/30';
      case 'expired':
        return 'bg-gray-400/10 text-gray-400 border-gray-400/30';
      default:
        return 'bg-gray-400/10 text-gray-400 border-gray-400/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  if (!isReady) {
    return (
      <div className='container mx-auto px-4 pt-24 pb-8'>
        <Card className='max-w-2xl mx-auto bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
          <CardContent className='p-8 text-center'>
            <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4'></div>
            <p className='text-gray-400'>Connecting to Nostr...</p>
          </CardContent>
        </Card>
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
              You must be logged in with Nostr to view your jobs.
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
    <div className='min-h-screen'>
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
      
      <div className='container mx-auto px-4 pt-24 pb-8 relative z-10'>
        <div className='max-w-6xl mx-auto'>
          {/* Header */}
          <div className='mb-8'>
          </div>

          {/* Jobs Grid */}
          <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
            <CardHeader className='py-6 px-6'>
              <div className='flex justify-between items-start'>
                <div className='flex-1'>
                  <CardTitle className='text-off-white text-xl'>
                    My Jobs ({jobs.length})
                  </CardTitle>
                  <CardDescription className='text-purple-300'>
                    Manage your posted jobs
                  </CardDescription>
                </div>
                <Button
                  onClick={handleRefresh}
                  variant='outline'
                  size='icon'
                  className='bg-black/20 border-purple-400/20 hover:bg-purple-400/10 hover:border-purple-400/30 text-purple-300'
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='px-6 pb-6'>
              {loading ? (
                <div className='flex justify-center items-center h-64'>
                  <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
                  <p className='ml-2 text-gray-400'>Loading your jobs...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className='text-center py-12'>
                  <Briefcase className='h-16 w-16 mx-auto mb-4 text-gray-400' />
                  <h3 className='text-xl text-off-white mb-2'>No Jobs Posted</h3>
                  <p className='text-gray-400 mb-6'>
                    You haven't posted any jobs yet. Start by creating your first job posting.
                  </p>
                  <Link href='/post-job'>
                    <Button className='btn-purple'>
                      <Briefcase className='h-4 w-4 mr-2' />
                      Post Your First Job
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {jobs.map((job) => (
                <Card 
                  key={job.id} 
                  className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300'
                >
                  <CardHeader>
                    <div className='flex justify-between items-start'>
                      <CardTitle className='text-off-white text-lg line-clamp-2'>
                        {job.title}
                      </CardTitle>
                      <Badge className={getStatusColor(job.status)}>
                        {getStatusText(job.status)}
                      </Badge>
                    </div>
                    <CardDescription className='text-purple-300'>
                      Posted {new Date(job.created_at * 1000).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div className='flex items-center gap-2 text-sm'>
                      <MapPin className='h-4 w-4 text-purple-400' />
                      <span className='text-gray-300'>{job.location}</span>
                    </div>
                    
                    <div className='flex items-center gap-2 text-sm'>
                      <Bitcoin className='h-4 w-4 text-yellow-400' />
                      <span className='text-gray-300'>{formatCompensation(job.compensation)}</span>
                    </div>
                    
                    <div className='flex items-center gap-2 text-sm'>
                      <Users className='h-4 w-4 text-blue-400' />
                      <span className='text-gray-300'>
                        {job.peopleNeeded} person{job.peopleNeeded > 1 ? 's' : ''} needed
                      </span>
                    </div>
                    
                    {job.description && (
                      <p className='text-sm text-gray-400 line-clamp-3'>
                        {job.description}
                      </p>
                    )}
                    
                    {job.requirements && (
                      <div className='text-sm'>
                        <span className='text-purple-300 font-medium'>Requirements:</span>
                        <p className='text-gray-400 line-clamp-2 mt-1'>{job.requirements}</p>
                      </div>
                    )}
                    
                    {job.duration && (
                      <div className='text-sm'>
                        <span className='text-purple-300 font-medium'>Duration:</span>
                        <p className='text-gray-400 mt-1'>{job.duration}</p>
                      </div>
                    )}
                  </CardContent>
                  <CardContent className='pt-0'>
                    <div className='flex gap-2'>
                      {job.status === 'open' && (
                        <Button
                          onClick={() => handleComplete(job.id)}
                          size='sm'
                          className='flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30'
                          disabled={completingId === job.id}
                        >
                          <CheckCircle className='h-4 w-4 mr-2' />
                          {completingId === job.id ? 'Completing...' : 'Mark Complete'}
                        </Button>
                      )}
                      
                      {job.status === 'open' && (
                        <Button
                          onClick={() => handleDelete(job.id)}
                          size='sm'
                          variant='destructive'
                          className='flex-1'
                          disabled={deletingId === job.id}
                        >
                          <Trash2 className='h-4 w-4 mr-2' />
                          {deletingId === job.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 
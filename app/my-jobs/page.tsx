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
import { Briefcase, MapPin, Users, Bitcoin, Clock, User, Trash2 } from 'lucide-react';
import { useNostr } from '@/components/nostr-provider';
import { getMyJobs, deleteJob, completeJob } from '@/lib/nostr';
import type { JobData } from '@/lib/nostr-types';
import Image from 'next/image';

export default function MyJobs() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useNostr();
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingJobs, setDeletingJobs] = useState<Set<string>>(new Set());
  const [completingJobs, setCompletingJobs] = useState<Set<string>>(new Set());

  const loadJobs = useCallback(async () => {
    if (!isReady) return;
    
    try {
      setLoading(true);
      const jobsData = await getMyJobs();
      setJobs(jobsData);
    } catch (error) {
      console.error('Failed to load my jobs:', error);
      toast.error('Failed to load your jobs');
    } finally {
      setLoading(false);
    }
  }, [isReady]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleDeleteJob = useCallback(async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) {
      return;
    }

    setDeletingJobs(prev => new Set(prev).add(jobId));
    
    try {
      await deleteJob(jobId);
      toast.success('Job deleted successfully');
      await loadJobs();
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job');
    } finally {
      setDeletingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  }, [loadJobs]);

  const handleCompleteJob = useCallback(async (jobId: string) => {
    setCompletingJobs(prev => new Set(prev).add(jobId));
    
    try {
      await completeJob(jobId);
      toast.success('Job marked as completed');
      await loadJobs();
    } catch (error) {
      console.error('Failed to complete job:', error);
      toast.error('Failed to complete job');
    } finally {
      setCompletingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  }, [loadJobs]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getStatusColor = (status: JobData['status']) => {
    switch (status) {
      case 'open':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'completed':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'expired':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusText = (status: JobData['status']) => {
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
        return 'Unknown';
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
        <div className='flex justify-between items-center mb-8'>
                      <h1 className='text-3xl text-off-white flex items-center'>
            <Briefcase className='h-8 w-8 mr-3 text-cyan-400' />
            MY JOBS
          </h1>
          <Button
            onClick={() => router.push('/post-job')}
            className='btn-purple'
          >
            Post New Job
          </Button>
        </div>

        {loading ? (
          <div className='flex justify-center items-center h-64'>
            <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
            <p className='ml-2 text-off-white'>Loading your jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <Card className='max-w-2xl mx-auto bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
            <CardContent className='p-8 text-center'>
              <Briefcase className='h-16 w-16 mx-auto mb-4 text-gray-400' />
              <h3 className='text-xl text-off-white mb-2'>No Jobs Posted</h3>
              <p className='text-gray-400 mb-6'>
                You haven't posted any jobs yet. Start by posting your first job!
              </p>
              <Button
                onClick={() => router.push('/post-job')}
                className='btn-purple'
              >
                Post Your First Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {jobs.map((job) => (
              <Card
                key={job.id}
                className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300'
              >
                <CardHeader>
                  <div className='flex justify-between items-start mb-2'>
                    <CardTitle className='text-off-white text-lg line-clamp-2'>
                      {job.title}
                    </CardTitle>
                    <Badge className={`${getStatusColor(job.status)} font-cyber text-xs`}>
                      {getStatusText(job.status)}
                    </Badge>
                  </div>
                  <CardDescription className='text-gray-400 text-sm'>
                    Posted {formatDate(job.created_at)}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className='space-y-4'>
                  <div className='flex items-center text-gray-300 text-sm'>
                    <MapPin className='h-4 w-4 mr-2 text-cyan-400' />
                    <span className='line-clamp-1'>{job.location}</span>
                  </div>
                  
                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center text-gray-300'>
                      <Users className='h-4 w-4 mr-2 text-cyan-400' />
                      <span>{job.peopleNeeded} needed</span>
                    </div>
                    <div className='flex items-center text-gray-300'>
                      <Bitcoin className='h-4 w-4 mr-2 text-yellow-400' />
                      <span>{job.compensation} sats</span>
                    </div>
                  </div>

                  {job.duration && (
                    <div className='flex items-center text-gray-300 text-sm'>
                      <Clock className='h-4 w-4 mr-2 text-cyan-400' />
                      <span>{job.duration}</span>
                    </div>
                  )}

                  {job.description && (
                    <p className='text-gray-400 text-sm line-clamp-3'>
                      {job.description}
                    </p>
                  )}

                  {job.assignedWorkers && job.assignedWorkers.length > 0 && (
                    <div className='flex items-center text-gray-300 text-sm'>
                      <User className='h-4 w-4 mr-2 text-cyan-400' />
                      <span>{job.assignedWorkers.length} applied</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className='flex gap-2'>
                  {job.status === 'open' && (
                    <Button
                      onClick={() => handleCompleteJob(job.id)}
                      disabled={completingJobs.has(job.id)}
                      className='flex-1 btn-cyan'
                    >
                      {completingJobs.has(job.id) ? 'Completing...' : 'Mark Complete'}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDeleteJob(job.id)}
                    disabled={deletingJobs.has(job.id)}
                    variant='destructive'
                    className='px-3'
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 
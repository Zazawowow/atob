'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Package, MapPin, Bitcoin, Eye, RefreshCw, Briefcase, Truck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getPackages, pickupPackage, deletePackage, getEffectiveStatus, getJobs, applyForJob, deleteJob } from '@/lib/nostr-client';
import { PostJobModal } from '@/components/post-job-modal';
import { PostPackageModal } from '@/components/post-package-modal';
import { DeleteConfirmationModal } from '@/components/delete-confirmation-modal';
import { useNostr } from '@/components/nostr-provider';
import Image from 'next/image';
import ActivityMap from '@/components/activity-map';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ViewPackages() {
  const router = useRouter();
  const { isReady, isLoggedIn, publicKey } = useNostr();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [packages, setPackages] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'packages' | 'jobs'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem('find-jobs-active-tab');
      if (saved === 'all' || saved === 'packages' || saved === 'jobs') return saved as 'all' | 'packages' | 'jobs';
    }
    return 'all';
  });
  const [showJobModal, setShowJobModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ id: string; title: string; type: 'job' | 'package' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Ensure lists have unique ids to avoid duplicate key warnings
  const uniquePackages = useMemo(() => {
    const seen = new Set<string>();
    return packages.filter((p) => {
      if (!p?.id) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [packages]);

  const uniqueJobs = useMemo(() => {
    const seen = new Set<string>();
    return jobs.filter((j) => {
      if (!j?.id) return false;
      if (seen.has(j.id)) return false;
      seen.add(j.id);
      return true;
    });
  }, [jobs]);

  const loadPackages = useCallback(async () => {
    if (!isReady || !isLoggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const allPackages = await getPackages();
      setPackages(allPackages);
    } catch (err) {
      console.error('Failed to load packages:', err);
      setError('Failed to load packages. Please try again.');
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, [isReady, isLoggedIn]);

  const loadJobs = useCallback(async () => {
    if (!isReady || !isLoggedIn) return;
    setJobsLoading(true);
    setError(null);
    try {
      const allJobs = await getJobs();
      setJobs(allJobs);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setError('Failed to load jobs. Please try again.');
      toast.error('Failed to load jobs');
    } finally {
      setJobsLoading(false);
    }
  }, [isReady, isLoggedIn, publicKey]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    if (isReady) {
      loadJobs();
    }
  }, [isReady, loadJobs]);

  // Track viewport for mobile master-detail behavior
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 1024);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (selectedPackage && !packages.some(pkg => pkg.id === selectedPackage.id)) {
      setSelectedPackage(null);
    }
    if (selectedJob && !jobs.some(job => job.id === selectedJob.id)) {
      setSelectedJob(null);
    }
  }, [packages, jobs, selectedPackage, selectedJob]);

  const handleRefresh = () => {
    loadPackages();
  };

  const handlePackageClick = () => {
    setShowPackageModal(true);
  };

  const handleJobClick = () => {
    setShowJobModal(true);
  };

  // Persist activeTab for the session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('find-jobs-active-tab', activeTab);
    }
  }, [activeTab]);

  const handlePackageSelect = (pkg: any) => {
    setSelectedPackage(pkg);
    setSelectedJob(null);
  };

  const handleJobSelect = (job: any) => {
    setSelectedJob(job);
    setSelectedPackage(null);
  };

  const handleApplyForJob = async (jobId: string) => {
    try {
      
      await applyForJob(jobId);
      toast.success('Application submitted successfully!');
      await loadJobs();
    } catch (error) {
      console.error('Failed to apply for job:', error);
      toast.error('Failed to apply for job. Please try again.');
    }
  };

  const handlePickup = async (packageId: string) => {
    try {
      await pickupPackage(packageId);
      toast.success('Package picked up successfully!');
      loadPackages();
    } catch (error) {
      console.error('Failed to pick up package:', error);
      toast.error('Failed to pick up package. Please try again.');
    }
  };

  const handleDelete = async (packageId: string) => {
    try {
      await deletePackage(packageId);
      toast.success('Package deleted successfully!');
      loadPackages();
    } catch (error) {
      console.error('Failed to delete package:', error);
      toast.error('Failed to delete package. Please try again.');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      toast.success('Job deleted successfully!');
      loadJobs();
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job. Please try again.');
    }
  };

  const handleDeleteClick = (item: { id: string; title: string; type: 'job' | 'package' }) => {
    setDeleteItem(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    
    setIsDeleting(true);
    try {
      if (deleteItem.type === 'job') {
        await handleDeleteJob(deleteItem.id);
      } else {
        await handleDelete(deleteItem.id);
      }
    } finally {
      setIsDeleting(false);
      setDeleteItem(null);
    }
  };

  const isOwnPackage = (pkg: any) => {
    return pkg.pubkey === publicKey;
  };

  const isOwnJob = (job: any) => {
    return job.pubkey === publicKey;
  };

  const hasAppliedToJob = (job: any) => {
    const hasApplied = job.assignedWorkers && job.assignedWorkers.includes(publicKey);
    return hasApplied;
  };

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
      case 'available':
      case 'open':
        return 'bg-green-400/10 text-green-400 border-green-400/30';
      case 'in_transit':
      case 'in_progress':
        return 'bg-blue-400/10 text-blue-400 border-blue-400/30';
      case 'delivered':
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
      case 'available':
        return 'Available';
      case 'in_transit':
        return 'In Transit';
      case 'delivered':
        return 'Delivered';
      case 'expired':
        return 'Expired';
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const formatCost = (cost: string) => {
    try {
      const amount = parseInt(cost);
      if (isNaN(amount)) return cost;
      return `${amount} sats`;
    } catch {
      return cost;
    }
  };

  const getCardBorderStyle = (type: 'delivery' | 'job' | 'package' | 'posted-job') => {
    switch (type) {
      case 'delivery':
        return 'bg-black/20 border-cyan-500/10 hover:border-cyan-500/30';
      case 'job':
        return 'bg-black/20 border-green-500/10 hover:border-green-500/30';
      case 'package':
        return 'bg-black/20 border-purple-500/10 hover:border-purple-500/30';
      case 'posted-job':
        return 'bg-black/20 border-blue-500/10 hover:border-blue-500/30';
      default:
        return 'bg-black/20 border-gray-500/10 hover:border-gray-500/30';
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

  if (!mounted || !isLoggedIn) {
    return (
      <div className='container mx-auto px-4 pt-24 pb-8'>
        <Card className='max-w-2xl mx-auto bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
          <CardContent className='p-8 text-center'>
            <Package className='h-16 w-16 mx-auto mb-4 text-gray-400' />
            <h3 className='text-xl text-off-white mb-2'>Authentication Required</h3>
            <p className='text-gray-400 mb-6'>
              You must be logged in with Nostr to view packages.
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
    <div className='container mx-auto px-4 pt-20 md:pt-24 pb-[6rem] md:pb-8 relative z-10'>
      <div className='fixed inset-0 -z-10'>
        <Image
          src='/hero-3.jpeg'
          alt='Background'
          fill
          className='object-cover object-center brightness-[0.3]'
          priority
        />
        <div className='absolute inset-0 bg-black/40' />
      </div>
      
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6'>
        <div className='h-[calc(100dvh-5rem-6rem)] md:h-[calc(100vh-10rem)]'>
          <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm h-full flex flex-col mb-24 md:mb-0'>
            <CardHeader className='px-4 lg:px-6 pb-3 border-b border-purple-500/20'>
              <div className='flex justify-between items-center'>
                <div className='flex-1'>
                  <CardTitle className='text-off-white text-xl leading-tight mb-1'>
                    {activeTab === 'packages'
                      ? `Available Work (${uniquePackages.length})`
                      : activeTab === 'jobs'
                      ? `Available Work (${uniqueJobs.length})`
                      : `Available Work (${uniquePackages.length + uniqueJobs.length})`}
                  </CardTitle>
                  <CardDescription className='text-purple-300 text-sm'>
                    Select an item to view it on the map
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    if (activeTab === 'packages') return handleRefresh();
                    if (activeTab === 'jobs') return loadJobs();
                    handleRefresh();
                    loadJobs();
                  }}
                  variant='outline'
                  size='icon'
                  className='shrink-0 bg-black/20 border-purple-400/20 hover:bg-purple-400/10 hover:border-purple-400/30 text-purple-300'
                  disabled={activeTab === 'packages' ? loading : activeTab === 'jobs' ? jobsLoading : (loading || jobsLoading)}
                >
                  <RefreshCw className={`h-4 w-4 ${((activeTab === 'packages' && loading) || (activeTab === 'jobs' && jobsLoading) || (activeTab === 'all' && (loading || jobsLoading))) ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className='hidden md:grid grid-cols-3 gap-2'>
                <Button
                  variant={activeTab === 'all' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setActiveTab('all')}
                  className={`${
                    activeTab === 'all'
                      ? 'bg-purple-400/20 text-purple-400 border-purple-400/30'
                      : 'bg-black/20 text-[#FAFAFA]/70 border-purple-400/20 hover:bg-purple-400/10'
                  } w-full`}
                >
                  All
                </Button>
                <Button
                  variant={activeTab === 'packages' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setActiveTab('packages')}
                  className={`${
                    activeTab === 'packages'
                      ? 'bg-purple-400/20 text-purple-400 border-purple-400/30'
                      : 'bg-black/20 text-[#FAFAFA]/70 border-purple-400/20 hover:bg-purple-400/10'
                  } w-full`}
                >
                  <Package className='h-4 w-4 mr-2' />
                  Packages
                </Button>
                <Button
                  variant={activeTab === 'jobs' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setActiveTab('jobs')}
                  className={`${
                    activeTab === 'jobs'
                      ? 'bg-purple-400/20 text-purple-400 border-purple-400/30'
                      : 'bg-black/20 text-[#FAFAFA]/70 border-purple-400/20 hover:bg-purple-400/10'
                  } w-full`}
                >
                  <Briefcase className='h-4 w-4 mr-2' />
                  Jobs
                </Button>
              </div>
            </CardHeader>
            <CardContent className='flex flex-col flex-grow overflow-hidden px-4 lg:px-6 pb-0 md:pb-0'>
              <div className='space-y-2 lg:space-y-3 overflow-y-auto pr-2 flex-1 pt-0 pb-0'>
                {activeTab === 'packages' ? (
                  loading ? (
                    <div className='flex justify-center items-center h-full min-h-[200px]'>
                      <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
                      <p className='ml-2'>Loading packages...</p>
                    </div>
                  ) : error ? (
                    <div className='text-center text-red-400 py-8'>
                      <p>{error}</p>
                      <Button onClick={handleRefresh} className='mt-4 btn-purple'>
                        Try Again
                      </Button>
                    </div>
                  ) : uniquePackages.length === 0 ? (
                    <div className='text-center text-gray-400 py-8'>
                      <Package className='h-16 w-16 mx-auto mb-4 opacity-50' />
                      <p>No packages available</p>
                      <Button onClick={handlePackageClick} className='mt-4 btn-purple'>
                        Post First Package
                      </Button>
                    </div>
                  ) : (
                    uniquePackages.map((pkg) => {
                      const ownPackage = isOwnPackage(pkg);
                      const isSelected = selectedPackage?.id === pkg.id;
                      
                      return (
                        <Card 
                          key={pkg.id} 
                          className={`cursor-pointer ${getCardBorderStyle('package')} ${
                            isSelected ? 'bg-purple-400/10 border-purple-400/30' : ''
                          }`}
                          onClick={() => handlePackageSelect(pkg)}
                        >
                          <CardHeader className='p-4'>
                            <div className='flex items-center gap-2 mb-2'>
                              <svg className='h-4 w-4 text-purple-400' viewBox="0 0 122.88 122.25" fill="currentColor">
                                <g><path d="M122.57,29.25l0.31,62.88c0.01,3.28-2.05,6.1-5,7.29l0.01,0.01l-54.64,22.09c-0.99,0.4-2.05,0.6-3.12,0.6 c-0.11,0-0.22,0-0.33-0.01c-0.47,0.08-0.95,0.13-1.42,0.13c-1.06,0-2.11-0.21-3.08-0.62L4.94,100.46l0-0.01 C2.03,99.22-0.01,96.32,0,92.94l0.3-62.08c-0.04-0.66,0-1.33,0.12-1.99c0.02-0.95,0.22-1.88,0.58-2.76 c0.84-2.04,2.47-3.55,4.42-4.33l0-0.01L57.98,0.6c2.14-0.86,4.44-0.77,6.4,0.07l52.47,18.97c3.14,1.13,5.13,3.96,5.27,7.01 C122.41,27.49,122.57,28.37,122.57,29.25L122.57,29.25z M51.51,108.46l0.39-54.77L9.82,35.5L8.93,90.49L51.51,108.46L51.51,108.46 L51.51,108.46z M113.58,35.5L66.55,53.7l0.37,54.71l46.94-17.54L113.58,35.5L113.58,35.5L113.58,35.5z"/></g></svg>
                              <Badge variant='outline' className='bg-purple-400/10 text-purple-400 border-purple-400/30 text-xs'>
                                Package
                              </Badge>
                            </div>
                            <div className='flex justify-between items-start gap-3'>
                              <div className='flex-1 min-w-0'>
                                <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                  {pkg.title}
                                </CardTitle>
                                <CardDescription className='text-sm text-[#FAFAFA]/70'>
                                  {pkg.description || 'No description provided'}
                                </CardDescription>
                              </div>
                              <Badge
                                variant='outline'
                                className='hidden md:block bg-blue-400/10 text-blue-400 border-blue-400/30 flex-shrink-0'
                              >
                                {pkg.cost} sats
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className='p-4 pt-0'>
                            <div className='flex justify-between items-center'>
                              <div className='text-sm text-[#FAFAFA]/70'>
                                {pkg.pickupLocation} → {pkg.destination}
                              </div>
                              {/* Desktop/tablet action buttons */}
                              <div className='hidden md:flex gap-2'>
                                {pkg.status === 'available' && !ownPackage && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePickup(pkg.id);
                                    }}
                                    variant='outline'
                                    size='sm'
                                    className='bg-black/20 border-purple-400/20 hover:bg-purple-400/10 hover:border-purple-400/30 text-[#FAFAFA]'
                                  >
                                    <Truck className='h-4 w-4 mr-2' />
                                    Pick Up
                                  </Button>
                                )}
                                {ownPackage && pkg.status === 'available' && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick({ id: pkg.id, title: pkg.title, type: 'package' });
                                    }}
                                    variant='destructive'
                                    size='sm'
                                    className='bg-red-400/10 border-red-400/20 hover:bg-red-400/20 hover:border-red-400/30 text-red-400'
                                  >
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Mobile full-width Pick Up button */}
                            {pkg.status === 'available' && !ownPackage && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePickup(pkg.id);
                                }}
                                variant='outline'
                                size='sm'
                                className='mt-3 md:hidden w-full bg-purple-500/20 border-purple-400/30 text-off-white hover:bg-purple-500/30 hover:border-purple-400'
                              >
                                <Truck className='h-4 w-4 mr-2' />
                                Pick Up
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )
                ) : activeTab === 'jobs' ? (
                  jobsLoading ? (
                    <div className='flex justify-center items-center h-32'>
                      <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
                      <p className='ml-2'>Loading jobs...</p>
                    </div>
                  ) : error ? (
                    <div className='text-center text-red-400 py-8'>
                      <p>{error}</p>
                      <Button onClick={loadJobs} className='mt-4 btn-purple'>
                        Try Again
                      </Button>
                    </div>
                  ) : jobs.length === 0 ? (
                    <div className='text-center text-gray-400 py-8'>
                      <Briefcase className='h-16 w-16 mx-auto mb-4 opacity-50' />
                      <p>No jobs available</p>
                      <Button onClick={handleJobClick} className='mt-4 btn-purple'>
                        Post First Job
                      </Button>
                    </div>
                  ) : (
                    uniqueJobs.map((job) => {
                      const ownJob = isOwnJob(job);
                      const isSelected = selectedJob?.id === job.id;
                      
                      return (
                        <Card 
                          key={job.id} 
                          className={`cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                            isSelected
                              ? 'bg-purple-400/10 border-purple-400/30 shadow-purple-glow/20'
                              : 'bg-black/20 border-purple-500/10 hover:border-purple-500/30'
                          }`}
                          onClick={() => handleJobSelect(job)}
                        >
                          <CardHeader className='pb-2 pt-4 px-4'>
                            <div className='flex justify-between items-start'>
                              <CardTitle className='text-off-white text-lg line-clamp-2'>
                                {job.title}
                              </CardTitle>
                              <Badge className={getStatusColor(job.status)}>
                                {getStatusText(job.status)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className='space-y-2 px-4 pb-4'>
                            <div className='flex items-center gap-2 text-sm'>
                              <MapPin className='h-4 w-4 text-purple-400' />
                              <span className='text-gray-300'>
                                {job.location}
                              </span>
                            </div>
                            
                            <div className='flex items-center gap-2 text-sm'>
                              <Bitcoin className='h-4 w-4 text-yellow-400' />
                              <span className='text-gray-300'>
                                {formatCompensation(job.compensation)}
                              </span>
                            </div>
                            
                            <div className='flex items-center gap-2 text-sm'>
                              <Briefcase className='h-4 w-4 text-blue-400' />
                              <span className='text-gray-300'>
                                {job.peopleNeeded} person{job.peopleNeeded > 1 ? 's' : ''} needed
                              </span>
                            </div>
                            
                            {job.description && (
                              <p className='text-sm text-gray-400 line-clamp-2'>
                                {job.description}
                              </p>
                            )}
                            
                            {/* Action buttons */}
                            <div className='flex gap-2 pt-1'>
                              {job.status === 'open' && !ownJob && !hasAppliedToJob(job) && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApplyForJob(job.id);
                                  }}
                                  size='sm'
                                  variant='outline'
                                  className='flex-1 bg-transparent border-purple-400/50 text-purple-400 hover:bg-purple-400/10 hover:border-purple-400'
                                >
                                  Apply
                                </Button>
                              )}
                              
                              {job.status === 'open' && !ownJob && hasAppliedToJob(job) && (
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='flex-1 bg-transparent border-green-400/50 text-green-400 cursor-not-allowed'
                                  disabled
                                >
                                  Applied
                                </Button>
                              )}
                              
                              
                              
                              {ownJob && job.status === 'open' && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick({ id: job.id, title: job.title, type: 'job' });
                                  }}
                                  size='sm'
                                  variant='destructive'
                                  className='flex-1'
                                >
                                  Delete
                                </Button>
                              )}
                              
                              {job.status === 'in_progress' && (
                                <Badge className='bg-blue-400/10 text-blue-400 border-blue-400/30'>
                                  In Progress
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )
                ) : (
                  // all
                  <>
                    {/* Packages section */}
                    {packages.length > 0 && (
                      <div className='space-y-2'>
                        {packages.map((pkg) => {
                          const ownPackage = isOwnPackage(pkg);
                          const isSelected = selectedPackage?.id === pkg.id;
                          return (
                            <Card
                              key={`all-pkg-${pkg.id}`}
                              className={`cursor-pointer ${getCardBorderStyle('package')} ${
                                isSelected ? 'bg-purple-400/10 border-purple-400/30' : ''
                              }`}
                              onClick={() => handlePackageSelect(pkg)}
                            >
                              <CardHeader className='p-4'>
                                <div className='flex items-center gap-2 mb-2'>
                                  <svg className='h-4 w-4 text-purple-400' viewBox="0 0 122.88 122.25" fill="currentColor"><g><path d="M122.57,29.25l0.31,62.88c0.01,3.28-2.05,6.1-5,7.29l0.01,0.01l-54.64,22.09c-0.99,0.4-2.05,0.6-3.12,0.6 c-0.11,0-0.22,0-0.33-0.01c-0.47,0.08-0.95,0.13-1.42,0.13c-1.06,0-2.11-0.21-3.08-0.62L4.94,100.46l0-0.01 C2.03,99.22-0.01,96.32,0,92.94l0.3-62.08c-0.04-0.66,0-1.33,0.12-1.99c0.02-0.95,0.22-1.88,0.58-2.76 c0.84-2.04,2.47-3.55,4.42-4.33l0-0.01L57.98,0.6c2.14-0.86,4.44-0.77,6.4,0.07l52.47,18.97c3.14,1.13,5.13,3.96,5.27,7.01 C122.41,27.49,122.57,28.37,122.57,29.25L122.57,29.25z M51.51,108.46l0.39-54.77L9.82,35.5L8.93,90.49L51.51,108.46L51.51,108.46 L51.51,108.46z M113.58,35.5L66.55,53.7l0.37,54.71l46.94-17.54L113.58,35.5L113.58,35.5L113.58,35.5z"/></g></svg>
                                  <Badge variant='outline' className='bg-purple-400/10 text-purple-400 border-purple-400/30 text-xs'>Package</Badge>
                                </div>
                                <div className='flex justify-between items-start gap-3'>
                                  <div className='flex-1 min-w-0'>
                                    <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                      {pkg.title}
                                    </CardTitle>
                                    <CardDescription className='text-sm text-[#FAFAFA]/70'>
                                      {pkg.description || 'No description provided'}
                                    </CardDescription>
                                  </div>
                                  <Badge variant='outline' className='hidden md:block bg-blue-400/10 text-blue-400 border-blue-400/30 flex-shrink-0'>
                                    {pkg.cost} sats
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className='p-4 pt-0'>
                                <div className='flex justify-between items-center'>
                                  <div className='text-sm text-[#FAFAFA]/70'>
                                    {pkg.pickupLocation} → {pkg.destination}
                                  </div>
                                  <div className='hidden md:flex gap-2'>
                                    {pkg.status === 'available' && !ownPackage && (
                                      <Button onClick={(e)=>{e.stopPropagation();handlePickup(pkg.id);}} variant='outline' size='sm' className='bg-black/20 border-purple-400/20 hover:bg-purple-400/10 hover:border-purple-400/30 text-[#FAFAFA]'>
                                        <Truck className='h-4 w-4 mr-2' />
                                        Pick Up
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {pkg.status === 'available' && !ownPackage && (
                                  <Button onClick={(e)=>{e.stopPropagation();handlePickup(pkg.id);}} variant='outline' size='sm' className='mt-3 md:hidden w-full bg-purple-500/20 border-purple-400/30 text-off-white hover:bg-purple-500/30 hover:border-purple-400'>
                                    <Truck className='h-4 w-4 mr-2' />
                                    Pick Up
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {/* Jobs section */}
                    {jobs.length > 0 && (
                      <div className='space-y-2'>
                        {jobs.map((job) => {
                          const isSelected = selectedJob?.id === job.id;
                          return (
                            <Card
                              key={`all-job-${job.id}`}
                              className={`cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                                isSelected ? 'bg-purple-400/10 border-purple-400/30 shadow-purple-glow/20' : 'bg-black/20 border-purple-500/10 hover:border-purple-500/30'
                              }`}
                              onClick={() => handleJobSelect(job)}
                            >
                              <CardHeader className='pb-2 pt-4 px-4'>
                                <div className='flex justify-between items-start'>
                                  <CardTitle className='text-off-white text-lg line-clamp-2'>
                                    {job.title}
                                  </CardTitle>
                                  <Badge className={getStatusColor(job.status)}>
                                    {getStatusText(job.status)}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className='space-y-2 px-4 pb-4'>
                                <div className='flex items-center gap-2 text-sm'>
                                  <MapPin className='h-4 w-4 text-purple-400' />
                                  <span className='text-gray-300'>
                                    {job.location}
                                  </span>
                                </div>
                                <div className='flex items-center gap-2 text-sm'>
                                  <Bitcoin className='h-4 w-4 text-yellow-400' />
                                  <span className='text-gray-300'>
                                    {formatCompensation(job.compensation)}
                                  </span>
                                </div>
                                <div className='flex items-center gap-2 text-sm'>
                                  <Briefcase className='h-4 w-4 text-blue-400' />
                                  <span className='text-gray-300'>
                                    {job.peopleNeeded} person{job.peopleNeeded > 1 ? 's' : ''} needed
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                    {packages.length === 0 && jobs.length === 0 && (
                      <div className='text-center text-gray-400 py-8'>
                        <p>No packages or jobs available</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>

            {/* Mobile bottom tabs */}
            <div className='md:hidden border-t border-purple-500/20 px-4 pt-4'>
              <div className='grid grid-cols-3 gap-2'>
                <Button
                  variant={activeTab === 'all' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setActiveTab('all')}
                  className={`${activeTab === 'all' ? 'bg-purple-400/20 text-purple-300 border-purple-400/30' : 'bg-black/20 text-[#FAFAFA]/70 border-purple-400/20 hover:bg-purple-400/10'}`}
                >
                  All
                </Button>
                <Button
                  variant={activeTab === 'packages' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setActiveTab('packages')}
                  className={`${activeTab === 'packages' ? 'bg-purple-400/20 text-purple-300 border-purple-400/30' : 'bg-black/20 text-[#FAFAFA]/70 border-purple-400/20 hover:bg-purple-400/10'}`}
                >
                  Packages
                </Button>
                <Button
                  variant={activeTab === 'jobs' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setActiveTab('jobs')}
                  className={`${activeTab === 'jobs' ? 'bg-purple-400/20 text-purple-300 border-purple-400/30' : 'bg-black/20 text-[#FAFAFA]/70 border-purple-400/20 hover:bg-purple-400/10'}`}
                >
                  Jobs
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className='h-[calc(100vh-10rem)] hidden lg:block'>
          <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm h-full flex flex-col p-0 gap-0'>
            <CardContent className='p-0 h-full'>
              <div className='h-full w-full flex flex-col'>
                <div className='px-6 pt-6 pb-4'>
                  <CardTitle className='text-off-white text-xl'>Find Jobs</CardTitle>
                  <CardDescription className='text-purple-300'>
                    Select an item to view it on the map
                  </CardDescription>
                </div>
                <div className='flex-1 rounded-b-2xl rounded-tl-none rounded-tr-none overflow-hidden'>
                  <ActivityMap
                    deliveries={[]}
                    jobs={selectedJob ? [selectedJob] : jobs}
                    packages={selectedPackage ? [selectedPackage] : packages}
                    selectedJob={selectedJob || undefined}
                    selectedPackage={selectedPackage || undefined}
                    onSelectJob={handleJobSelect}
                    onSelectPackage={handlePackageSelect}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile detail screen */}
      {isMobile && (selectedJob || selectedPackage) && (
        <div className='fixed inset-0 z-50 bg-black/90 backdrop-blur-sm pt-16'>
          <div className='h-full flex flex-col'>
            <div className='flex items-center gap-3 p-4 border-b border-purple-500/20 sticky top-0 bg-black/90'>
              <Button
                variant='outline'
                size='icon'
                className='bg-black/20 border-purple-400/20 text-[#FAFAFA]'
                onClick={() => { setSelectedJob(null); setSelectedPackage(null); }}
              >
                <ArrowLeft className='h-5 w-5' />
              </Button>
              <div>
                <p className='text-off-white text-base font-medium'>Map</p>
                <p className='text-xs text-purple-300'>View location</p>
              </div>
            </div>
            <div className='flex-1'>
              <ActivityMap
                deliveries={[]}
                jobs={selectedJob ? [selectedJob] : []}
                packages={selectedPackage ? [selectedPackage] : []}
                selectedJob={selectedJob || undefined}
                selectedPackage={selectedPackage || undefined}
                onSelectJob={handleJobSelect}
                onSelectPackage={handlePackageSelect}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <PostJobModal
        open={showJobModal}
        onOpenChange={setShowJobModal}
      />
      
      <PostPackageModal
        open={showPackageModal}
        onOpenChange={setShowPackageModal}
      />

      <DeleteConfirmationModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        description={`Are you sure you want to delete this ${deleteItem?.type}? This action cannot be undone.`}
        itemName={deleteItem?.title}
        isLoading={isDeleting}
      />
    </div>
  );
} 
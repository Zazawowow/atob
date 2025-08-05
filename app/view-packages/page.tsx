'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Package, MapPin, Bitcoin, Eye, RefreshCw, Briefcase, Truck } from 'lucide-react';
import Link from 'next/link';
import { getPackages, pickupPackage, deletePackage, getEffectiveStatus, getJobs, applyForJob, deleteJob } from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import Image from 'next/image';
import dynamicImport from 'next/dynamic';

// Dynamically import PackageMap to avoid SSR issues
const PackageMap = dynamicImport(() => import('@/components/package-map'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-800 rounded-lg flex items-center justify-center">Loading map...</div>
});

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ViewPackages() {
  const router = useRouter();
  const { isReady, isLoggedIn, publicKey } = useNostr();
  const [packages, setPackages] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'packages' | 'jobs'>('packages');

  const loadPackages = useCallback(async () => {
    if (!isReady || !isLoggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const allPackages = await getPackages();
      setPackages(allPackages);
      console.log('Loaded packages:', allPackages.length);
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
      console.log('Loaded jobs:', allJobs.length);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setError('Failed to load jobs. Please try again.');
      toast.error('Failed to load jobs');
    } finally {
      setJobsLoading(false);
    }
  }, [isReady, isLoggedIn]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    if (isReady) {
      loadJobs();
    }
  }, [isReady, loadJobs]);

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
      loadJobs();
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

  const isOwnPackage = (pkg: any) => {
    return pkg.pubkey === publicKey;
  };

  const isOwnJob = (job: any) => {
    return job.pubkey === publicKey;
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
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <div className='h-[calc(100vh-10rem)]'>
            <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm h-full flex flex-col'>
              <CardHeader className='flex flex-row justify-between items-start py-6 px-6'>
                <div className='flex-1'>
                  <div className='flex space-x-1 mb-4'>
                    <Button
                      variant={activeTab === 'packages' ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setActiveTab('packages')}
                      className={`${
                        activeTab === 'packages'
                          ? 'bg-purple-400/20 text-purple-400 border-purple-400/30'
                          : 'bg-black/20 text-[#FAFAFA]/70 border-purple-400/20 hover:bg-purple-400/10'
                      }`}
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
                      }`}
                    >
                      <Briefcase className='h-4 w-4 mr-2' />
                      Jobs
                    </Button>
                  </div>
                  <CardTitle className='text-off-white text-xl'>
                    {activeTab === 'packages' ? `Available Packages (${packages.length})` : `Available Jobs (${jobs.length})`}
                  </CardTitle>
                  <CardDescription className='text-purple-300'>
                    {activeTab === 'packages' 
                      ? 'Click on a package to view it on the map'
                      : 'Click on a job to view its details'
                    }
                  </CardDescription>
                </div>
                <Button
                  onClick={activeTab === 'packages' ? handleRefresh : loadJobs}
                  variant='outline'
                  size='icon'
                  className='bg-black/20 border-purple-400/20 hover:bg-purple-400/10 hover:border-purple-400/30 text-purple-300 -mt-2 -mr-2'
                  disabled={activeTab === 'packages' ? loading : jobsLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${(activeTab === 'packages' ? loading : jobsLoading) ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent className='flex flex-col flex-grow overflow-hidden px-6 pb-6'>
                <div className='space-y-4 overflow-y-auto pr-2 flex-1'>
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
                    ) : packages.length === 0 ? (
                      <div className='text-center text-gray-400 py-8'>
                        <Package className='h-16 w-16 mx-auto mb-4 opacity-50' />
                        <p>No packages available</p>
                        <Link href='/post-package'>
                          <Button className='mt-4 btn-purple'>
                            Post First Package
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      packages.map((pkg) => {
                        const effectiveStatus = getEffectiveStatus(pkg);
                        const ownPackage = isOwnPackage(pkg);
                        const isSelected = selectedPackage?.id === pkg.id;
                        
                        return (
                          <Card 
                            key={pkg.id} 
                            className={`cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                              isSelected
                                ? 'bg-purple-400/10 border-purple-400/30 shadow-purple-glow/20'
                                : 'bg-black/20 border-purple-500/10 hover:border-purple-500/30'
                            }`}
                            onClick={() => handlePackageSelect(pkg)}
                          >
                            <CardHeader className='pb-3'>
                              <div className='flex justify-between items-start'>
                                <CardTitle className='text-off-white text-lg line-clamp-2'>
                                  {pkg.title}
                                </CardTitle>
                                <Badge className={getStatusColor(effectiveStatus)}>
                                  {getStatusText(effectiveStatus)}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className='space-y-3'>
                              <div className='flex items-center gap-2 text-sm'>
                                <MapPin className='h-4 w-4 text-purple-400' />
                                <span className='text-gray-300'>
                                  {pkg.pickupLocation} → {pkg.destination}
                                </span>
                              </div>
                              
                              <div className='flex items-center gap-2 text-sm'>
                                <Bitcoin className='h-4 w-4 text-yellow-400' />
                                <span className='text-gray-300'>
                                  {formatCost(pkg.cost)}
                                </span>
                              </div>
                              
                              {pkg.description && (
                                <p className='text-sm text-gray-400 line-clamp-2'>
                                  {pkg.description}
                                </p>
                              )}
                              
                              {/* Action buttons */}
                              <div className='flex gap-2 pt-2'>
                                {effectiveStatus === 'available' && !ownPackage && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePickup(pkg.id);
                                    }}
                                    size='sm'
                                    className='btn-purple flex-1'
                                  >
                                    <Truck className='h-4 w-4 mr-2' />
                                    Pick Up
                                  </Button>
                                )}
                                
                                {ownPackage && effectiveStatus === 'available' && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(pkg.id);
                                    }}
                                    size='sm'
                                    variant='destructive'
                                    className='flex-1'
                                  >
                                    Delete
                                  </Button>
                                )}
                                
                                {effectiveStatus === 'in_transit' && (
                                  <Badge className='bg-blue-400/10 text-blue-400 border-blue-400/30'>
                                    In Transit
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )
                  ) : (
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
                        <Link href='/post-job'>
                          <Button className='mt-4 btn-purple'>
                            Post First Job
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      jobs.map((job) => {
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
                            <CardHeader className='pb-3'>
                              <div className='flex justify-between items-start'>
                                <CardTitle className='text-off-white text-lg line-clamp-2'>
                                  {job.title}
                                </CardTitle>
                                <Badge className={getStatusColor(job.status)}>
                                  {getStatusText(job.status)}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className='space-y-3'>
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
                              <div className='flex gap-2 pt-2'>
                                {job.status === 'open' && !ownJob && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApplyForJob(job.id);
                                    }}
                                    size='sm'
                                    className='btn-purple flex-1'
                                  >
                                    Apply
                                  </Button>
                                )}
                                
                                {ownJob && job.status === 'open' && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteJob(job.id);
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
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='h-[calc(100vh-10rem)]'>
            <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm h-full flex flex-col'>
              <CardHeader>
                              <CardTitle className='text-off-white text-xl'>
                {activeTab === 'packages' ? 'Package Map' : 'Job Details'}
              </CardTitle>
              <CardDescription className='text-purple-300'>
                {activeTab === 'packages' ? (
                  selectedPackage 
                    ? `Selected: ${selectedPackage.title}`
                    : 'Click on a package to view it on the map'
                ) : (
                  selectedJob
                    ? `Selected: ${selectedJob.title}`
                    : 'Click on a job to view its details'
                )}
              </CardDescription>
              </CardHeader>
              <CardContent className='flex-1 p-0'>
                <div className='h-full w-full'>
                  {activeTab === 'packages' ? (
                    <PackageMap
                      packages={packages}
                      selectedPackage={selectedPackage}
                      onSelectPackage={handlePackageSelect}
                    />
                  ) : (
                    selectedJob ? (
                      <div className='h-full flex flex-col'>
                        <div className='flex-1 flex justify-center items-center text-gray-400'>
                          <div className='text-center'>
                            <Briefcase className='h-16 w-16 mx-auto mb-4 text-purple-400' />
                            <p className='text-lg font-semibold text-purple-300 mb-2'>
                              {selectedJob.title}
                            </p>
                            <p className='text-sm text-gray-300 mb-1'>
                              📍 {selectedJob.location}
                            </p>
                            <p className='text-sm text-yellow-400 font-medium mb-1'>
                              {formatCompensation(selectedJob.compensation)} per person
                            </p>
                            <p className='text-sm text-blue-400 mb-1'>
                              👥 {selectedJob.peopleNeeded} person{selectedJob.peopleNeeded > 1 ? 's' : ''} needed
                            </p>
                            {selectedJob.description && (
                              <p className='text-sm text-gray-400 mb-2 line-clamp-3'>
                                {selectedJob.description}
                              </p>
                            )}
                            {selectedJob.requirements && (
                              <div className='text-sm mb-2'>
                                <span className='text-purple-300 font-medium'>Requirements:</span>
                                <p className='text-gray-400 line-clamp-2 mt-1'>{selectedJob.requirements}</p>
                              </div>
                            )}
                            {selectedJob.duration && (
                              <div className='text-sm mb-2'>
                                <span className='text-purple-300 font-medium'>Duration:</span>
                                <p className='text-gray-400 mt-1'>{selectedJob.duration}</p>
                              </div>
                            )}
                            <div className='mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg'>
                              <p className='text-xs text-purple-300'>
                                Job details and requirements
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className='flex justify-center items-center h-full text-gray-400'>
                        <div className='text-center'>
                          <Briefcase className='h-16 w-16 mx-auto mb-4 text-purple-400' />
                          <p>Select a job to view details</p>
                          <p className='text-sm text-gray-500 mt-2'>
                            Job information and requirements
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 
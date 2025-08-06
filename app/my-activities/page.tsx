'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, RefreshCw, Truck, Briefcase } from 'lucide-react';
import Link from 'next/link';
import {
  getMyDeliveries,
  completeDelivery,
  getEffectiveStatus,
  getMyJobs,
  getPackages,
  getUserProfile,
} from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import { QRCodeSVG } from 'qrcode.react';
import { debugStorage } from '@/lib/local-package-service';
import { type PackageData, type JobData } from '@/lib/nostr-types';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { CourierBadges } from '@/components/courier-badges';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function MyActivities() {
  const {
    isReady,
    publicKey,
  } = useNostr();
  const [selectedDelivery, setSelectedDelivery] = useState<PackageData | null>(
    null
  );
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [acceptingWorker, setAcceptingWorker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'jobs' | 'my-packages' | 'my-jobs'>('deliveries');
  const [myJobs, setMyJobs] = useState<JobData[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [deliveries, setDeliveries] = useState<PackageData[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(true);
  const [myPackages, setMyPackages] = useState<PackageData[]>([]);
  const [myPackagesLoading, setMyPackagesLoading] = useState(false);
  const [myPostedJobs, setMyPostedJobs] = useState<JobData[]>([]);
  const [myPostedJobsLoading, setMyPostedJobsLoading] = useState(false);
  const [applicantProfiles, setApplicantProfiles] = useState<{[key: string]: any}>({});
  const [profilesLoading, setProfilesLoading] = useState(false);

  const loadDeliveries = useCallback(async () => {
    if (!isReady) return;
    
    try {
      setDeliveriesLoading(true);
      const deliveriesData = await getMyDeliveries();
      setDeliveries(deliveriesData);
      console.log(`Loaded ${deliveriesData.length} deliveries`);
    } catch (error) {
      console.error('Failed to load deliveries:', error);
      toast.error('Failed to load your deliveries');
    } finally {
      setDeliveriesLoading(false);
    }
  }, [isReady]);

  useEffect(() => {
    // This effect handles the logic for the selected delivery when the filtered list updates.
    if (
      selectedDelivery &&
      !deliveries.some((d) => d.id === selectedDelivery.id)
    ) {
      // If the selected delivery is no longer in the active list, clear the selection.
      setSelectedDelivery(null);
      setShowQR(false);
    }
  }, [deliveries, selectedDelivery]);

  useEffect(() => {
    // This effect handles the logic for the selected job when the filtered list updates.
    if (
      selectedJob &&
      !myPostedJobs.some((j) => j.id === selectedJob.id)
    ) {
      // If the selected job is no longer in the active list, clear the selection.
      setSelectedJob(null);
      setApplicantProfiles({});
    }
  }, [myPostedJobs, selectedJob]);

  const handleComplete = useCallback(async (packageId: string) => {
    try {
      setCompletingId(packageId);

      await completeDelivery(packageId);

      // Immediately trigger a refresh of deliveries
      await loadDeliveries();

      if (selectedDelivery?.id === packageId) {
        setSelectedDelivery(null);
        setShowQR(false);
      }

      toast.success('Delivery Completed', {
        description: 'The delivery has been marked as completed.',
      });
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Error', {
        description: 'Failed to complete delivery. Please try again.',
      });
    } finally {
      setCompletingId(null); // Clear the loading state
    }
  }, [loadDeliveries, selectedDelivery]);

  const generateQRValue = useCallback((packageId: string) => {
    // Generate a URL to the confirmation page
    return `${window.location.origin}/confirm-delivery?id=${packageId}`;
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDeliveries();
    } catch (error) {
      console.error('Failed to refresh deliveries:', error);
      toast.error('Failed to refresh deliveries');
    } finally {
      setRefreshing(false);
    }
  }, [loadDeliveries]);

  const loadMyJobs = useCallback(async () => {
    if (!isReady) return;
    
    try {
      setJobsLoading(true);
      const jobsData = await getMyJobs();
      setMyJobs(jobsData);
    } catch (error) {
      console.error('Failed to load my jobs:', error);
      toast.error('Failed to load your jobs');
    } finally {
      setJobsLoading(false);
    }
  }, [isReady]);

  const loadMyPackages = useCallback(async () => {
    if (!isReady || !publicKey) return;
    
    try {
      setMyPackagesLoading(true);
      const allPackages = await getPackages();
      // Filter to only show packages posted by the current user that haven't been completed
      const userPackages = allPackages.filter(pkg => 
        pkg.pubkey === publicKey && 
        getEffectiveStatus(pkg) !== 'delivered'
      );
      setMyPackages(userPackages);
    } catch (error) {
      console.error('Failed to load my packages:', error);
      toast.error('Failed to load your packages');
    } finally {
      setMyPackagesLoading(false);
    }
  }, [isReady, publicKey]);

  const loadMyPostedJobs = useCallback(async () => {
    if (!isReady || !publicKey) return;
    
    try {
      setMyPostedJobsLoading(true);
      const allJobs = await getMyJobs();
      // Filter to only show jobs posted by the current user that haven't been completed
      const userJobs = allJobs.filter(job => 
        job.pubkey === publicKey && 
        job.status !== 'completed'
      );
      setMyPostedJobs(userJobs);
    } catch (error) {
      console.error('Failed to load my posted jobs:', error);
      toast.error('Failed to load your posted jobs');
    } finally {
      setMyPostedJobsLoading(false);
    }
  }, [isReady, publicKey]);

  const loadApplicantProfiles = useCallback(async (job: JobData) => {
    if (!job.assignedWorkers || job.assignedWorkers.length === 0) {
      setApplicantProfiles({});
      return;
    }

    try {
      setProfilesLoading(true);
      const profiles: {[key: string]: any} = {};
      
      for (const workerPubkey of job.assignedWorkers) {
        try {
          const profile = await getUserProfile(workerPubkey);
          profiles[workerPubkey] = profile;
        } catch (error) {
          console.error(`Failed to load profile for ${workerPubkey}:`, error);
          // Set a default profile
          profiles[workerPubkey] = {
            name: 'Unknown User',
            displayName: 'Unknown User',
            picture: '',
            about: '',
            deliveries: 0,
            followers: 0,
            following: 0
          };
        }
      }
      
      setApplicantProfiles(profiles);
    } catch (error) {
      console.error('Failed to load applicant profiles:', error);
      toast.error('Failed to load applicant profiles');
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  const handleAcceptWorker = useCallback(async (jobId: string, workerPubkey: string) => {
    try {
      setAcceptingWorker(workerPubkey);
      
      // Update the job status to accepted for this worker
      // This would typically involve updating the job in Nostr
      // For now, we'll just show a success message
      
      toast.success('Worker accepted successfully!');
      
      // Refresh the jobs to reflect the change
      await loadMyPostedJobs();
      
    } catch (error) {
      console.error('Failed to accept worker:', error);
      toast.error('Failed to accept worker. Please try again.');
    } finally {
      setAcceptingWorker(null);
    }
  }, [loadMyPostedJobs]);

  // Load all data once when component mounts and when isReady changes
  useEffect(() => {
    if (isReady) {
      loadDeliveries();
      loadMyJobs();
      loadMyPackages();
      loadMyPostedJobs();
    }
  }, [isReady, loadDeliveries, loadMyJobs, loadMyPackages, loadMyPostedJobs]);

  if (!isReady || deliveriesLoading) {
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

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <div className='h-[calc(100vh-10rem)]'>
            <Card className='bg-background/90 backdrop-blur-sm border border-cyan-500/20 shadow-2xl shadow-primary/10 h-full flex flex-col p-0 gap-0'>
              <CardHeader className='flex flex-row justify-between items-start py-6 px-6'>
                <div>
                  <CardTitle className='text-[#FAFAFA]'>Active Deliveries</CardTitle>
                  <CardDescription className='text-[#FAFAFA]/70'>
                    Loading deliveries...
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className='flex-grow flex items-center justify-center'>
                <div className='flex flex-col items-center gap-4 text-[#FAFAFA]/70'>
          <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
                  <p>{!isReady ? 'Connecting to Nostr...' : 'Loading Deliveries...'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column: Details placeholder during loading */}
          <div className='h-[calc(100vh-10rem)] hidden lg:block'>
            <Card className='bg-background/90 backdrop-blur-sm border border-cyan-500/20 shadow-2xl shadow-primary/10 h-full'>
              <div className='h-full animate-pulse bg-gray-800/50'></div>
            </Card>
          </div>
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

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        {/* Left Column: Delivery List */}
        <div className='h-[calc(100vh-10rem)]'>
          <Card className='bg-background/90 backdrop-blur-sm border border-cyan-500/20 shadow-2xl shadow-primary/10 h-full flex flex-col p-0 gap-0'>
            <CardHeader className='flex flex-row justify-between items-start py-6 px-6'>
              <div className='flex-1'>
                <div className='flex space-x-1 mb-4'>
                  <Button
                    variant={activeTab === 'deliveries' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setActiveTab('deliveries')}
                    className={`${
                      activeTab === 'deliveries'
                        ? 'bg-blue-400/20 text-blue-400 border-blue-400/30'
                        : 'bg-black/20 text-[#FAFAFA]/70 border-blue-400/20 hover:bg-blue-400/10'
                    }`}
                  >
                    <Truck className='h-4 w-4 mr-2' />
                    Deliveries
                  </Button>
                  <Button
                    variant={activeTab === 'jobs' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setActiveTab('jobs')}
                    className={`${
                      activeTab === 'jobs'
                        ? 'bg-blue-400/20 text-blue-400 border-blue-400/30'
                        : 'bg-black/20 text-[#FAFAFA]/70 border-blue-400/20 hover:bg-blue-400/10'
                    }`}
                  >
                    <Briefcase className='h-4 w-4 mr-2' />
                    Jobs
                  </Button>
                  <Button
                    variant={activeTab === 'my-packages' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setActiveTab('my-packages')}
                    className={`${
                      activeTab === 'my-packages'
                        ? 'bg-blue-400/20 text-blue-400 border-blue-400/30'
                        : 'bg-black/20 text-[#FAFAFA]/70 border-blue-400/20 hover:bg-blue-400/10'
                    }`}
                  >
                    <Truck className='h-4 w-4 mr-2' />
                    My Packages
                  </Button>
                  <Button
                    variant={activeTab === 'my-jobs' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setActiveTab('my-jobs')}
                    className={`${
                      activeTab === 'my-jobs'
                        ? 'bg-blue-400/20 text-blue-400 border-blue-400/30'
                        : 'bg-black/20 text-[#FAFAFA]/70 border-blue-400/20 hover:bg-blue-400/10'
                    }`}
                  >
                    <Briefcase className='h-4 w-4 mr-2' />
                    My Jobs
                  </Button>
                </div>
                <CardTitle className='text-[#FAFAFA]'>
                  {activeTab === 'deliveries' ? 'My Activities' : 
                   activeTab === 'jobs' ? 'My Activities' :
                   activeTab === 'my-packages' ? 'My Activities' :
                   'My Activities'}
                </CardTitle>
                <CardDescription className='text-[#FAFAFA]/70'>
                  {activeTab === 'deliveries' 
                    ? 'Manage your deliveries and view QR codes'
                    : activeTab === 'jobs'
                    ? 'Manage your posted jobs'
                    : activeTab === 'my-packages'
                    ? 'View your posted packages'
                    : 'View your posted jobs'
                  }
                </CardDescription>
              </div>
              <Button
                onClick={
                  activeTab === 'deliveries' ? handleRefresh : 
                  activeTab === 'jobs' ? loadMyJobs :
                  activeTab === 'my-packages' ? loadMyPackages :
                  loadMyPostedJobs
                }
                variant='outline'
                size='icon'
                className='bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 text-[#FAFAFA] -mt-2 -mr-2'
                disabled={refreshing || jobsLoading || myPackagesLoading || myPostedJobsLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${(refreshing || jobsLoading || myPackagesLoading || myPostedJobsLoading) ? 'animate-spin' : ''}`}
                />
              </Button>
            </CardHeader>
            <CardContent className='flex flex-col flex-grow overflow-hidden px-6 pb-6'>
              <div className='space-y-4 overflow-y-auto pr-2 flex-1 transition-opacity duration-200'>
                {activeTab === 'deliveries' ? (
                  <>
                    {deliveries.length === 0 ? (
                      <div className='text-center py-8 text-[#FAFAFA]/70'>
                        No active deliveries
                      </div>
                    ) : (
                      deliveries.map((delivery) => (
                    <Card
                      key={delivery.id}
                      className={`cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                        selectedDelivery?.id === delivery.id
                          ? 'bg-blue-400/10 border-blue-400/30'
                          : 'bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30'
                      }`}
                      onClick={() => {
                        setSelectedDelivery(delivery);
                        setShowQR(false);
                      }}
                    >
                      <CardHeader className='p-4'>
                        <div className='flex justify-between items-start'>
                          <div>
                            <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                              {delivery.title}
                            </CardTitle>
                            <CardDescription className='text-sm text-[#FAFAFA]/70'>
                              {delivery.description || 'No description provided'}
                            </CardDescription>
                          </div>
                          <Badge
                            variant='outline'
                            className='bg-blue-400/10 text-blue-400 border-blue-400/30'
                          >
                            {delivery.cost} sats
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className='p-4 pt-0'>
                        <div className='flex justify-between items-center'>
                          <div className='text-sm text-[#FAFAFA]/70'>
                            {delivery.pickupLocation} → {delivery.destination}
                          </div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(delivery.id);
                            }}
                            variant='outline'
                            size='sm'
                            className='bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 text-[#FAFAFA]'
                            disabled={completingId === delivery.id}
                          >
                            {completingId === delivery.id ? (
                              <span className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full' />
                            ) : (
                              'Complete'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
                ) : activeTab === 'my-packages' ? (
                  <>
                    {myPackagesLoading && myPackages.length === 0 ? (
                      <div className='text-center py-8 text-[#FAFAFA]/70'>
                        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4'></div>
                        Loading packages...
                      </div>
                    ) : myPackages.length === 0 ? (
                      <div className='text-center py-8 text-[#FAFAFA]/70'>
                        No packages posted yet
                      </div>
                    ) : (
                      myPackages.map((pkg) => (
                        <Card
                          key={pkg.id}
                          className='bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 transition-all duration-300'
                        >
                          <CardHeader className='p-4'>
                            <div className='flex justify-between items-start'>
                              <div>
                                <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                  {pkg.title}
                                </CardTitle>
                                <CardDescription className='text-sm text-[#FAFAFA]/70'>
                                  {pkg.description || 'No description provided'}
                                </CardDescription>
                              </div>
                              <Badge
                                variant='outline'
                                className='bg-blue-400/10 text-blue-400 border-blue-400/30'
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
                              <Badge
                                variant='outline'
                                className={`text-xs ${
                                  getEffectiveStatus(pkg) === 'available'
                                    ? 'bg-green-400/10 text-green-400 border-green-400/30'
                                    : getEffectiveStatus(pkg) === 'in_transit'
                                    ? 'bg-blue-400/10 text-blue-400 border-blue-400/30'
                                    : 'bg-gray-400/10 text-gray-400 border-gray-400/30'
                                }`}
                              >
                                {getEffectiveStatus(pkg) === 'available' ? 'Available' : 
                                 getEffectiveStatus(pkg) === 'in_transit' ? 'In Transit' : 
                                 getEffectiveStatus(pkg)}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </>
                ) : activeTab === 'my-jobs' ? (
                  <>
                    {myPostedJobsLoading && myPostedJobs.length === 0 ? (
                      <div className='text-center py-8 text-[#FAFAFA]/70'>
                        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4'></div>
                        Loading jobs...
                      </div>
                    ) : myPostedJobs.length === 0 ? (
                      <div className='text-center py-8 text-[#FAFAFA]/70'>
                        No jobs posted yet
                      </div>
                    ) : (
                      myPostedJobs.map((job) => (
                        <Card
                          key={job.id}
                          className={`cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                            selectedJob?.id === job.id
                              ? 'bg-blue-400/10 border-blue-400/30'
                              : 'bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30'
                          }`}
                          onClick={() => {
                            setSelectedJob(job);
                            loadApplicantProfiles(job);
                          }}
                        >
                          <CardHeader className='p-4'>
                            <div className='flex justify-between items-start'>
                              <div>
                                <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                  {job.title}
                                </CardTitle>
                                <CardDescription className='text-sm text-[#FAFAFA]/70'>
                                  {job.description || 'No description provided'}
                                </CardDescription>
                              </div>
                              <Badge
                                variant='outline'
                                className='bg-blue-400/10 text-blue-400 border-blue-400/30'
                              >
                                {job.compensation} sats
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className='p-4 pt-0'>
                            <div className='flex justify-between items-center'>
                              <div className='text-sm text-[#FAFAFA]/70'>
                                {job.location} • {job.peopleNeeded} needed
                              </div>
                              <Badge
                                variant='outline'
                                className={`text-xs ${
                                  job.status === 'open'
                                    ? 'bg-green-400/10 text-green-400 border-green-400/30'
                                    : job.status === 'in_progress'
                                    ? 'bg-blue-400/10 text-blue-400 border-blue-400/30'
                                    : 'bg-gray-400/10 text-gray-400 border-gray-400/30'
                                }`}
                              >
                                {job.status === 'open' ? 'Open' : job.status === 'in_progress' ? 'In Progress' : 'Completed'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </>
                ) : (
                  <>
                    {jobsLoading && myJobs.length === 0 ? (
                      <div className='text-center py-8 text-[#FAFAFA]/70'>
                        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4'></div>
                        Loading jobs...
                      </div>
                    ) : myJobs.length === 0 ? (
                      <div className='text-center py-8 text-[#FAFAFA]/70'>
                        No jobs posted yet
                      </div>
                    ) : (
                      myJobs.map((job) => (
                        <Card
                          key={job.id}
                          className='bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 transition-all duration-300'
                        >
                          <CardHeader className='p-4'>
                            <div className='flex justify-between items-start'>
                              <div>
                                <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                  {job.title}
                                </CardTitle>
                                <CardDescription className='text-sm text-[#FAFAFA]/70'>
                                  {job.description || 'No description provided'}
                                </CardDescription>
                              </div>
                              <Badge
                                variant='outline'
                                className='bg-blue-400/10 text-blue-400 border-blue-400/30'
                              >
                                {job.compensation} sats
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className='p-4 pt-0'>
                            <div className='flex justify-between items-center'>
                              <div className='text-sm text-[#FAFAFA]/70'>
                                {job.location} • {job.peopleNeeded} needed
                              </div>
                              <Badge
                                variant='outline'
                                className={`text-xs ${
                                  job.status === 'open'
                                    ? 'bg-green-400/10 text-green-400 border-green-400/30'
                                    : job.status === 'in_progress'
                                    ? 'bg-blue-400/10 text-blue-400 border-blue-400/30'
                                    : 'bg-gray-400/10 text-gray-400 border-gray-400/30'
                                }`}
                              >
                                {job.status === 'open' ? 'Open' : job.status === 'in_progress' ? 'In Progress' : 'Completed'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Delivery Details or Applicant Details */}
        <div className='h-[calc(100vh-10rem)]'>
          <Card className='bg-background/90 backdrop-blur-sm border border-cyan-500/20 shadow-2xl shadow-primary/10 h-full flex flex-col p-0 gap-0'>
            <CardHeader className='py-6 px-6'>
              <CardTitle className='text-[#FAFAFA]'>
                {activeTab === 'my-jobs' && selectedJob ? 'Applicant Details' : 'Delivery Details'}
              </CardTitle>
              <CardDescription className='text-[#FAFAFA]/70'>
                {activeTab === 'my-jobs' && selectedJob
                  ? `View applicants for ${selectedJob.title}`
                  : selectedDelivery
                  ? 'Show QR code to recipient to confirm delivery'
                  : 'Select a delivery to view details'}
              </CardDescription>
            </CardHeader>
            <CardContent className='flex items-center justify-center p-0 flex-grow'>
              {activeTab === 'my-jobs' && selectedJob ? (
                <div className='space-y-4 w-full p-6 overflow-y-auto'>
                  {profilesLoading ? (
                    <div className='text-center py-8 text-[#FAFAFA]/70'>
                      <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4'></div>
                      Loading applicant profiles...
                    </div>
                  ) : selectedJob.assignedWorkers && selectedJob.assignedWorkers.length > 0 ? (
                    selectedJob.assignedWorkers.map((workerPubkey) => {
                      const profile = applicantProfiles[workerPubkey];
                      if (!profile) return null;
                      
                      return (
                        <Card
                          key={workerPubkey}
                          className='bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 transition-all duration-300'
                        >
                          <CardHeader className='p-4'>
                            <div className='flex items-start space-x-4'>
                              <div className='relative'>
                                {profile.picture ? (
                                  <Image
                                    src={profile.picture}
                                    alt={profile.displayName || profile.name}
                                    width={48}
                                    height={48}
                                    className='rounded-full'
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <div className={`w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-400 font-semibold ${profile.picture ? 'hidden' : ''}`}>
                                  {(profile.displayName || profile.name || 'U').charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <div className='flex-1'>
                                <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                  {profile.displayName || profile.name || 'Unknown User'}
                                </CardTitle>
                                <CardDescription className='text-sm text-[#FAFAFA]/70 mb-3'>
                                  {profile.about || 'No description available'}
                                </CardDescription>
                                <CourierBadges
                                  reputationScore={profile.deliveries * 10 + (profile.followers || 0) * 2 + (profile.following || 0)}
                                  deliveries={profile.deliveries || 0}
                                  followers={profile.followers || 0}
                                  following={profile.following || 0}
                                />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className='p-4 pt-0'>
                            <div className='flex justify-between items-center'>
                              <div className='text-sm text-[#FAFAFA]/70'>
                                {profile.deliveries || 0} deliveries • {profile.followers || 0} followers
                              </div>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptWorker(selectedJob.id, workerPubkey);
                                }}
                                variant='outline'
                                size='sm'
                                className='bg-green-400/10 border-green-400/20 hover:bg-green-400/20 hover:border-green-400/30 text-green-400'
                                disabled={acceptingWorker === workerPubkey}
                              >
                                {acceptingWorker === workerPubkey ? (
                                  <span className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full' />
                                ) : (
                                  'Accept'
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className='text-center py-8 text-[#FAFAFA]/70'>
                      No applicants yet for this job
                    </div>
                  )}
                </div>
              ) : selectedDelivery ? (
                <div className='space-y-6 w-full p-6'>
                  <div className='flex justify-center'>
                    {showQR ? (
                      <div className='bg-white p-4 rounded-lg'>
                        <QRCodeSVG
                          value={generateQRValue(selectedDelivery.id)}
                          size={200}
                          level='H'
                          includeMargin={true}
                        />
                      </div>
                    ) : (
                      <Button
                        onClick={() => setShowQR(true)}
                        className='w-full bg-blue-400 hover:bg-blue-400/90 text-[#FAFAFA] font-medium shadow-[0_0_15px_rgba(96,165,250,0.15)] hover:shadow-[0_0_25px_rgba(96,165,250,0.25)] transform hover:-translate-y-1 transition-all duration-300'
                      >
                        Show QR Code
                      </Button>
                    )}
                  </div>
                  <div className='space-y-4'>
                    <div>
                      <h3 className='text-sm font-medium text-[#FAFAFA]'>Pickup Location</h3>
                      <p className='text-[#FAFAFA]/70'>{selectedDelivery.pickupLocation}</p>
                    </div>
                    <div>
                      <h3 className='text-sm font-medium text-[#FAFAFA]'>Destination</h3>
                      <p className='text-[#FAFAFA]/70'>{selectedDelivery.destination}</p>
                    </div>
                    <div>
                      <h3 className='text-sm font-medium text-[#FAFAFA]'>Cost</h3>
                      <p className='text-[#FAFAFA]/70'>{selectedDelivery.cost} sats</p>
                    </div>
                    {selectedDelivery.description && (
                      <div>
                        <h3 className='text-sm font-medium text-[#FAFAFA]'>Description</h3>
                        <p className='text-[#FAFAFA]/70'>{selectedDelivery.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className='text-center py-8 text-[#FAFAFA]/70'>
                  {activeTab === 'my-jobs' ? 'Select a job to view applicants' : 'Select a delivery to view details'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

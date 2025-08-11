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
import { ArrowLeft, CheckCircle, RefreshCw, Truck, Briefcase, ChevronDown } from 'lucide-react';
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
import ActivityMap from '@/components/activity-map';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function MyActivities() {
  const {
    isReady,
    publicKey,
  } = useNostr();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [selectedDelivery, setSelectedDelivery] = useState<PackageData | null>(
    null
  );
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'delivery' | 'job' | 'package' | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [acceptingWorker, setAcceptingWorker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'deliveries' | 'jobs' | 'my-packages' | 'my-jobs'>(() => {
    // Get saved tab from localStorage, default to 'all'
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('my-activities-active-tab');
      return (saved as 'all' | 'deliveries' | 'jobs' | 'my-packages' | 'my-jobs') || 'all';
    }
    return 'all';
  });
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

  const handleTabChange = useCallback((tab: 'all' | 'deliveries' | 'jobs' | 'my-packages' | 'my-jobs') => {
    setActiveTab(tab);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('my-activities-active-tab', tab);
    }
  }, []);

  // Tab options for dropdown
  const tabOptions = [
    { value: 'all', label: 'All Activities', icon: <svg className='h-4 w-4 mr-2' viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z"/><path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z"/><path d="M12 3c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"/><path d="M12 21c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2z"/></svg> },
    { value: 'deliveries', label: 'Deliveries', icon: <Truck className='h-4 w-4 mr-2' /> },
    { value: 'jobs', label: 'Work', icon: <svg className='h-4 w-4 mr-2' viewBox="0 0 122.49 122.88" fill="currentColor"><g><path d="M101.12,37.47c14.95,18.54,22.23,40.44,21.28,60.48c-6.91-16.93-17.64-34.09-31.87-49.9l-4.77,4.77 c-0.54,0.54-1.42,0.54-1.96,0L68.72,37.75c-0.54-0.54-0.54-1.42,0-1.96l4.63-4.63C57.16,17.12,39.68,6.67,22.54,0.2 c20.2-1.52,42.5,5.45,61.44,20.33l2.09-2.09c0.54-0.54,1.42-0.54,1.96,0l15.08,15.08c0.54,0.54,0.54,1.42,0,1.96L101.12,37.47 L101.12,37.47z M68.16,42.51l12.22,12.22l-65.64,65.64c-3.36,3.36-8.86,3.36-12.22,0l0,0c-3.36-3.36-3.36-8.86,0-12.22L68.16,42.51 L68.16,42.51z"/></g></svg> },
    { value: 'my-packages', label: 'My Packages', icon: <svg className='h-4 w-4 mr-2' viewBox="0 0 122.88 122.25" fill="currentColor"><g><path d="M122.57,29.25l0.31,62.88c0.01,3.28-2.05,6.1-5,7.29l0.01,0.01l-54.64,22.09c-0.99,0.4-2.05,0.6-3.12,0.6 c-0.11,0-0.22,0-0.33-0.01c-0.47,0.08-0.95,0.13-1.42,0.13c-1.06,0-2.11-0.21-3.08-0.62L4.94,100.46l0-0.01 C2.03,99.22-0.01,96.32,0,92.94l0.3-62.08c-0.04-0.66,0-1.33,0.12-1.99c0.02-0.95,0.22-1.88,0.58-2.76 c0.84-2.04,2.47-3.55,4.42-4.33l0-0.01L57.98,0.6c2.14-0.86,4.44-0.77,6.4,0.07l52.47,18.97c3.14,1.13,5.13,3.96,5.27,7.01 C122.41,27.49,122.57,28.37,122.57,29.25L122.57,29.25z M51.51,108.46l0.39-54.77L9.82,35.5L8.93,90.49L51.51,108.46L51.51,108.46 L51.51,108.46z M113.58,35.5L66.55,53.7l0.37,54.71l46.94-17.54L113.58,35.5L113.58,35.5L113.58,35.5z"/></g></svg> },
    { value: 'my-jobs', label: 'My Jobs', icon: <Briefcase className='h-4 w-4 mr-2' /> },
  ];

  const currentTab = tabOptions.find(tab => tab.value === activeTab);

  // Helper function to get border styles based on card type
  const getCardBorderStyle = (type: 'delivery' | 'job' | 'package' | 'posted-job') => {
    const baseStyle = 'transition-all duration-300 hover:-translate-y-1';
    const selectedStyle = 'bg-blue-400/10 border-blue-400/30';
    const hoverStyle = 'hover:bg-blue-400/10 hover:border-blue-400/30';
    
    switch (type) {
      case 'delivery':
        return `${baseStyle} bg-black/20 border-cyan-400/20 ${hoverStyle}`;
      case 'job':
        return `${baseStyle} bg-black/20 border-green-400/20 ${hoverStyle}`;
      case 'package':
        return `${baseStyle} bg-black/20 border-purple-400/20 ${hoverStyle}`;
      case 'posted-job':
        return `${baseStyle} bg-black/20 border-orange-400/20 ${hoverStyle}`;
      default:
        return `${baseStyle} bg-black/20 border-blue-400/20 ${hoverStyle}`;
    }
  };

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

  // Combine job sources for the map
  const allJobsForMap = useMemo(() => {
    return [...myJobs, ...myPostedJobs];
  }, [myJobs, myPostedJobs]);

  // Dynamic header content for the map container
  const mapHeader = useMemo(() => {
    const title =
      selectedItemType === 'job' ? 'Job Details' :
      selectedItemType === 'delivery' ? 'Delivery Details' :
      selectedItemType === 'package' ? 'Package Details' :
      'Package Details';

    const description =
      selectedItemType === 'job' ? 'View job information and applicants' :
      selectedItemType === 'delivery' ? 'View delivery information and location' :
      selectedItemType === 'package' ? 'View package information and location' :
      'Select an item to view details';

    return { title, description };
  }, [selectedItemType]);

  // Load all data once when component mounts and when isReady changes
  useEffect(() => {
    if (isReady) {
      loadDeliveries();
      loadMyJobs();
      loadMyPackages();
      loadMyPostedJobs();
    }
  }, [isReady, loadDeliveries, loadMyJobs, loadMyPackages, loadMyPostedJobs]);

  if (!mounted || !isReady || deliveriesLoading) {
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
            <CardHeader className='flex flex-row justify-between items-center py-6 px-6'>
              <div className='flex-1'>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      className='bg-black/20 text-[#FAFAFA]/70 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 w-full justify-between'
                    >
                      <div className='flex items-center'>
                        {currentTab?.icon}
                        {currentTab?.label}
                      </div>
                      <ChevronDown className='h-4 w-4 ml-2' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className='bg-black/95 border-blue-400/20 text-[#FAFAFA] min-w-[200px]'>
                    {tabOptions.map((tab) => (
                      <DropdownMenuItem
                        key={tab.value}
                        onClick={() => handleTabChange(tab.value as 'all' | 'deliveries' | 'jobs' | 'my-packages' | 'my-jobs')}
                        className='hover:bg-blue-400/10 focus:bg-blue-400/10 cursor-pointer'
                      >
                        {tab.icon}
                        {tab.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button
                onClick={
                  activeTab === 'all' ? () => {
                    handleRefresh();
                    loadMyJobs();
                    loadMyPackages();
                    loadMyPostedJobs();
                  } :
                  activeTab === 'deliveries' ? handleRefresh : 
                  activeTab === 'jobs' ? loadMyJobs :
                  activeTab === 'my-packages' ? loadMyPackages :
                  loadMyPostedJobs
                }
                variant='outline'
                size='icon'
                className='bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 text-[#FAFAFA] ml-3'
                disabled={refreshing || jobsLoading || myPackagesLoading || myPostedJobsLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${(refreshing || jobsLoading || myPackagesLoading || myPostedJobsLoading) ? 'animate-spin' : ''}`}
                />
              </Button>
              

            </CardHeader>

            <CardContent className='flex flex-col flex-grow overflow-hidden px-6 pb-6'>
              <div className='space-y-4 overflow-y-auto pr-2 flex-1 transition-opacity duration-200'>
                {activeTab === 'all' ? (
                  <>
                    {/* All Activities View */}
                    {deliveries.length === 0 && myJobs.length === 0 && myPackages.length === 0 && myPostedJobs.length === 0 ? (
                      <div className='text-center py-8 text-[#FAFAFA]/70'>
                        No activities found
                      </div>
                    ) : (
                      <>
                        {/* Deliveries */}
                        {deliveries.map((delivery) => (
                          <Card
                            key={`delivery-${delivery.id}`}
                            className={`cursor-pointer ${getCardBorderStyle('delivery')} ${
                              selectedDelivery?.id === delivery.id ? 'bg-blue-400/10 border-blue-400/30' : ''
                            }`}
                            onClick={() => {
                              setSelectedDelivery(delivery);
                              setSelectedJob(null);
                              setSelectedItemType('delivery');
                              setShowQR(false);
                            }}
                          >
                                                         <CardHeader className='p-4'>
                               <div className='flex items-center justify-between mb-2'>
                                 <div className='flex items-center gap-2'>
                                   <Truck className='h-4 w-4 text-cyan-400' />
                                   <Badge variant='outline' className='bg-cyan-400/10 text-cyan-400 border-cyan-400/30 text-xs'>
                                     Delivery
                                   </Badge>
                                 </div>
                                 <Badge
                                   variant='outline'
                                   className='bg-blue-400/10 text-blue-400 border-blue-400/30 px-3 py-1 text-sm font-medium'
                                 >
                                   {delivery.cost} sats
                                 </Badge>
                               </div>
                               <div>
                                 <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                   {delivery.title}
                                 </CardTitle>
                                 <CardDescription className='text-sm text-[#FAFAFA]/70'>
                                   {delivery.description || 'No description provided'}
                                 </CardDescription>
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
                        ))}

                                                {/* Jobs */}
                        {myJobs.map((job) => (
                          <Card
                            key={`job-${job.id}`}
                            className={`cursor-pointer ${getCardBorderStyle('job')}`}
                            onClick={() => {
                              setSelectedJob(job);
                              setSelectedDelivery(null);
                              setSelectedItemType('job');
                              loadApplicantProfiles(job);
                            }}
                          >
                                                         <CardHeader className='p-4'>
                               <div className='flex items-center gap-2 mb-2'>
                                 <svg className='h-4 w-4 text-green-400' viewBox="0 0 122.49 122.88" fill="currentColor">
                                   <g><path d="M101.12,37.47c14.95,18.54,22.23,40.44,21.28,60.48c-6.91-16.93-17.64-34.09-31.87-49.9l-4.77,4.77 c-0.54,0.54-1.42,0.54-1.96,0L68.72,37.75c-0.54-0.54-0.54-1.42,0-1.96l4.63-4.63C57.16,17.12,39.68,6.67,22.54,0.2 c20.2-1.52,42.5,5.45,61.44,20.33l2.09-2.09c0.54-0.54,1.42-0.54,1.96,0l15.08,15.08c0.54,0.54,0.54,1.42,0,1.96L101.12,37.47 L101.12,37.47z M68.16,42.51l12.22,12.22l-65.64,65.64c-3.36,3.36-8.86,3.36-12.22,0l0,0c-3.36-3.36-3.36-8.86,0-12.22L68.16,42.51 L68.16,42.51z"/></g></svg>
                                   <Badge variant='outline' className='bg-green-400/10 text-green-400 border-green-400/30 text-xs'>
                                     Work
                                   </Badge>
                                 </div>
                                 <div className='flex-1 min-w-0'>
                                   <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                     {job.title}
                                   </CardTitle>
                                   <CardDescription className='text-sm text-[#FAFAFA]/70'>
                                     {job.description || 'No description provided'}
                                   </CardDescription>
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
                        ))}

                        {/* My Packages */}
                        {myPackages.map((pkg) => (
                          <Card
                            key={`package-${pkg.id}`}
                            className={`cursor-pointer ${getCardBorderStyle('package')}`}
                            onClick={() => {
                              setSelectedDelivery(pkg);
                              setSelectedJob(null);
                              setSelectedItemType('package');
                            }}
                          >
                                                         <CardHeader className='p-4'>
                               <div className='flex items-center justify-between mb-2'>
                                 <div className='flex items-center gap-2'>
                                   <svg className='h-4 w-4 text-purple-400' viewBox="0 0 122.88 122.25" fill="currentColor">
                                     <g><path d="M122.57,29.25l0.31,62.88c0.01,3.28-2.05,6.1-5,7.29l0.01,0.01l-54.64,22.09c-0.99,0.4-2.05,0.6-3.12,0.6 c-0.11,0-0.22,0-0.33-0.01c-0.47,0.08-0.95,0.13-1.42,0.13c-1.06,0-2.11-0.21-3.08-0.62L4.94,100.46l0-0.01 C2.03,99.22-0.01,96.32,0,92.94l0.3-62.08c-0.04-0.66,0-1.33,0.12-1.99c0.02-0.95,0.22-1.88,0.58-2.76 c0.84-2.04,2.47-3.55,4.42-4.33l0-0.01L57.98,0.6c2.14-0.86,4.44-0.77,6.4,0.07l52.47,18.97c3.14,1.13,5.13,3.96,5.27,7.01 C122.41,27.49,122.57,28.37,122.57,29.25L122.57,29.25z M51.51,108.46l0.39-54.77L9.82,35.5L8.93,90.49L51.51,108.46L51.51,108.46 L51.51,108.46z M113.58,35.5L66.55,53.7l0.37,54.71l46.94-17.54L113.58,35.5L113.58,35.5L113.58,35.5z"/></g></svg>
                                   <Badge variant='outline' className='bg-purple-400/10 text-purple-400 border-purple-400/30 text-xs'>
                                     My Package
                                   </Badge>
                                 </div>
                                 <Badge
                                   variant='outline'
                                   className='bg-blue-400/10 text-blue-400 border-blue-400/30 px-3 py-1 text-sm font-medium'
                                 >
                                   {pkg.cost} sats
                                 </Badge>
                               </div>
                               <div>
                                 <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                   {pkg.title}
                                 </CardTitle>
                                 <CardDescription className='text-sm text-[#FAFAFA]/70'>
                                   {pkg.description || 'No description provided'}
                                 </CardDescription>
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
                                   'Delivered'}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {/* My Posted Jobs */}
                        {myPostedJobs.map((job) => (
                          <Card
                            key={`posted-job-${job.id}`}
                            className={`cursor-pointer ${getCardBorderStyle('posted-job')} ${
                              selectedJob?.id === job.id ? 'bg-blue-400/10 border-blue-400/30' : ''
                            }`}
                            onClick={() => {
                              setSelectedJob(job);
                              loadApplicantProfiles(job);
                            }}
                          >
                                                         <CardHeader className='p-4'>
                               <div className='flex items-center justify-between mb-2'>
                                 <div className='flex items-center gap-2'>
                                   <Briefcase className='h-4 w-4 text-orange-400' />
                                   <Badge variant='outline' className='bg-orange-400/10 text-orange-400 border-orange-400/30 text-xs'>
                                     My Job
                                   </Badge>
                                 </div>
                                 <Badge
                                   variant='outline'
                                   className='bg-blue-400/10 text-blue-400 border-blue-400/30 px-3 py-1 text-sm font-medium'
                                 >
                                   {job.compensation} sats
                                 </Badge>
                               </div>
                               <div>
                                 <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                   {job.title}
                                 </CardTitle>
                                 <CardDescription className='text-sm text-[#FAFAFA]/70'>
                                   {job.description || 'No description provided'}
                                 </CardDescription>
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
                        ))}
                      </>
                    )}
                  </>
                ) : activeTab === 'deliveries' ? (
                  <>
                    {deliveriesLoading && deliveries.length === 0 ? (
                      <div className='text-center py-8 text-[#FAFAFA]/70'>
                        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4'></div>
                        Loading deliveries...
                      </div>
                    ) : deliveries.length === 0 ? (
                      <div className='text-center py-8 text-[#FAFAFA]/70'>
                        No deliveries found
                      </div>
                    ) : (
                      deliveries.map((delivery) => (
                        <Card
                          key={`delivery-${delivery.id}`}
                          className={`cursor-pointer ${getCardBorderStyle('delivery')} ${
                            selectedDelivery?.id === delivery.id ? 'bg-blue-400/10 border-blue-400/30' : ''
                          }`}
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setShowQR(false);
                          }}
                        >
                          <CardHeader className='p-4'>
                            <div className='flex items-center justify-between mb-2'>
                              <div className='flex items-center gap-2'>
                                <Truck className='h-4 w-4 text-cyan-400' />
                                <Badge variant='outline' className='bg-cyan-400/10 text-cyan-400 border-cyan-400/30 text-xs'>
                                  Delivery
                                </Badge>
                              </div>
                              <Badge
                                variant='outline'
                                className='bg-blue-400/10 text-blue-400 border-blue-400/30 px-3 py-1 text-sm font-medium'
                              >
                                {delivery.cost} sats
                              </Badge>
                            </div>
                            <div>
                              <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                {delivery.title}
                              </CardTitle>
                              <CardDescription className='text-sm text-[#FAFAFA]/70'>
                                {delivery.description || 'No description provided'}
                              </CardDescription>
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
                            {/* Mobile: Badge at top, Desktop: Badge on right */}
                            <div className='md:hidden mb-3 flex justify-end'>
                              <Badge
                                variant='outline'
                                className='bg-blue-400/10 text-blue-400 border-blue-400/30 px-3 py-1 text-sm font-medium'
                              >
                                {pkg.cost} sats
                              </Badge>
                            </div>
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
                                className='hidden md:block bg-blue-400/10 text-blue-400 border-blue-400/30'
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
                            setSelectedDelivery(null);
                            setSelectedItemType('job');
                            loadApplicantProfiles(job);
                          }}
                        >
                          <CardHeader className='p-4'>
                            {/* Mobile: Badge at top, Desktop: Badge on right */}
                            <div className='md:hidden mb-3 flex justify-end'>
                              <Badge
                                variant='outline'
                                className='bg-blue-400/10 text-blue-400 border-blue-400/30 px-3 py-1 text-sm font-medium'
                              >
                                {job.compensation} sats
                              </Badge>
                            </div>
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
                                className='hidden md:block bg-blue-400/10 text-blue-400 border-blue-400/30'
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
                            <div className='flex justify-between items-start gap-3'>
                              <div className='flex-1 min-w-0'>
                                <CardTitle className='text-lg font-semibold mb-1 text-[#FAFAFA]'>
                                  {job.title}
                                </CardTitle>
                                <CardDescription className='text-sm text-[#FAFAFA]/70'>
                                  {job.description || 'No description provided'}
                                </CardDescription>
                              </div>
                              <Badge
                                variant='outline'
                                className='hidden md:block bg-blue-400/10 text-blue-400 border-blue-400/30 flex-shrink-0'
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

        {/* Right Column: Map with dynamic header */}
        <div className='h-[calc(100vh-10rem)]'>
          <Card className='bg-background/90 backdrop-blur-sm border border-cyan-500/20 shadow-2xl shadow-primary/10 h-full flex flex-col p-0 gap-0'>
            <CardContent className='p-0 h-full'>
              <div className='h-full w-full flex flex-col'>
                <div className='px-6 pt-6 pb-4'>
                  <CardTitle className='text-[#FAFAFA] text-xl'>{mapHeader.title}</CardTitle>
                  <CardDescription className='text-[#FAFAFA]/70'>
                    {mapHeader.description}
                  </CardDescription>
                </div>
                <div className='flex-1 rounded-b-2xl rounded-tl-none rounded-tr-none overflow-hidden'>
                  <ActivityMap
                    deliveries={selectedItemType === 'delivery' && selectedDelivery ? [selectedDelivery] : deliveries}
                    jobs={selectedItemType === 'job' && selectedJob ? [selectedJob] : allJobsForMap}
                    packages={selectedItemType === 'package' && selectedDelivery ? [selectedDelivery] : myPackages}
                    selectedDelivery={selectedDelivery || undefined}
                    selectedJob={selectedJob || undefined}
                    selectedPackage={selectedItemType === 'package' ? (selectedDelivery || undefined) : undefined}
                    onSelectDelivery={(d) => {
                      setSelectedDelivery(d);
                      setSelectedItemType('delivery');
                    }}
                    onSelectJob={(j) => {
                      setSelectedJob(j);
                      setSelectedItemType('job');
                      loadApplicantProfiles(j);
                    }}
                    onSelectPackage={(p) => {
                      setSelectedDelivery(p);
                      setSelectedItemType('package');
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

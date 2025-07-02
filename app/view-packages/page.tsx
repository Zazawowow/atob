'use client';
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Package,
  RefreshCw,
  Settings,
  Truck,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import {
  getPackages,
  pickupPackage,
  deletePackage,
  getEffectiveStatus,
} from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import { debugStorage } from '@/lib/local-package-service';
import dynamic from 'next/dynamic';
import { NostrStatus } from '@/components/nostr-status';
import { DebugPanel } from '@/components/debug-panel';
import { Badge } from '@/components/ui/badge';
import { type PackageData } from '@/lib/nostr-types';
import Image from 'next/image';

// Dynamically import the map component to avoid SSR issues
const PackageMap = dynamic(() => import('@/components/package-map'), {
  ssr: false,
  loading: () => (
    <div className='h-[400px] bg-gray-100 animate-pulse rounded-md'></div>
  ),
});

export default function ViewPackages() {
  const { isReady, publicKey } = useNostr();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'my-packages'>('all');
  const [pickingUpId, setPickingUpId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPackages = async () => {
    try {
      // Debug storage to see what's in localStorage
      debugStorage();

      // Fetch packages from local storage and Nostr
      const pkgs = await getPackages();
      console.log('Fetched packages:', pkgs);

      setPackages(pkgs);

      // Select the first package by default if available and none is selected
      if (pkgs.length > 0 && !selectedPackage) {
        setSelectedPackage(pkgs[0]);
      } else if (
        selectedPackage &&
        !pkgs.some((pkg) => pkg.id === selectedPackage.id)
      ) {
        // If the selected package is no longer available, clear the selection
        setSelectedPackage(null);
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to load packages. Please try again.',
      });
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;

    // Initial fetch
    fetchPackages();

    // Set up regular fetches
    const fetchInterval = setInterval(() => {
      fetchPackages();
    }, 15000); // Refresh every 15 seconds

    // Force a complete status refresh once when the component mounts
    import('@/lib/nostr').then(({ forceStatusRefresh }) => {
      forceStatusRefresh().catch((error) => {
        console.error('Error during initial status refresh:', error);
      });
    });

    return () => {
      clearInterval(fetchInterval);
    };
  }, [isReady]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPackages();
  };

  // Update the handlePickup function to ensure packages are properly removed
  const handlePickup = async (packageId: string) => {
    try {
      console.log(`Attempting to pick up package: ${packageId}`);
      setPickingUpId(packageId); // Set loading state for this package

      // Get the package data first to ensure it exists
      const packageToPickup = packages.find((pkg) => pkg.id === packageId);

      if (!packageToPickup) {
        toast.error('Error', {
          description:
            'Package not found. It may have been picked up by someone else.',
        });
        return;
      }

      // Pick up package
      await pickupPackage(packageId);

      // IMPORTANT: Always remove the package from the view immediately
      // This ensures the UI is updated even if Nostr events are delayed
      setPackages((prev) => prev.filter((pkg) => pkg.id !== packageId));

      if (selectedPackage?.id === packageId) {
        setSelectedPackage(null);
      }

      toast.success('Package Picked Up', {
        description: 'You have successfully picked up the package.',
      });

      // Refresh the list after a short delay
      setTimeout(() => {
        fetchPackages();
      }, 1000);
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to pick up package. Please try again.',
      });
      console.error('Error picking up package:', error);
    } finally {
      setPickingUpId(null); // Clear loading state
    }
  };

  const isOwnPackage = (pkg: PackageData) => {
    console.log(
      `Checking package ownership: ${pkg.pubkey} vs current user: ${publicKey}`
    );
    return pkg.pubkey === publicKey;
  };

  const handleDeletePackage = async (packageId: string) => {
    try {
      setDeletingId(packageId); // Set loading state for this package

      // Delete package
      await deletePackage(packageId);

      // Update local state
      setPackages((prev) => prev.filter((pkg) => pkg.id !== packageId));

      if (selectedPackage?.id === packageId) {
        setSelectedPackage(null);
      }

      toast.success('Package Deleted', {
        description: 'Your package has been successfully deleted.',
      });
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to delete package. Please try again.',
      });
      console.error('Error deleting package:', error);
    } finally {
      setDeletingId(null); // Clear loading state
    }
  };

  // Filter packages based on view mode
  const filteredPackages =
    viewMode === 'all'
      ? packages.filter((pkg) => getEffectiveStatus(pkg) === 'available')
      : packages.filter((pkg) => pkg.pubkey === publicKey);

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
    <div className='container mx-auto px-4 pt-24 pb-8 relative z-10'>
      <div className='fixed inset-0 -z-10'>
        <Image
          src='/hero-5.jpeg'
          alt='Background'
          fill
          className='object-cover object-center brightness-[0.3]'
          priority
        />
        <div className='absolute inset-0 bg-black/30' />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        {/* Left Column: Package List */}
        <div className='h-[calc(100vh-10rem)]'>
          <Card className='bg-background/90 backdrop-blur-sm border-2 border-primary/20 shadow-2xl shadow-primary/10 h-full flex flex-col'>
            <CardHeader className='flex flex-row justify-between items-start'>
              <div>
                <CardTitle className='text-[#FAFAFA]'>Available Packages</CardTitle>
                <CardDescription className='text-[#FAFAFA]/70'>
                  Click on a package to view its details on the map
                </CardDescription>
              </div>
              <Button
                onClick={handleRefresh}
                variant='outline'
                size='icon'
                className='bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 text-[#FAFAFA] -mt-2 -mr-2'
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </CardHeader>
            <CardContent className='flex flex-col flex-grow overflow-hidden'>
              <div className='flex gap-2 mb-4'>
                <Button
                  onClick={() => setViewMode('all')}
                  variant={viewMode === 'all' ? 'default' : 'outline'}
                  size='sm'
                  className={viewMode === 'all' ? 
                    'bg-blue-400 hover:bg-blue-400/90 text-[#FAFAFA] shadow-[0_0_15px_rgba(96,165,250,0.15)] hover:shadow-[0_0_25px_rgba(96,165,250,0.25)]' : 
                    'bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 text-[#FAFAFA]'
                  }
                >
                  All Packages
                </Button>
                <Button
                  onClick={() => setViewMode('my-packages')}
                  variant={viewMode === 'my-packages' ? 'default' : 'outline'}
                  size='sm'
                  className={viewMode === 'my-packages' ? 
                    'bg-blue-400 hover:bg-blue-400/90 text-[#FAFAFA] shadow-[0_0_15px_rgba(96,165,250,0.15)] hover:shadow-[0_0_25px_rgba(96,165,250,0.25)]' : 
                    'bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 text-[#FAFAFA]'
                  }
                >
                  My Packages
                </Button>
              </div>

              <div className='space-y-4 overflow-y-auto pr-2 flex-1'>
                {filteredPackages.length === 0 ? (
                  <div className='text-center py-8 text-[#FAFAFA]/70'>
                    No packages available
                  </div>
                ) : (
                  filteredPackages.map((pkg) => (
                    <Card
                      key={pkg.id}
                      className={`cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                        selectedPackage?.id === pkg.id
                          ? 'bg-blue-400/10 border-blue-400/30'
                          : 'bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30'
                      }`}
                      onClick={() => setSelectedPackage(pkg)}
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
                          {isOwnPackage(pkg) ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePackage(pkg.id);
                              }}
                              variant='outline'
                              size='sm'
                              className='bg-black/20 border-red-400/20 hover:bg-red-400/10 hover:border-red-400/30 text-red-400'
                              disabled={deletingId === pkg.id}
                            >
                              {deletingId === pkg.id ? (
                                <span className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full' />
                              ) : (
                                'Delete'
                              )}
                            </Button>
                          ) : (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePickup(pkg.id);
                              }}
                              variant='outline'
                              size='sm'
                              className='bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 text-[#FAFAFA]'
                              disabled={pickingUpId === pkg.id}
                            >
                              {pickingUpId === pkg.id ? (
                                <span className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full' />
                              ) : (
                                'Pick Up'
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Package Map */}
        <div className='h-[calc(100vh-10rem)]'>
          <Card className='bg-background/90 backdrop-blur-sm border-2 border-primary/20 shadow-2xl shadow-primary/10 h-full overflow-hidden'>
            <CardHeader>
              <CardTitle className='text-[#FAFAFA]'>Package Map</CardTitle>
              <CardDescription className='text-[#FAFAFA]/70'>
                View package locations and delivery routes
              </CardDescription>
            </CardHeader>
            <CardContent className='p-0 h-[calc(100%-4.5rem)]'>
              <PackageMap
                packages={filteredPackages}
                selectedPackage={selectedPackage}
                onSelectPackage={setSelectedPackage}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

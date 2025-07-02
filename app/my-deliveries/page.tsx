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
import { ArrowLeft, CheckCircle, RefreshCw, Truck } from 'lucide-react';
import Link from 'next/link';
import {
  getMyDeliveries,
  completeDelivery,
  getEffectiveStatus,
} from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import { QRCodeSVG } from 'qrcode.react';
import { debugStorage } from '@/lib/local-package-service';
import { type PackageData } from '@/lib/nostr-types';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function MyDeliveries() {
  const { isReady } = useNostr();
  const [deliveries, setDeliveries] = useState<PackageData[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<PackageData | null>(
    null
  );
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Update the fetchDeliveries function to ensure proper filtering and logging
  const fetchDeliveries = async () => {
    try {
      console.log('Fetching my deliveries...');
      setLoadingError(null);

      // Debug localStorage to see what's there
      debugStorage();

      // Set a timeout to prevent getting stuck in loading state
      const timeoutId = setTimeout(() => {
        if (loading) {
          console.log('Fetch timeout reached, using local data only');
          setLoading(false);
          setRefreshing(false);
          setLoadingError('Timeout reached. Some data may not be available.');
        }
      }, 5000); // 5 second timeout

      // Fetch deliveries from Nostr
      const pkgs = await getMyDeliveries();
      clearTimeout(timeoutId);

      console.log('Raw deliveries returned:', pkgs);

      // Log the status of each package for debugging
      pkgs.forEach((pkg) => {
        console.log(
          `Package ${pkg.id}: status=${
            pkg.status
          }, effective=${getEffectiveStatus(pkg)}`
        );
      });

      // Only show in_transit deliveries using the effective status
      const activeDeliveries = pkgs.filter(
        (pkg) => getEffectiveStatus(pkg) === 'in_transit'
      );
      console.log(
        `Filtered to ${activeDeliveries.length} active deliveries with effective status="in_transit"`
      );

      setDeliveries(activeDeliveries);

      // Update selected delivery if it's no longer active
      if (
        selectedDelivery &&
        !activeDeliveries.some((d) => d.id === selectedDelivery.id)
      ) {
        console.log(
          `Selected delivery ${selectedDelivery.id} is no longer active, clearing selection`
        );
        setSelectedDelivery(null);
        setShowQR(false);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setLoadingError('Failed to load deliveries. Please try again.');
      toast.error('Error', {
        description: 'Failed to load deliveries. Please try again.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;

    // Fetch deliveries when component mounts
    fetchDeliveries();

    // Set up a refresh interval to periodically check for new deliveries
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing deliveries...');
      fetchDeliveries();
    }, 30000); // Refresh every 30 seconds

    // Force a complete status refresh once when the component mounts
    import('@/lib/nostr').then(({ forceStatusRefresh }) => {
      forceStatusRefresh().catch((error) => {
        console.error('Error during initial status refresh:', error);
      });
    });

    return () => clearInterval(refreshInterval);
  }, [isReady]);

  // Update the handleComplete function to ensure proper state updates
  const handleComplete = async (packageId: string) => {
    try {
      console.log(`Marking package ${packageId} as delivered`);
      setCompletingId(packageId); // Set the loading state for this specific package

      // Complete delivery using Nostr
      await completeDelivery(packageId);
      console.log(
        `Package ${packageId} marked as delivered in Nostr and localStorage`
      );

      // Update local state - remove the completed delivery immediately
      setDeliveries((prev) => {
        const updated = prev.filter((pkg) => pkg.id !== packageId);
        console.log(
          `Removed package ${packageId} from UI, ${updated.length} deliveries remaining`
        );
        return updated;
      });

      // Clear selection if this was the selected delivery
      if (selectedDelivery?.id === packageId) {
        console.log(
          `Clearing selected delivery since ${packageId} was completed`
        );
        setSelectedDelivery(null);
        setShowQR(false);
      }

      toast.success('Delivery Completed', {
        description: 'The delivery has been marked as completed.',
      });

      // Refresh the list after a short delay to ensure everything is in sync
      setTimeout(() => {
        console.log('Refreshing deliveries list after completion');
        fetchDeliveries();
      }, 1000);
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Error', {
        description: 'Failed to complete delivery. Please try again.',
      });
    } finally {
      setCompletingId(null); // Clear the loading state
    }
  };

  const generateQRValue = (packageId: string) => {
    // Generate a URL to the confirmation page
    return `${window.location.origin}/confirm-delivery?id=${packageId}`;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
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

      <div className='flex flex-col md:flex-row gap-6'>
        <div className='w-full md:w-1/2 lg:w-2/5'>
          <div className='flex items-center justify-end mb-6'>
            <Button
              onClick={handleRefresh}
              variant='outline'
              size='icon'
              className='bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 text-[#FAFAFA]'
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          <Card className='bg-background/90 backdrop-blur-sm border-2 border-primary/20 shadow-2xl shadow-primary/10 mb-6'>
            <CardHeader>
              <CardTitle className='text-[#FAFAFA]'>Active Deliveries</CardTitle>
              <CardDescription className='text-[#FAFAFA]/70'>
                Click on a delivery to view its details and QR code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
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
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='w-full md:w-1/2 lg:w-3/5'>
          <Card className='bg-background/90 backdrop-blur-sm border-2 border-primary/20 shadow-2xl shadow-primary/10'>
            <CardHeader>
              <CardTitle className='text-[#FAFAFA]'>Delivery Details</CardTitle>
              <CardDescription className='text-[#FAFAFA]/70'>
                {selectedDelivery
                  ? 'Show QR code to recipient to confirm delivery'
                  : 'Select a delivery to view details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDelivery ? (
                <div className='space-y-6'>
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
                  Select a delivery to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

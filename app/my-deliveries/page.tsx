'use client';

import { useEffect, useState, useMemo } from 'react';
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
  const {
    isReady,
    publicKey,
    packages,
    packagesLoading,
    fetchPackages: refreshPackages,
  } = useNostr();
  const [selectedDelivery, setSelectedDelivery] = useState<PackageData | null>(
    null
  );
  const [showQR, setShowQR] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const deliveries = useMemo(() => {
    return packages.filter(
      (pkg) =>
        getEffectiveStatus(pkg) === 'in_transit' && pkg.courier_pubkey === publicKey
    );
  }, [packages, publicKey]);

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

  const handleComplete = async (packageId: string) => {
    try {
      setCompletingId(packageId);

      await completeDelivery(packageId);

      // Immediately trigger a refresh from the global provider
      await refreshPackages();

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
  };

  const generateQRValue = (packageId: string) => {
    // Generate a URL to the confirmation page
    return `${window.location.origin}/confirm-delivery?id=${packageId}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPackages();
    setRefreshing(false);
  };

  if (!isReady || (packagesLoading && packages.length === 0)) {
    return (
      <div className='container mx-auto px-4 pt-24 pb-8'>
        <div className='flex justify-center items-center h-64'>
          <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
          <p className='ml-2'>
            {!isReady ? 'Loading Nostr...' : 'Loading Deliveries...'}
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

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        {/* Left Column: Delivery List */}
        <div className='h-[calc(100vh-10rem)]'>
          <Card className='bg-background/90 backdrop-blur-sm border border-cyan-500/20 shadow-2xl shadow-primary/10 h-full flex flex-col p-0 gap-0'>
            <CardHeader className='flex flex-row justify-between items-start py-6 px-6'>
              <div>
                <CardTitle className='text-[#FAFAFA]'>Active Deliveries</CardTitle>
                <CardDescription className='text-[#FAFAFA]/70'>
                  Click on a delivery to view its details and QR code
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
            <CardContent className='flex flex-col flex-grow overflow-hidden px-6 pb-6'>
              <div className='space-y-4 overflow-y-auto pr-2 flex-1'>
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

        {/* Right Column: Delivery Details */}
        <div className='h-[calc(100vh-10rem)]'>
          <Card className='bg-background/90 backdrop-blur-sm border border-cyan-500/20 shadow-2xl shadow-primary/10 h-full flex flex-col p-0 gap-0'>
            <CardHeader className='py-6 px-6'>
              <CardTitle className='text-[#FAFAFA]'>Delivery Details</CardTitle>
              <CardDescription className='text-[#FAFAFA]/70'>
                {selectedDelivery
                  ? 'Show QR code to recipient to confirm delivery'
                  : 'Select a delivery to view details'}
              </CardDescription>
            </CardHeader>
            <CardContent className='flex items-center justify-center p-0 flex-grow'>
              {selectedDelivery ? (
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

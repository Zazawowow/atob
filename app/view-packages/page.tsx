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
import { Package, MapPin, Bitcoin, Eye, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getPackages, pickupPackage, deletePackage, getEffectiveStatus } from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import Image from 'next/image';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function ViewPackages() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useNostr();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);

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

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  // Clear selection when packages change
  useEffect(() => {
    if (selectedPackage && !packages.some(pkg => pkg.id === selectedPackage.id)) {
      setSelectedPackage(null);
    }
  }, [packages, selectedPackage]);

  const handleRefresh = () => {
    loadPackages();
  };

  const handlePackageSelect = (pkg: any) => {
    setSelectedPackage(pkg);
  };

  const handlePickup = async (packageId: string) => {
    try {
      await pickupPackage(packageId);
      toast.success('Package picked up successfully');
      loadPackages(); // Refresh the list
    } catch (error) {
      console.error('Failed to pickup package:', error);
      toast.error('Failed to pickup package');
    }
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) {
      return;
    }

    try {
      await deletePackage(packageId);
      toast.success('Package deleted successfully');
      loadPackages(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete package:', error);
      toast.error('Failed to delete package');
    }
  };

  const isOwnPackage = (pkg: any) => {
    return pkg.pubkey === (typeof window !== 'undefined' ? localStorage.getItem('nostr_pubkey') : null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'in_transit':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'delivered':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'expired':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
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
      default:
        return 'Unknown';
    }
  };

  const formatCost = (cost: string) => {
    const amount = parseInt(cost);
    if (isNaN(amount)) return cost;
    
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
            <Package className='h-16 w-16 mx-auto mb-4 text-gray-400' />
            <h3 className='text-xl font-cyber text-off-white mb-2'>Authentication Required</h3>
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
      
      <div className='container mx-auto px-4 pt-24 pb-8 relative z-10'>
        <div className='max-w-6xl mx-auto'>
          {/* Desktop: Side by side layout */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
            {/* Left Column: Packages List */}
            <div className='h-[calc(100vh-10rem)]'>
              <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm h-full flex flex-col'>
                <CardHeader className='flex flex-row justify-between items-start py-6 px-6'>
                  <div>
                    <CardTitle className='text-off-white font-cyber text-xl'>
                      Available Packages ({packages.length})
                    </CardTitle>
                    <CardDescription className='text-purple-300'>
                      Click on a package to view it on the map
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleRefresh}
                    variant='outline'
                    size='icon'
                    className='bg-black/20 border-purple-400/20 hover:bg-purple-400/10 hover:border-purple-400/30 text-purple-300 -mt-2 -mr-2'
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardHeader>
                <CardContent className='flex flex-col flex-grow overflow-hidden px-6 pb-6'>
                  <div className='space-y-4 overflow-y-auto pr-2 flex-1'>
                    {loading ? (
                      <div className='flex justify-center items-center h-32'>
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
                            </CardContent>
                            <CardFooter className='pt-3'>
                              <div className='flex gap-2 w-full'>
                                <Link href={`/confirm-delivery?packageId=${pkg.id}`} className='flex-1'>
                                  <Button 
                                    variant='outline' 
                                    size='sm' 
                                    className='w-full btn-outline-purple'
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Eye className='h-4 w-4 mr-1' />
                                    View
                                  </Button>
                                </Link>
                                
                                {effectiveStatus === 'available' && !ownPackage && (
                                  <Button 
                                    size='sm' 
                                    className='btn-cyan'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePickup(pkg.id);
                                    }}
                                  >
                                    Pickup
                                  </Button>
                                )}
                                
                                {ownPackage && (
                                  <Button 
                                    size='sm' 
                                    variant='outline'
                                    className='btn-outline-red'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(pkg.id);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </CardFooter>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Map */}
            <div className='h-[calc(100vh-10rem)]'>
              <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm h-full flex flex-col'>
                <CardHeader>
                  <CardTitle className='text-off-white font-cyber text-xl'>
                    Package Map
                  </CardTitle>
                  <CardDescription className='text-purple-300'>
                    {selectedPackage 
                      ? `Selected: ${selectedPackage.title}`
                      : 'Click on a package to view it on the map'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className='flex-1 p-0'>
                  <div className='h-full w-full'>
                    {selectedPackage ? (
                      <div className='h-full flex flex-col'>
                        <div className='flex-1 flex justify-center items-center text-gray-400'>
                          <div className='text-center'>
                            <Package className='h-16 w-16 mx-auto mb-4 text-purple-400' />
                            <p className='text-lg font-semibold text-purple-300 mb-2'>
                              {selectedPackage.title}
                            </p>
                            <p className='text-sm text-gray-300 mb-1'>
                              From: {selectedPackage.pickupLocation}
                            </p>
                            <p className='text-sm text-gray-300 mb-1'>
                              To: {selectedPackage.destination}
                            </p>
                            <p className='text-sm text-yellow-400 font-medium'>
                              {formatCost(selectedPackage.cost)}
                            </p>
                            {selectedPackage.description && (
                              <p className='text-xs text-gray-400 mt-2 max-w-xs'>
                                {selectedPackage.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className='p-4 border-t border-purple-500/20'>
                          <div className='flex gap-2'>
                            <Link href={`/confirm-delivery?packageId=${selectedPackage.id}`} className='flex-1'>
                              <Button variant='outline' size='sm' className='w-full btn-outline-purple'>
                                <Eye className='h-4 w-4 mr-1' />
                                View Details
                              </Button>
                            </Link>
                            {getEffectiveStatus(selectedPackage) === 'available' && !isOwnPackage(selectedPackage) && (
                              <Button 
                                size='sm' 
                                className='btn-cyan'
                                onClick={() => handlePickup(selectedPackage.id)}
                              >
                                Pickup
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className='flex justify-center items-center h-full text-gray-400'>
                        <div className='text-center'>
                          <MapPin className='h-16 w-16 mx-auto mb-4 text-purple-400' />
                          <p>Select a package to view on map</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile: Stacked layout */}
          <div className='lg:hidden space-y-6'>
            {/* Packages List */}
            <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
              <CardHeader className='flex flex-row justify-between items-start py-6 px-6'>
                <div>
                  <CardTitle className='text-off-white font-cyber text-xl'>
                    Available Packages ({packages.length})
                  </CardTitle>
                  <CardDescription className='text-purple-300'>
                    Click on a package to view it on the map
                  </CardDescription>
                </div>
                <Button
                  onClick={handleRefresh}
                  variant='outline'
                  size='icon'
                  className='bg-black/20 border-purple-400/20 hover:bg-purple-400/10 hover:border-purple-400/30 text-purple-300 -mt-2 -mr-2'
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className='flex justify-center items-center h-32'>
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
                  <div className='grid grid-cols-1 gap-4'>
                    {packages.map((pkg) => {
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
                          </CardContent>
                          <CardFooter className='pt-3'>
                            <div className='flex gap-2 w-full'>
                              <Link href={`/confirm-delivery?packageId=${pkg.id}`} className='flex-1'>
                                <Button 
                                  variant='outline' 
                                  size='sm' 
                                  className='w-full btn-outline-purple'
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Eye className='h-4 w-4 mr-1' />
                                  View
                                </Button>
                              </Link>
                              
                              {effectiveStatus === 'available' && !ownPackage && (
                                <Button 
                                  size='sm' 
                                  className='btn-cyan'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePickup(pkg.id);
                                  }}
                                >
                                  Pickup
                                </Button>
                              )}
                              
                              {ownPackage && (
                                <Button 
                                  size='sm' 
                                  variant='outline'
                                  className='btn-outline-red'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(pkg.id);
                                  }}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Map View */}
            <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
              <CardHeader>
                <CardTitle className='text-off-white font-cyber text-xl'>
                  Package Map
                </CardTitle>
                <CardDescription className='text-purple-300'>
                  {selectedPackage 
                    ? `Selected: ${selectedPackage.title}`
                    : 'Click on a package to view it on the map'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='h-96 w-full'>
                  {selectedPackage ? (
                    <div className='h-full flex flex-col'>
                      <div className='flex-1 flex justify-center items-center text-gray-400'>
                        <div className='text-center'>
                          <Package className='h-16 w-16 mx-auto mb-4 text-purple-400' />
                          <p className='text-lg font-semibold text-purple-300 mb-2'>
                            {selectedPackage.title}
                          </p>
                          <p className='text-sm text-gray-300 mb-1'>
                            From: {selectedPackage.pickupLocation}
                          </p>
                          <p className='text-sm text-gray-300 mb-1'>
                            To: {selectedPackage.destination}
                          </p>
                          <p className='text-sm text-yellow-400 font-medium'>
                            {formatCost(selectedPackage.cost)}
                          </p>
                          {selectedPackage.description && (
                            <p className='text-xs text-gray-400 mt-2 max-w-xs'>
                              {selectedPackage.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className='p-4 border-t border-purple-500/20'>
                        <div className='flex gap-2'>
                          <Link href={`/confirm-delivery?packageId=${selectedPackage.id}`} className='flex-1'>
                            <Button variant='outline' size='sm' className='w-full btn-outline-purple'>
                              <Eye className='h-4 w-4 mr-1' />
                              View Details
                            </Button>
                          </Link>
                          {getEffectiveStatus(selectedPackage) === 'available' && !isOwnPackage(selectedPackage) && (
                            <Button 
                              size='sm' 
                              className='btn-cyan'
                              onClick={() => handlePickup(selectedPackage.id)}
                            >
                              Pickup
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='flex justify-center items-center h-full text-gray-400'>
                      <div className='text-center'>
                        <MapPin className='h-16 w-16 mx-auto mb-4 text-purple-400' />
                        <p>Select a package to view on map</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

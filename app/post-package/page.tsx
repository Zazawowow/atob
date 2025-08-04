'use client';

import type React from 'react';

import { useState, useCallback, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Package, MapPin } from 'lucide-react';
import { createPackage } from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import { AddressInput } from '@/components/address-input';
import Image from 'next/image';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function PostPackage() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useNostr();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    pickupLocation: '',
    destination: '',
    cost: '',
    description: '',
  });

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleAddressChange = useCallback((
    field: 'pickupLocation' | 'destination',
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Form validation with memoization
  const formErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Package title is required';
    }
    if (!formData.pickupLocation.trim()) {
      errors.pickupLocation = 'Pickup location is required';
    }
    if (!formData.destination.trim()) {
      errors.destination = 'Destination is required';
    }
    if (!formData.cost.trim()) {
      errors.cost = 'Cost is required';
    } else if (isNaN(Number(formData.cost)) || Number(formData.cost) <= 0) {
      errors.cost = 'Cost must be a positive number';
    }
    
    return errors;
  }, [formData]);

  const isFormValid = useMemo(() => {
    return Object.keys(formErrors).length === 0;
  }, [formErrors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    if (!isLoggedIn) {
      toast.error('Please log in to post a package');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const packageId = await createPackage(formData);
      console.log('Package created with ID:', packageId);

      toast.success('Package Posted Successfully', {
        description: 'Your package has been posted and is now available for delivery.',
      });

      // Add a small delay before redirecting to ensure the event is propagated
      setTimeout(() => {
        router.push('/view-packages');
      }, 1000);
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to post package. Please try again.',
      });
      console.error('Error posting package:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isFormValid, isLoggedIn, router]);

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
            <h3 className='text-xl text-off-white mb-2'>Authentication Required</h3>
            <p className='text-gray-400 mb-6'>
              You must be logged in with Nostr to post packages.
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
          src='/hero-3.jpeg'
          alt='Background'
          fill
          className='object-cover object-center brightness-[0.3]'
          priority
        />
        <div className='absolute inset-0 bg-black/40' />
      </div>
      
      <div className='container mx-auto px-4 pt-24 pb-12 relative z-10'>
        <div className='max-w-4xl mx-auto'>
          <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
            <CardHeader>
              <CardTitle className='flex items-center text-off-white text-2xl'>
                <div className='p-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-md mr-4'>
                  <Package className='h-6 w-6 text-off-white' />
                </div>
                POST A PACKAGE
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className='space-y-6 pt-6 pb-4'>
                <div className='space-y-2'>
                  <Label htmlFor='title' className='text-off-white-90'>Package Title</Label>
                  <Input
                    id='title'
                    name='title'
                    placeholder='E.g., Important Documents, Electronics, etc.'
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='pickupLocation' className='text-off-white-90'>Pickup Location</Label>
                  <AddressInput
                    id='pickupLocation'
                    value={formData.pickupLocation}
                    onChange={(value) => handleAddressChange('pickupLocation', value)}
                    placeholder='E.g., Neo-Tokyo, Tech District'
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='destination' className='text-off-white-90'>Destination</Label>
                  <AddressInput
                    id='destination'
                    value={formData.destination}
                    onChange={(value) => handleAddressChange('destination', value)}
                    placeholder='E.g., Cyber-City, Business District'
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='cost' className='text-off-white-90'>Delivery Cost (sats)</Label>
                  <Input
                    id='cost'
                    name='cost'
                    type='number'
                    placeholder='25000'
                    value={formData.cost}
                    onChange={handleChange}
                    required
                    className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='description' className='text-off-white-90'>Package Description</Label>
                  <Textarea
                    id='description'
                    name='description'
                    placeholder='Describe the package contents, size, weight, special handling requirements...'
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
                  />
                </div>
              </CardContent>
              <CardFooter className='p-6 bg-black/20 border-t border-white/10'>
                <Button
                  type='submit'
                  className='w-full btn-purple'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Posting Package...' : 'Post Package'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}

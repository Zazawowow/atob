'use client';

import type React from 'react';

import { useState } from 'react';
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
import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';
import { createPackage, getEffectiveStatus } from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import { AddressInput } from '@/components/address-input';
import Image from 'next/image';

export default function PostPackage() {
  const router = useRouter();
  const { isReady } = useNostr();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    pickupLocation: '',
    destination: '',
    cost: '',
    description: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (
    field: 'pickupLocation' | 'destination',
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create package using Nostr with localStorage fallback
      const packageId = await createPackage(formData);
      console.log('Package created with ID:', packageId);

      toast.success('Package Posted', {
        description: 'Your package has been successfully posted for delivery.',
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
          src='/hero-4.jpeg'
          alt='Background'
          fill
          className='object-cover object-center brightness-[0.3]'
          priority
        />
        <div className='absolute inset-0 bg-black/40' />
      </div>
      
      <div className='container mx-auto px-4 pt-24 pb-12 relative z-10'>
        <Card className='max-w-2xl mx-auto bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
          <CardHeader>
            <CardTitle className='flex items-center text-off-white font-cyber text-2xl'>
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
                  placeholder='E.g., Box of Cyber-Crystals'
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="placeholder:text-gray-400"
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='pickupLocation' className='text-off-white-90'>Pickup Location</Label>
                <AddressInput
                  id='pickupLocation'
                  value={formData.pickupLocation}
                  onChange={(value) => handleAddressChange('pickupLocation', value)}
                  placeholder='E.g., Neo-Kyoto, Sector 7'
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='destination' className='text-off-white-90'>Destination</Label>
                <AddressInput
                  id='destination'
                  value={formData.destination}
                  onChange={(value) => handleAddressChange('destination', value)}
                  placeholder='E.g., Arakis, The Great Flat'
                  required
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='cost' className='text-off-white-90'>Cost (sats)</Label>
                  <Input
                    id='cost'
                    name='cost'
                    type='number'
                    placeholder='10000'
                    value={formData.cost}
                    onChange={handleChange}
                    required
                    className="placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='description' className='text-off-white-90'>Description (optional)</Label>
                <Textarea
                  id='description'
                  name='description'
                  placeholder='Additional instructions or package details...'
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="placeholder:text-gray-400"
                />
              </div>
            </CardContent>
            <CardFooter className='p-6 bg-black/20 border-t border-white/10'>
              <Button
                type='submit'
                className='w-full btn-purple'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Post Package'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}

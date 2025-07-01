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
    <div className='container mx-auto px-4 pt-24 pb-8 relative z-10'>
      <div className='fixed inset-0 -z-10'>
        <Image
          src='/hero-4.jpeg'
          alt='Background'
          fill
          className='object-cover object-center brightness-[0.3]'
          priority
        />
        <div className='absolute inset-0 bg-black/30' />
      </div>
      
      <Link href='/' className='flex items-center text-sm mb-6 hover:underline text-[#FAFAFA]'>
        <ArrowLeft className='mr-2 h-4 w-4' />
        Back to Home
      </Link>

      <Card className='max-w-2xl mx-auto bg-background/90 backdrop-blur-sm border-2 border-primary/20 shadow-2xl shadow-primary/10'>
        <CardHeader className='border-b border-primary/20'>
          <CardTitle className='flex items-center text-[#FAFAFA]'>
            <div className='bg-blue-400 rounded-full p-2 mr-2'>
              <Package className='h-5 w-5 text-[#FAFAFA]' />
            </div>
            Post a Package
          </CardTitle>
          <CardDescription className='text-[#FAFAFA]/70'>
            Create a new delivery request with all the necessary details
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-4 pt-6'>
            <div className='space-y-2'>
              <Label htmlFor='title' className='text-[#FAFAFA]'>Package Title</Label>
              <Input
                id='title'
                name='title'
                placeholder='Small box of books'
                value={formData.title}
                onChange={handleChange}
                required
                className='bg-black/20 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 placeholder:text-[#FAFAFA]/60 text-[#FAFAFA]'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='pickupLocation' className='text-[#FAFAFA]'>Pickup Location</Label>
              <AddressInput
                id='pickupLocation'
                value={formData.pickupLocation}
                onChange={(value) =>
                  handleAddressChange('pickupLocation', value)
                }
                placeholder='123 Main St, City'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='destination' className='text-[#FAFAFA]'>Destination</Label>
              <AddressInput
                id='destination'
                value={formData.destination}
                onChange={(value) => handleAddressChange('destination', value)}
                placeholder='456 Oak Ave, City'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='cost' className='text-[#FAFAFA]'>Cost (sats)</Label>
              <Input
                id='cost'
                name='cost'
                type='number'
                placeholder='10000'
                value={formData.cost}
                onChange={handleChange}
                required
                className='bg-black/20 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 placeholder:text-[#FAFAFA]/60 text-[#FAFAFA]'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='description' className='text-[#FAFAFA]'>Description (optional)</Label>
              <Textarea
                id='description'
                name='description'
                placeholder='Additional details about the package...'
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className='bg-black/20 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 placeholder:text-[#FAFAFA]/60 text-[#FAFAFA]'
              />
            </div>
          </CardContent>
          <CardFooter className='flex flex-col gap-4 p-6'>
            <Button
              type='submit'
              className='w-full bg-blue-400 hover:bg-blue-400/90 text-[#FAFAFA] font-medium shadow-[0_0_15px_rgba(96,165,250,0.15)] hover:shadow-[0_0_25px_rgba(96,165,250,0.25)] transform hover:-translate-y-1 transition-all duration-300'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Post Package'}
            </Button>
            <Button
              type='button'
              variant='outline'
              className='w-full bg-black/20 border-blue-400/20 hover:bg-blue-400/10 hover:border-blue-400/30 text-[#FAFAFA] transform hover:-translate-y-1 transition-all duration-300'
              onClick={() => router.push('/')}
            >
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

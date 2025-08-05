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
import { ArrowLeft, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { createJob } from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import { AddressInput } from '@/components/address-input';
import Image from 'next/image';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function PostJob() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useNostr();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    location: '',
    peopleNeeded: 1,
    compensation: '',
    description: '',
    requirements: '',
    duration: '',
    contactInfo: '',
  });

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleNumberChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    const numValue = parseInt(value) || 1;
    setFormData((prev) => ({ ...prev, [name]: Math.max(1, numValue) }));
  }, []);

  const handleAddressChange = useCallback((
    field: 'location',
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Form validation with memoization
  const formErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Job title is required';
    }
    if (!formData.location.trim()) {
      errors.location = 'Job location is required';
    }
    if (!formData.compensation.trim()) {
      errors.compensation = 'Compensation is required';
    } else if (isNaN(Number(formData.compensation)) || Number(formData.compensation) <= 0) {
      errors.compensation = 'Compensation must be a positive number';
    }
    if (formData.peopleNeeded < 1) {
      errors.peopleNeeded = 'At least 1 person is needed';
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
      toast.error('Please log in to post a job');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const jobId = await createJob(formData);
      console.log('Job created with ID:', jobId);

      toast.success('Job Posted Successfully', {
        description: 'Your job has been posted and is now available for applications.',
      });

      // Add a small delay before redirecting to ensure the event is propagated
      setTimeout(() => {
        router.push('/view-jobs');
      }, 1000);
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to post job. Please try again.',
      });
      console.error('Error posting job:', error);
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
            <Briefcase className='h-16 w-16 mx-auto mb-4 text-gray-400' />
            <h3 className='text-xl text-off-white mb-2'>Authentication Required</h3>
            <p className='text-gray-400 mb-6'>
              You must be logged in with Nostr to post jobs.
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
      
      <div className='container mx-auto px-4 pt-24 pb-12 relative z-10'>
        <div className='max-w-4xl mx-auto'>
          <Card className='bg-black/30 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm'>
            <CardHeader>
              <CardTitle className='flex items-center text-off-white text-2xl'>
                <div className='p-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-md mr-4'>
                  <Briefcase className='h-6 w-6 text-off-white' />
                </div>
                POST A JOB
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className='space-y-6 pt-6 pb-4'>
                <div className='space-y-2'>
                  <Label htmlFor='title' className='text-off-white-90'>Job Title</Label>
                  <Input
                    id='title'
                    name='title'
                    placeholder='E.g., Cyber-Security Specialist Needed'
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='location' className='text-off-white-90'>Job Location</Label>
                  <AddressInput
                    id='location'
                    value={formData.location}
                    onChange={(value) => handleAddressChange('location', value)}
                    placeholder='E.g., Neo-Tokyo, Tech District'
                    required
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='peopleNeeded' className='text-off-white-90'>People Needed</Label>
                    <Input
                      id='peopleNeeded'
                      name='peopleNeeded'
                      type='number'
                      min='1'
                      placeholder='1'
                      value={formData.peopleNeeded}
                      onChange={handleNumberChange}
                      required
                      className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='compensation' className='text-off-white-90'>Compensation Per Person (sats)</Label>
                    <Input
                      id='compensation'
                      name='compensation'
                      type='number'
                      placeholder='50000'
                      value={formData.compensation}
                      onChange={handleChange}
                      required
                      className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
                    />
                    <p className='text-xs text-gray-400'>Amount each person will receive</p>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='duration' className='text-off-white-90'>Duration (optional)</Label>
                  <Input
                    id='duration'
                    name='duration'
                    placeholder='E.g., 2 weeks, 3 days, Ongoing'
                    value={formData.duration}
                    onChange={handleChange}
                    className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='description' className='text-off-white-90'>Job Description</Label>
                  <Textarea
                    id='description'
                    name='description'
                    placeholder='Describe the job requirements, responsibilities, and what you need done...'
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='requirements' className='text-off-white-90'>Requirements (optional)</Label>
                  <Textarea
                    id='requirements'
                    name='requirements'
                    placeholder='Skills, experience, or qualifications needed...'
                    value={formData.requirements}
                    onChange={handleChange}
                    rows={2}
                    className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='contactInfo' className='text-off-white-90'>Contact Info (optional)</Label>
                  <Input
                    id='contactInfo'
                    name='contactInfo'
                    placeholder='E.g., nostr:npub..., email, or other contact method'
                    value={formData.contactInfo}
                    onChange={handleChange}
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
                  {isSubmitting ? 'Posting Job...' : 'Post Job'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
} 
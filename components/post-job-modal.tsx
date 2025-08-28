'use client';

import type React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Briefcase } from 'lucide-react';
import { createJob } from '@/lib/nostr-client';
import { useNostr } from '@/components/nostr-provider';
import { AddressInput } from '@/components/address-input';

interface PostJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreated?: () => void;
}

export function PostJobModal({ open, onOpenChange, onJobCreated }: PostJobModalProps) {
  const { isLoggedIn } = useNostr();
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

      // Reset form after successful submission
      setFormData({
        title: '',
        location: '',
        peopleNeeded: 1,
        compensation: '',
        description: '',
        requirements: '',
        duration: '',
        contactInfo: '',
      });

      // Trigger refresh callback if provided
      if (onJobCreated) {
        onJobCreated();
      }

      // Close modal
      onOpenChange(false);
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to post job. Please try again.',
      });
      console.error('Error posting job:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isFormValid, isLoggedIn, onOpenChange]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  }, [isSubmitting, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full bg-black/95 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm p-0 my-0 max-h-[calc(100dvh-6rem)] sm:max-h-[calc(100dvh-8rem)] overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-purple-500/20 bg-black/95 sticky top-0 z-10">
            <DialogTitle className="flex items-center text-off-white text-xl">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-md mr-3">
                <Briefcase className="h-5 w-5 text-off-white" />
              </div>
              POST A JOB
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-24 pt-2 overflow-y-auto flex-1 min-h-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-off-white-90">Job Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="E.g., Cyber-Security Specialist Needed"
                value={formData.title}
                onChange={handleChange}
                required
                className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-off-white-90">Job Location</Label>
              <AddressInput
                id="location"
                value={formData.location}
                onChange={(value) => handleAddressChange('location', value)}
                placeholder="E.g., Neo-Tokyo, Tech District"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="peopleNeeded" className="text-off-white-90">People Needed</Label>
              <Input
                id="peopleNeeded"
                name="peopleNeeded"
                type="number"
                min="1"
                placeholder="1"
                value={formData.peopleNeeded}
                onChange={handleNumberChange}
                required
                className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="compensation" className="text-off-white-90">Compensation Per Person (sats)</Label>
              <Input
                id="compensation"
                name="compensation"
                type="number"
                placeholder="50000"
                value={formData.compensation}
                onChange={handleChange}
                required
                className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
              />
              <p className="text-xs text-gray-400">Amount each person will receive</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="text-off-white-90">Duration (optional)</Label>
              <Input
                id="duration"
                name="duration"
                placeholder="E.g., 2 weeks, 3 days, Ongoing"
                value={formData.duration}
                onChange={handleChange}
                className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-off-white-90">Job Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the job requirements, responsibilities, and what you need done..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements" className="text-off-white-90">Requirements (optional)</Label>
              <Textarea
                id="requirements"
                name="requirements"
                placeholder="Skills, experience, or qualifications needed..."
                value={formData.requirements}
                onChange={handleChange}
                rows={2}
                className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactInfo" className="text-off-white-90">Contact Info (optional)</Label>
              <Input
                id="contactInfo"
                name="contactInfo"
                placeholder="E.g., nostr:npub..., email, or other contact method"
                value={formData.contactInfo}
                onChange={handleChange}
                className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
              />
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-4 border-t border-purple-500/20 bg-black/95 sticky bottom-0 z-10">
            <Button
              type="submit"
              className="w-full btn-purple"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting Job...' : 'Post Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
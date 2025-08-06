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
import { Package } from 'lucide-react';
import { createPackage } from '@/lib/nostr-client';
import { useNostr } from '@/components/nostr-provider';
import { AddressInput } from '@/components/address-input';

interface PostPackageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostPackageModal({ open, onOpenChange }: PostPackageModalProps) {
  const { isLoggedIn } = useNostr();
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

      // Reset form after successful submission
      setFormData({
        title: '',
        pickupLocation: '',
        destination: '',
        cost: '',
        description: '',
      });

      // Close modal
      onOpenChange(false);
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to post package. Please try again.',
      });
      console.error('Error posting package:', error);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-black/95 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center text-off-white text-xl">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-md mr-3">
              <Package className="h-5 w-5 text-off-white" />
            </div>
            POST A PACKAGE
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-off-white-90">Package Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="E.g., Important Documents, Electronics, etc."
              value={formData.title}
              onChange={handleChange}
              required
              className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupLocation" className="text-off-white-90">Pickup Location</Label>
            <AddressInput
              id="pickupLocation"
              value={formData.pickupLocation}
              onChange={(value) => handleAddressChange('pickupLocation', value)}
              placeholder="E.g., Neo-Tokyo, Tech District"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination" className="text-off-white-90">Destination</Label>
            <AddressInput
              id="destination"
              value={formData.destination}
              onChange={(value) => handleAddressChange('destination', value)}
              placeholder="E.g., Cyber-City, Business District"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost" className="text-off-white-90">Delivery Cost (sats)</Label>
            <Input
              id="cost"
              name="cost"
              type="number"
              placeholder="25000"
              value={formData.cost}
              onChange={handleChange}
              required
              className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-off-white-90">Package Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe the package contents, size, weight, special handling requirements..."
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="bg-background/5 border-blue-400/20 focus:border-blue-400/40 focus:ring-blue-400/10 !text-gray-100 placeholder:!text-gray-400"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="submit"
              className="w-full btn-purple"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting Package...' : 'Post Package'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
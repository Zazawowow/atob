'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  isLoading?: boolean;
}

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full bg-black/95 border border-red-500/20 rounded-2xl shadow-red-glow/10 backdrop-blur-sm p-0 my-6 sm:my-12 max-h[calc(100dvh-6rem)] sm:max-h-[calc(100dvh-8rem)] overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-red-500/20 bg-black/95 sticky top-0 z-10">
          <DialogTitle className="flex items-center text-off-white text-xl">
            <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-md mr-3">
              <AlertTriangle className="h-5 w-5 text-off-white" />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 text-gray-300">
          <DialogDescription>
            {description}
          </DialogDescription>
          {itemName && (
            <span className="block mt-3 font-medium text-red-400 text-center">"{itemName}"</span>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 border-t border-red-500/20 bg-black/95 sticky bottom-0 z-10 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 bg-black/20 border-gray-500/30 hover:bg-gray-500/10 hover:border-gray-400/50 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 bg-red-500/20 border-red-500/30 hover:bg-red-500/30 hover:border-red-400/50 text-red-400"
          >
            {isLoading ? (
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
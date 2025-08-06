'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Briefcase, Package, Plus } from 'lucide-react';

interface PostChoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectJob: () => void;
  onSelectPackage: () => void;
}

export function PostChoiceModal({ 
  open, 
  onOpenChange, 
  onSelectJob, 
  onSelectPackage 
}: PostChoiceModalProps) {
  const handleJobSelect = () => {
    onOpenChange(false);
    onSelectJob();
  };

  const handlePackageSelect = () => {
    onOpenChange(false);
    onSelectPackage();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-black/95 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center text-off-white text-xl">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full mr-3">
              <Plus className="h-5 w-5 text-off-white" />
            </div>
            What would you like to post?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <Button
            onClick={handleJobSelect}
            className="w-full h-16 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 hover:from-purple-500/30 hover:to-cyan-500/30 hover:border-purple-500/50 transition-all duration-300 text-off-white"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-md">
                <Briefcase className="h-5 w-5 text-off-white" />
              </div>
              <span className="text-lg font-medium">Post a Job</span>
            </div>
          </Button>

          <Button
            onClick={handlePackageSelect}
            className="w-full h-16 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 hover:from-purple-500/30 hover:to-cyan-500/30 hover:border-purple-500/50 transition-all duration-300 text-off-white"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-md">
                <Package className="h-5 w-5 text-off-white" />
              </div>
              <span className="text-lg font-medium">Post a Package</span>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
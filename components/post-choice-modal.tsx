'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
 

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
      <DialogContent className="bg-black/95 border border-purple-500/20 rounded-2xl shadow-purple-glow/10 backdrop-blur-sm p-0">
        <DialogHeader className="px-5 sm:px-6 md:px-8 pt-6 pb-5 border-b border-purple-500/20 bg-black/95">
          <DialogTitle className="text-center text-off-white text-xl">
            What would you like to post?
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-5 sm:px-6 md:px-8 py-5 sm:py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleJobSelect}
              className="w-full h-16 px-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 hover:from-purple-500/30 hover:to-cyan-500/30 hover:border-purple-500/50 transition-all duration-300 text-off-white justify-center"
            >
              <span className="text-lg font-medium">Post a Job</span>
            </Button>

            <Button
              onClick={handlePackageSelect}
              className="w-full h-16 px-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 hover:from-purple-500/30 hover:to-cyan-500/30 hover:border-purple-500/50 transition-all duration-300 text-off-white justify-center"
            >
              <span className="text-lg font-medium">Post a Package</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
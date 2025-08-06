'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getRelays, checkRelay } from '@/lib/nostr-service';
import { debugStorage } from '@/lib/local-package-service';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Bug, RefreshCw, Shield, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { forceStatusRefresh, deleteAllJobsAndPackages, forceClearAllData } from '@/lib/nostr';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [relayStatus, setRelayStatus] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isForceClearing, setIsForceClearing] = useState(false);
  const [localData, setLocalData] = useState<any>(null);

  const checkRelayStatus = async () => {
    setIsChecking(true);
    const relays = getRelays();
    const relay = relays[0]; // We only have one relay

    try {
      const isWorking = await checkRelay(relay);
      setRelayStatus(isWorking);
    } catch (error) {
      console.error('Error checking relay status:', error);
      setRelayStatus(false);
    } finally {
      setIsChecking(false);
    }
  };

  const showLocalStorage = () => {
    const data = {
      packages: JSON.parse(localStorage.getItem('shared_packages_v1') || '[]'),
      deliveries: JSON.parse(localStorage.getItem('my_deliveries_v2') || '[]'),
      jobs: JSON.parse(localStorage.getItem('shared_jobs_v1') || '[]'),
      myJobs: JSON.parse(localStorage.getItem('my_jobs_v1') || '[]'),
      pubkey: localStorage.getItem('nostr_pubkey') || 'not set',
      relay: getRelays()[0],
    };
    setLocalData(data);
    debugStorage(); // Also log to console
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await forceStatusRefresh();
      toast.success('Status Refresh Complete', {
        description: 'Package statuses have been refreshed from Nostr',
      });
      // Update local data display
      showLocalStorage();
    } catch (error) {
      toast.error('Refresh Failed', {
        description: 'Could not refresh package statuses',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will delete ALL your jobs and packages from the relay and clear all local data. This action cannot be undone. Are you sure you want to continue?'
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      await deleteAllJobsAndPackages();
      toast.success('All Jobs and Packages Deleted', {
        description: 'All data has been cleared from the relay and localStorage',
      });
      // Update local data display
      showLocalStorage();
    } catch (error) {
      toast.error('Deletion Failed', {
        description: 'Could not delete all jobs and packages',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleForceClear = async () => {
    const confirmed = window.confirm(
      '🚨 DANGER: This will FORCE CLEAR all data and reload the page. This is a last resort option if normal deletion failed. Are you absolutely sure?'
    );
    
    if (!confirmed) return;
    
    setIsForceClearing(true);
    try {
      await forceClearAllData();
      // Page will reload automatically
    } catch (error) {
      toast.error('Force Clear Failed', {
        description: 'Could not force clear all data',
      });
      setIsForceClearing(false);
    }
  };

  const relays = getRelays();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full'>
      <CollapsibleTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='flex items-center gap-1 mb-2 cursor-pointer'
        >
          <Bug className='h-4 w-4' />
          Debug Panel
          {isOpen ? (
            <ChevronUp className='h-4 w-4' />
          ) : (
            <ChevronDown className='h-4 w-4' />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>
              Troubleshooting tools for Nostr connectivity
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Button
                variant='outline'
                size='sm'
                onClick={checkRelayStatus}
                disabled={isChecking}
                className='mb-2'
              >
                {isChecking ? 'Checking Relay...' : 'Check Relay Status'}
              </Button>

              <div className='space-y-1 mt-2'>
                <div className='flex items-center justify-between text-sm'>
                  <div className='flex items-center gap-2'>
                    <Shield className='h-4 w-4 text-blue-400' />
                    <span className='truncate max-w-[200px]'>{relays[0]}</span>
                  </div>
                  {relayStatus === null ? (
                    <Badge variant='outline'>Unknown</Badge>
                  ) : relayStatus ? (
                    <Badge
                      variant='outline'
                      className='bg-green-50 text-green-700'
                    >
                      Connected
                    </Badge>
                  ) : (
                    <Badge
                      variant='outline'
                      className='bg-red-50 text-red-700'
                    >
                      Failed
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Button
                variant='outline'
                size='sm'
                onClick={showLocalStorage}
                className='mb-2'
              >
                Show Local Storage
              </Button>

              {localData && (
                <div className='mt-2 text-xs'>
                  <div className='mb-1'>
                    <strong>Pubkey:</strong> {localData.pubkey}
                  </div>
                  <div className='mb-1'>
                    <strong>Packages:</strong> {localData.packages.length}
                  </div>
                  <div className='mb-1'>
                    <strong>Deliveries:</strong> {localData.deliveries.length}
                  </div>
                  <div className='mb-1'>
                    <strong>Jobs:</strong> {localData.jobs.length}
                  </div>
                  <div className='mb-1'>
                    <strong>My Jobs:</strong> {localData.myJobs.length}
                  </div>
                  <div className='mb-1'>
                    <strong>Relay:</strong> {localData.relay}
                  </div>
                </div>
              )}
            </div>
            <div>
              <Button
                variant='outline'
                size='sm'
                onClick={handleForceRefresh}
                disabled={isRefreshing}
                className='mb-2 flex items-center gap-1'
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                {isRefreshing ? 'Refreshing...' : 'Force Status Refresh'}
              </Button>
              <p className='text-xs text-gray-500'>
                This will fetch all delivery events from Nostr and update local
                storage with the latest status.
              </p>
            </div>

            <div>
              <Button
                variant='outline'
                size='sm'
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className='mb-2 flex items-center gap-1 text-red-600 border-red-600 hover:bg-red-50'
              >
                <Trash2
                  className={`h-4 w-4 ${isDeleting ? 'animate-spin' : ''}`}
                />
                {isDeleting ? 'Deleting...' : 'Delete All Jobs & Packages'}
              </Button>
              <p className='text-xs text-red-500'>
                ⚠️ This will permanently delete ALL your jobs and packages from the relay and clear all local data.
              </p>
            </div>

            <div>
              <Button
                variant='outline'
                size='sm'
                onClick={handleForceClear}
                disabled={isForceClearing}
                className='mb-2 flex items-center gap-1 text-orange-600 border-orange-600 hover:bg-orange-50'
              >
                <AlertTriangle
                  className={`h-4 w-4 ${isForceClearing ? 'animate-spin' : ''}`}
                />
                {isForceClearing ? 'Force Clearing...' : 'Force Clear All Data'}
              </Button>
              <p className='text-xs text-orange-500'>
                🚨 LAST RESORT: Force clear all data and reload page if normal deletion failed.
              </p>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

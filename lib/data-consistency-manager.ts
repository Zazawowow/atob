// Data consistency manager for synchronizing local storage with Nostr relay
import { getJobs, getPackages } from './nostr';
import { getLocalJobs } from './local-job-service';
import { getLocalPackages } from './local-package-service';
import { NostrRealtimeService } from './nostr-realtime';
import type { JobData, PackageData } from './nostr-types';

interface ConsistencyOptions {
  enableRealtime?: boolean;
  syncInterval?: number;
  onJobUpdate?: (jobs: JobData[]) => void;
  onPackageUpdate?: (packages: PackageData[]) => void;
  onError?: (error: any) => void;
}

class DataConsistencyManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private realtimeSubscriptionId: string | null = null;
  private options: ConsistencyOptions = {};
  private isActive = false;

  async start(options: ConsistencyOptions = {}): Promise<void> {
    if (this.isActive) {
      console.log('📊 DataConsistencyManager already active');
      return;
    }

    this.options = {
      enableRealtime: true,
      syncInterval: 30000, // 30 seconds
      ...options
    };

    this.isActive = true;
    console.log('📊 Starting DataConsistencyManager...');

    // Start periodic sync
    if (this.options.syncInterval && this.options.syncInterval > 0) {
      this.startPeriodicSync();
    }

    // Start real-time subscriptions
    if (this.options.enableRealtime) {
      await this.startRealtimeSync();
    }

    // Initial sync
    await this.performSync();

    console.log('📊 DataConsistencyManager started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isActive) return;

    console.log('📊 Stopping DataConsistencyManager...');
    this.isActive = false;

    // Stop periodic sync
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Stop real-time subscriptions
    if (this.realtimeSubscriptionId) {
      NostrRealtimeService.closeSubscription(this.realtimeSubscriptionId);
      this.realtimeSubscriptionId = null;
    }

    console.log('📊 DataConsistencyManager stopped');
  }

  private startPeriodicSync(): void {
    console.log(`📊 Starting periodic sync every ${this.options.syncInterval}ms`);
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.performSync();
      } catch (error) {
        console.error('📊 Periodic sync failed:', error);
        if (this.options.onError) {
          this.options.onError(error);
        }
      }
    }, this.options.syncInterval);
  }

  private async startRealtimeSync(): Promise<void> {
    try {
      console.log('📊 Starting real-time sync...');
      
      this.realtimeSubscriptionId = await NostrRealtimeService.subscribeToEvents({
        onJobEvent: async (event) => {
          console.log('📊 Real-time job event received:', event.id);
          await this.handleJobEvent(event);
        },
        onPackageEvent: async (event) => {
          console.log('📊 Real-time package event received:', event.id);
          await this.handlePackageEvent(event);
        },
        onDeletionEvent: async (event) => {
          console.log('📊 Real-time deletion event received:', event.id);
          await this.handleDeletionEvent(event);
        },
        onError: (error) => {
          console.error('📊 Real-time sync error:', error);
          if (this.options.onError) {
            this.options.onError(error);
          }
        }
      });

      console.log(`📊 Real-time sync started with subscription ${this.realtimeSubscriptionId}`);
    } catch (error) {
      console.error('📊 Failed to start real-time sync:', error);
      if (this.options.onError) {
        this.options.onError(error);
      }
    }
  }

  private async performSync(): Promise<void> {
    if (!this.isActive) return;

    console.log('📊 Performing data sync...');
    
    try {
      // Sync jobs
      const jobs = await getJobs();
      if (this.options.onJobUpdate && this.isActive) {
        this.options.onJobUpdate(jobs);
      }

      // Sync packages
      const packages = await getPackages();
      if (this.options.onPackageUpdate && this.isActive) {
        this.options.onPackageUpdate(packages);
      }

      console.log(`📊 Sync completed: ${jobs.length} jobs, ${packages.length} packages`);
    } catch (error) {
      console.error('📊 Data sync failed:', error);
      if (this.options.onError) {
        this.options.onError(error);
      }
    }
  }

  private async handleJobEvent(event: any): Promise<void> {
    try {
      // Trigger a fresh job fetch to incorporate the new event
      const jobs = await getJobs();
      if (this.options.onJobUpdate && this.isActive) {
        this.options.onJobUpdate(jobs);
      }
    } catch (error) {
      console.error('📊 Failed to handle job event:', error);
    }
  }

  private async handlePackageEvent(event: any): Promise<void> {
    try {
      // Trigger a fresh package fetch to incorporate the new event
      const packages = await getPackages();
      if (this.options.onPackageUpdate && this.isActive) {
        this.options.onPackageUpdate(packages);
      }
    } catch (error) {
      console.error('📊 Failed to handle package event:', error);
    }
  }

  private async handleDeletionEvent(event: any): Promise<void> {
    try {
      console.log('📊 Processing deletion event:', event);
      
      // Extract the deleted event IDs from the deletion event
      const eTags = event.tags?.filter((tag: any[]) => tag[0] === 'e') || [];
      const deletedIds = eTags.map((tag: any[]) => tag[1]).filter(Boolean);
      
      console.log('📊 Deleted event IDs:', deletedIds);
      
      // Trigger fresh fetches to remove deleted items
      const [jobs, packages] = await Promise.all([
        getJobs(),
        getPackages()
      ]);
      
      if (this.options.onJobUpdate && this.isActive) {
        this.options.onJobUpdate(jobs);
      }
      
      if (this.options.onPackageUpdate && this.isActive) {
        this.options.onPackageUpdate(packages);
      }
    } catch (error) {
      console.error('📊 Failed to handle deletion event:', error);
    }
  }

  // Manual sync trigger
  async syncNow(): Promise<void> {
    await this.performSync();
  }

  // Get current status
  getStatus(): {
    isActive: boolean;
    hasRealtime: boolean;
    hasPeriodicSync: boolean;
    subscriptionId: string | null;
  } {
    return {
      isActive: this.isActive,
      hasRealtime: this.realtimeSubscriptionId !== null,
      hasPeriodicSync: this.syncInterval !== null,
      subscriptionId: this.realtimeSubscriptionId
    };
  }
}

// Singleton instance
const dataConsistencyManager = new DataConsistencyManager();

export { dataConsistencyManager as DataConsistencyManager };
export type { ConsistencyOptions };

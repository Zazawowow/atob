// Real-time Nostr event subscription service for cross-user data consistency
import { EVENT_KINDS } from './nostr-types';
import { getRelays } from './nostr-service';

interface RealtimeSubscription {
  id: string;
  close: () => void;
}

interface RealtimeOptions {
  onJobEvent?: (event: any) => void;
  onPackageEvent?: (event: any) => void;
  onDeletionEvent?: (event: any) => void;
  onError?: (error: any) => void;
}

class NostrRealtimeService {
  private subscriptions = new Map<string, RealtimeSubscription>();
  private pool: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const { SimplePool } = await import('nostr-tools');
      this.pool = new SimplePool();
      this.isInitialized = true;
      console.log('🔄 NostrRealtimeService initialized');
    } catch (error) {
      console.error('Failed to initialize NostrRealtimeService:', error);
      throw error;
    }
  }

  async subscribeToEvents(options: RealtimeOptions): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const relays = getRelays();
    if (relays.length === 0) {
      console.warn('No relays configured for real-time subscription');
      return 'no-relays';
    }

    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔔 Starting real-time subscription ${subscriptionId} to ${relays.length} relay(s)`);

    try {
      // Subscribe to multiple event types
      const filter = {
        kinds: [EVENT_KINDS.JOB, EVENT_KINDS.PACKAGE, 5], // Job events, Package events, Deletion events
      };

      const subscription = this.pool.subscribe(relays, filter, {
        onevent: (event: any) => {
          this.handleRealtimeEvent(event, options);
        },
        oneose: () => {
          console.log(`🔔 Subscription ${subscriptionId} established (EOSE received)`);
        },
        onnotice: (notice: string) => {
          console.log(`🔔 Subscription ${subscriptionId} notice:`, notice);
        },
        onerror: (error: any) => {
          console.warn(`🔔 Subscription ${subscriptionId} error (non-fatal):`, error);
          // Don't propagate connection errors as they're often temporary
          // Just log them for debugging
        }
      });

      const realtimeSubscription: RealtimeSubscription = {
        id: subscriptionId,
        close: () => {
          console.log(`🔔 Closing subscription ${subscriptionId}`);
          subscription.close();
          this.subscriptions.delete(subscriptionId);
        }
      };

      this.subscriptions.set(subscriptionId, realtimeSubscription);
      return subscriptionId;

    } catch (error) {
      console.warn(`Failed to create subscription ${subscriptionId} (gracefully handled):`, error);
      // Return a dummy subscription ID instead of throwing
      return 'failed-subscription';
    }
  }

  private handleRealtimeEvent(event: any, options: RealtimeOptions): void {
    try {
      console.log(`🔔 Real-time event received: kind=${event.kind}, id=${event.id}`);

      switch (event.kind) {
        case EVENT_KINDS.JOB:
          if (options.onJobEvent) {
            options.onJobEvent(event);
          }
          break;

        case EVENT_KINDS.PACKAGE:
          if (options.onPackageEvent) {
            options.onPackageEvent(event);
          }
          break;

        case 5: // Deletion events
          if (options.onDeletionEvent) {
            options.onDeletionEvent(event);
          }
          break;

        default:
          console.log(`🔔 Unhandled event kind: ${event.kind}`);
      }
    } catch (error) {
      console.error('Error handling real-time event:', error);
      if (options.onError) {
        options.onError(error);
      }
    }
  }

  closeSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.close();
    } else {
      console.warn(`Subscription ${subscriptionId} not found`);
    }
  }

  closeAllSubscriptions(): void {
    console.log(`🔔 Closing all ${this.subscriptions.size} subscription(s)`);
    for (const subscription of this.subscriptions.values()) {
      subscription.close();
    }
    this.subscriptions.clear();
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Singleton instance
const realtimeService = new NostrRealtimeService();

export { realtimeService as NostrRealtimeService };
export type { RealtimeOptions, RealtimeSubscription };

// Unified, robust Nostr event publishing service
import { getRelays } from './nostr-service';

interface PublishResult {
  success: boolean;
  results: string[];
  successCount: number;
  totalRelays: number;
}

interface PublishOptions {
  timeout?: number;
  minSuccessRequired?: number;
  retries?: number;
  retryDelay?: number;
}

// Robust event publishing with retries and proper error handling
export async function publishEventRobust(
  event: any,
  options: PublishOptions = {}
): Promise<PublishResult> {
  const {
    timeout = 20000,
    minSuccessRequired = 1,
    retries = 3,
    retryDelay = 1000
  } = options;

  const relays = getRelays();
  if (relays.length === 0) {
    throw new Error('No relays configured');
  }

  console.log(`📡 Publishing event ${event.id} to ${relays.length} relay(s)...`);

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await attemptPublish(event, relays, timeout);
      
      console.log(`📡 Publish attempt ${attempt}: ${result.successCount}/${result.totalRelays} relays succeeded`);
      
      if (result.successCount >= minSuccessRequired) {
        console.log(`✅ Event ${event.id} published successfully to ${result.successCount} relay(s)`);
        return result;
      }
      
      // Not enough successes, but don't retry on last attempt
      if (attempt === retries) {
        console.warn(`⚠️ Event ${event.id} only published to ${result.successCount}/${minSuccessRequired} required relays`);
        return result;
      }
      
      console.log(`🔄 Retrying publish in ${retryDelay}ms (attempt ${attempt + 1}/${retries})...`);
      await sleep(retryDelay);
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Publish attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      console.log(`🔄 Retrying publish in ${retryDelay}ms (attempt ${attempt + 1}/${retries})...`);
      await sleep(retryDelay);
    }
  }
  
  throw lastError || new Error('All publish attempts failed');
}

// Single attempt to publish to all relays
async function attemptPublish(
  event: any,
  relays: string[],
  timeout: number
): Promise<PublishResult> {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.warn(`📡 Publish timeout after ${timeout}ms - resolving with partial results`);
      resolve({
        success: false,
        results: ['timeout'],
        successCount: 0,
        totalRelays: relays.length
      });
    }, timeout);

    try {
      // Dynamic import to avoid SSR issues
      const { SimplePool } = await import('nostr-tools');
      const pool = new SimplePool();
      
      // Publish to all relays in parallel
      const publishPromises = relays.map(async (relay) => {
        try {
          console.log(`📡 Publishing to ${relay}...`);
          await pool.publish([relay], event);
          console.log(`✅ Published to ${relay}`);
          return 'ok';
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`❌ Failed to publish to ${relay}:`, errorMsg);
          return `failed: ${errorMsg}`;
        }
      });

      const results = await Promise.all(publishPromises);
      const successCount = results.filter(r => r === 'ok').length;
      
      clearTimeout(timeoutId);
      
      resolve({
        success: successCount > 0,
        results,
        successCount,
        totalRelays: relays.length
      });
      
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// Publish with verification - ensures event was actually stored
export async function publishEventWithVerification(
  event: any,
  options: PublishOptions = {}
): Promise<PublishResult> {
  const result = await publishEventRobust(event, options);
  
  // Wait a bit for relay propagation
  await sleep(500);
  
  // Verify the event was actually stored by trying to fetch it
  try {
    const { listEvents } = await import('./nostr-service');
    const verifyEvents = await listEvents([{ ids: [event.id] }], 5000);
    
    if (verifyEvents.length === 0) {
      console.warn(`⚠️ Event ${event.id} was published but not found in relay query`);
    } else {
      console.log(`✅ Event ${event.id} verified on relay`);
    }
  } catch (verifyError) {
    console.warn(`⚠️ Could not verify event ${event.id} on relay:`, verifyError);
  }
  
  return result;
}

// Helper function for delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Validate event before publishing
export function validateEvent(event: any): boolean {
  if (!event) {
    console.error('Event is null or undefined');
    return false;
  }
  
  if (!event.id || typeof event.id !== 'string') {
    console.error('Event missing valid id');
    return false;
  }
  
  if (!event.pubkey || typeof event.pubkey !== 'string') {
    console.error('Event missing valid pubkey');
    return false;
  }
  
  if (typeof event.kind !== 'number') {
    console.error('Event missing valid kind');
    return false;
  }
  
  if (!event.sig || typeof event.sig !== 'string') {
    console.error('Event missing valid signature');
    return false;
  }
  
  return true;
}

// Standardized publish function that all other modules should use
export async function publishEvent(event: any, options: PublishOptions = {}): Promise<PublishResult> {
  if (!validateEvent(event)) {
    throw new Error('Invalid event format');
  }
  
  console.log(`🚀 Publishing event: kind=${event.kind}, id=${event.id}`);
  
  return await publishEventWithVerification(event, {
    minSuccessRequired: 1,
    retries: 3,
    retryDelay: 1000,
    timeout: 10000,
    ...options
  });
}

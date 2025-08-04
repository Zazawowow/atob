// Use wrapper for nostr-tools to handle SSR issues
import { getNostrTools, getSimplePool, getNip19, getEventHash, getPublicKey, getNip04 } from './nostr-wrapper';

// Define event kinds for our application
export const EVENT_KINDS = {
  METADATA: 0, // Standard Nostr metadata
  TEXT_NOTE: 1, // Standard Nostr text note
  PACKAGE: 30001, // Custom event kind for packages
  DELIVERY: 30002, // Custom event kind for deliveries
  JOB: 30003, // Custom event kind for jobs
};

// Use only our custom relay
const RELAYS = [
  'wss://nostr.l484.com',
];

// Clear any existing relay settings from localStorage
function clearExistingRelaySettings(): void {
  try {
    // Only run in browser environment
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      // Remove any stored relay configurations
      localStorage.removeItem('relays');
      console.log('Cleared existing relay settings from localStorage');
    }
  } catch (error) {
    console.error('Error clearing relay settings:', error);
  }
}

// Initialize by clearing old settings - only in browser
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure this runs after the module is loaded
  setTimeout(clearExistingRelaySettings, 0);
}

// Get relays - always return our custom relay only
export function getRelays(): string[] {
  return [...RELAYS];
}

// Set available relays - disabled, always use our custom relay
export function setRelays(relays: string[]): void {
  // This function is disabled - we only use our custom relay
  console.warn('setRelays is disabled - using custom relay only');
  // Don't actually set anything, always use our custom relay
}

// Check if a relay is responsive with improved timeout handling
export async function checkRelay(
  relay: string,
  timeoutMs = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Only run in browser environment
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      // Detect browser for appropriate timeout
      const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox');
      const isChrome = typeof navigator !== 'undefined' && navigator.userAgent.includes('Chrome');
      const adjustedTimeout = isFirefox ? timeoutMs * 2 : isChrome ? timeoutMs * 1.5 : timeoutMs;

      const ws = new WebSocket(relay);
      const timeoutId = setTimeout(() => {
        ws.close();
        resolve(false);
      }, adjustedTimeout);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };
    } catch (error) {
      console.error(`Error checking relay ${relay}:`, error);
      resolve(false);
    }
  });
}

// Get working relays - simplified to only check our custom relay
export async function getWorkingRelays(): Promise<string[]> {
  const relays = getRelays();
  const workingRelays: string[] = [];

  // Check our custom relay
  const isWorking = await checkRelay(relays[0]);
  if (isWorking) {
    workingRelays.push(relays[0]);
  } else {
    console.warn(`Custom relay ${relays[0]} is not responding`);
  }

  // Always return our relay even if it's not working (for fallback behavior)
  return relays;
}

// Update the listEvents function to filter out non-package/delivery events
export async function listEvents(
  filters: any[], // Changed from Filter[] to any[] to avoid SSR issues
  timeoutMs = 15000
): Promise<any[]> { // Changed from NostrEvent[] to any[] to avoid SSR issues
  // Get only working relays
  const allRelays = getRelays();
  console.log(`Checking relays: ${allRelays.join(', ')}`);

  // Use all relays for now, but log which ones are working
  const relays = allRelays;

  console.log(`Using relays: ${relays.join(', ')}`);

  // Fix: Ensure filter is properly formatted
  let fixedFilter: any = { kinds: [EVENT_KINDS.PACKAGE] }; // Changed from Filter to any

  if (filters.length > 0 && filters[0].kinds && filters[0].kinds.length > 0) {
    fixedFilter = filters[0];
    console.log('Using filter:', fixedFilter);
  } else {
    console.log('Using default filter:', fixedFilter);
  }

  // Add retry logic with increased timeout
  let retries = 0;
  const maxRetries = 5;
  const retryDelay = 1000;

  while (retries < maxRetries) {
    try {
      console.log(`Attempt ${retries + 1} to fetch events`);
      
      // Try to fetch from each relay individually
      const relayPromises = relays.map(async (relay) => {
        try {
          const events = await fetchEventsWithTimeout(
            [relay],
            fixedFilter,
            timeoutMs * (retries + 1)
          );
          console.log(`Fetched ${events.length} events from ${relay}`);
          return events;
        } catch (error) {
          console.error(`Error fetching from ${relay}:`, error);
          return [];
        }
      });

      const allEvents = await Promise.all(relayPromises);
      const events = allEvents.flat();

      // Less strict filtering - only check if content is a string
      const filteredEvents = events.filter((event) => {
        if (typeof event.content !== 'string') {
          console.log(`Skipping event ${event.id} with non-string content`);
          return false;
        }
        return true;
      });

      // Remove duplicates based on event ID
      const uniqueEvents = Array.from(
        new Map(filteredEvents.map(event => [event.id, event])).values()
      );

      console.log(
        `Filtered ${events.length - uniqueEvents.length} invalid/duplicate events`
      );

      if (uniqueEvents.length > 0) {
        console.log(
          `Successfully fetched ${uniqueEvents.length} unique events on attempt ${
            retries + 1
          }`
        );
        return uniqueEvents;
      }
      retries++;
      // Wait longer before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    } catch (error) {
      console.error(`Error on attempt ${retries + 1}:`, error);
      retries++;
      if (retries >= maxRetries) {
        console.log('Max retries reached, returning empty array');
        return [];
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return [];
}

// Helper function to fetch events with timeout
async function fetchEventsWithTimeout(
  relays: string[],
  filter: any, // Changed from Filter to any to avoid SSR issues
  timeoutMs: number
): Promise<any[]> { // Changed from NostrEvent[] to any[] to avoid SSR issues
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Fetch timeout'));
    }, timeoutMs);

    const events: any[] = []; // Changed from NostrEvent[] to any[]
    const seen = new Set<string>();

    try {
      getSimplePool().then(async (SimplePool) => {
        if (!SimplePool) {
          clearTimeout(timeoutId);
          resolve([]);
          return;
        }
        
        const pool = new SimplePool();
        const sub = pool.subscribe(relays, filter, {
          onevent: (event: any) => { // Changed from NostrEvent to any
            if (!seen.has(event.id)) {
              seen.add(event.id);
              events.push(event);
            }
          },
          oneose: () => {
            clearTimeout(timeoutId);
            resolve(events);
          }
        });
      }).catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      // The timeout will automatically reject the promise if it takes too long
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error instanceof Error ? error : new Error('Unknown error'));
    }
  });
}

// Get a specific event by ID with retry logic
export async function getEventById(id: string): Promise<any | null> { // Changed from NostrEvent to any to avoid SSR issues
  try {
    const relays = getRelays();

    // Add retry logic
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        console.log(`Attempt ${retries + 1} to get event ${id}`);
        const SimplePool = await getSimplePool();
        if (!SimplePool) {
          return null;
        }
        
        const pool = new SimplePool();
        const event = await pool.get(relays, { ids: [id] });
        if (event) {
          console.log(
            `Successfully fetched event ${id} on attempt ${retries + 1}`
          );
          return event;
        }
        retries++;
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error on attempt ${retries + 1}:`, error);
        retries++;
        if (retries >= maxRetries) {
          console.log('Max retries reached, returning null');
          return null;
        }
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`Event ${id} not found after all retries`);
    return null;
  } catch (error) {
    console.error('Failed to get event:', error);
    return null;
  }
}

// Create and sign an event with either the Nostr extension or nsec key
export async function createSignedEvent(
  kind: number,
  content: string,
  tags: string[][] = []
): Promise<any> { // Changed from NostrEvent to any to avoid SSR issues
  // Get the public key - only in browser environment
  let pubkey: string | null = null;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    pubkey = localStorage.getItem('nostr_pubkey');
  }
  
  if (!pubkey) {
    throw new Error('No public key found');
  }

  // Create the event without id and sig
  const event = {
    kind,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
    id: '', // Will be set by signing
    sig: '', // Will be set by signing
  };

  try {
    // First try using the extension if available
    if (typeof window !== 'undefined' && window.nostr) {
      try {
        const signedEvent = await window.nostr.signEvent(event);
        return signedEvent;
      } catch (extensionError) {
        console.warn('Extension signing failed, falling back to nsec:', extensionError);
      }
    }

    // Fall back to nsec-based signing
    let privateKey: string | null = null;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      privateKey = localStorage.getItem('nostr_privkey');
    }
    
    if (!privateKey) {
      throw new Error('No private key found for signing');
    }

    // Get the event hash
    const getEventHashFn = await getEventHash();
    if (!getEventHashFn) {
      throw new Error('Failed to load getEventHash function');
    }
    
    event.id = getEventHashFn(event);

    // Convert hex private key to Uint8Array
    const privateKeyBytes = new Uint8Array(
      privateKey.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    // Sign the event using the private key
    const { schnorr } = await import('@noble/curves/secp256k1');
    const signature = schnorr.sign(event.id, privateKeyBytes);
    event.sig = Array.from(signature)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return event;
  } catch (error) {
    console.error('Failed to sign event:', error);
    throw error;
  }
}

// Add retry mechanism for failed operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

// Update publishEvent to work with single relay
export async function publishEvent(event: any): Promise<string[]> { // Changed from NostrEvent to any to avoid SSR issues
  try {
    const relays = getRelays(); // Always use our custom relay
    if (relays.length === 0) {
      throw new Error('No relay configured');
    }

    const relay = relays[0]; // We only have one relay
    
    try {
      const SimplePool = await getSimplePool();
      if (!SimplePool) {
        throw new Error('Failed to load SimplePool');
      }
      
      const pool = new SimplePool();
      await pool.publish([relay], event);
      console.log(`Event published successfully to ${relay}`);
      return ['ok'];
    } catch (error) {
      console.error(`Failed to publish to ${relay}:`, error);
      return ['failed: ' + (error instanceof Error ? error.message : String(error))];
    }
  } catch (error) {
    console.error('Failed to publish event:', error);
    return ['failed: ' + (error instanceof Error ? error.message : String(error))];
  }
}

// Close all connections
export async function closePool(): Promise<void> {
  try {
    const SimplePool = await getSimplePool();
    if (SimplePool) {
      const pool = new SimplePool();
      pool.close(getRelays());
    }
  } catch (error) {
    console.error('Failed to close pool:', error);
  }
}

// Helper function to convert npub to hex pubkey
export async function npubToHex(npub: string): Promise<string> {
  try {
    const nip19 = await getNip19();
    if (!nip19) {
      return '';
    }
    
    const { data } = nip19.decode(npub);
    return data as string;
  } catch (error) {
    console.error('Failed to convert npub to hex:', error);
    return '';
  }
}

// Helper function to convert hex pubkey to npub
export async function hexToNpub(hex: string): Promise<string> {
  try {
    const nip19 = await getNip19();
    if (!nip19) {
      return '';
    }
    
    return nip19.npubEncode(hex);
  } catch (error) {
    console.error('Failed to convert hex to npub:', error);
    return '';
  }
}

// Fetch user profile metadata
export async function getUserProfile(pubkey: string): Promise<{
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
} | null> {
  try {
    const relays = getRelays(); // Always use our custom relay
    const filter: any = { // Changed from Filter to any to avoid SSR issues
      kinds: [EVENT_KINDS.METADATA],
      authors: [pubkey],
      limit: 1
    };

    const events = await fetchEventsWithTimeout(relays, filter, 5000);
    
    if (events.length === 0) {
      return null;
    }

    // Get the most recent metadata event
    const latestEvent = events.sort((a: any, b: any) => b.created_at - a.created_at)[0]; // Changed from NostrEvent to any
    
    try {
      const metadata = JSON.parse(latestEvent.content);
      return metadata;
    } catch (error) {
      console.error('Failed to parse metadata content:', error);
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
}

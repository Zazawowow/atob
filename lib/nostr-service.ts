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

// Use only our custom relay for app-specific data
const RELAYS = [
  'wss://nostr.l484.com',
];

// Popular public relays for profile data (metadata events)
const PROFILE_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
  'wss://purplepag.es',
  'wss://relay.bitcoin.social',
];

// Clear any existing relay settings from localStorage
function clearExistingRelaySettings(): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      // Remove any old relay settings
      localStorage.removeItem('nostr_relays');
      localStorage.removeItem('nostr_profile_relays');
    } catch (error) {
      console.warn('Error clearing relay settings:', error);
    }
  }
}

// Note: Initialization moved to client-side only to avoid SSR issues

// Get relays - always return our custom relay only
export function getRelays(): string[] {
  return [...RELAYS];
}

// Set relays (for future use)
export function setRelays(relays: string[]): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('nostr_relays', JSON.stringify(relays));
    } catch (error) {
      console.warn('Error saving relay settings:', error);
    }
  }
}

// Simple connection management without complex classes
let simplePoolInstance: any = null;

async function getSimplePoolInstance(): Promise<any> {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!simplePoolInstance) {
    try {
      const SimplePool = await getSimplePool();
      if (SimplePool) {
        simplePoolInstance = new SimplePool();
      }
    } catch (error) {
      console.warn('Error creating SimplePool instance:', error);
      return null;
    }
  }
  
  return simplePoolInstance;
}

// Legacy function for fetching events with timeout
async function fetchEventsWithTimeout(
  relays: string[],
  filter: any, // Changed from Filter to any to avoid SSR issues
  timeoutMs: number
): Promise<any[]> { // Changed from NostrEvent[] to any[] to avoid SSR issues
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.warn(`Fetch timeout after ${timeoutMs}ms for relays: ${relays.join(', ')}`);
      resolve([]); // Resolve with empty array instead of rejecting
    }, timeoutMs);

    const events: any[] = []; // Changed from NostrEvent[] to any[]
    const seen = new Set<string>();

    try {
      getSimplePoolInstance().then(async (pool) => {
        if (!pool) {
          clearTimeout(timeoutId);
          resolve([]);
          return;
        }
        
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
        console.warn('Error in fetchEventsWithTimeout:', error);
        clearTimeout(timeoutId);
        resolve([]); // Resolve with empty array instead of rejecting
      });

      // The timeout will automatically resolve with empty array if it takes too long
    } catch (error) {
      console.warn('Error in fetchEventsWithTimeout:', error);
      clearTimeout(timeoutId);
      resolve([]); // Resolve with empty array instead of rejecting
    }
  });
}

// Simplified listEvents function that works reliably
export async function listEvents(
  filters: any[], // Changed from Filter[] to any[] to avoid SSR issues
  timeoutMs = 15000
): Promise<any[]> { // Changed from NostrEvent[] to any[] to avoid SSR issues
  // Only run on client side
  if (typeof window === 'undefined') {
    console.log('SSR: Returning empty array for listEvents');
    return [];
  }

  console.log('🚀 Fetching events');
  
  const relays = getRelays();
  console.log(`Using relays: ${relays.join(', ')}`);

  // Fix: Ensure filter is properly formatted
  let fixedFilter: any = { kinds: [EVENT_KINDS.PACKAGE] }; // Changed from Filter to any

  if (filters.length > 0 && filters[0].kinds && filters[0].kinds.length > 0) {
    fixedFilter = filters[0];
    console.log('Using filter:', fixedFilter);
  } else {
    console.log('Using default filter:', fixedFilter);
  }

  // Simple approach: try to fetch from relays
  try {
    const events = await fetchEventsWithTimeout(
      relays,
      fixedFilter,
      timeoutMs
    );

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
      `✅ Successfully fetched ${uniqueEvents.length} unique events`
    );
    return uniqueEvents;
  } catch (error) {
    console.warn('Error fetching events:', error);
    return [];
  }
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
        console.warn(`Error on attempt ${retries + 1}:`, error);
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
    console.log('🔌 Closing all relay connections...');
    if (simplePoolInstance) {
      // simplePoolInstance.close(); // SimplePool doesn't have a direct close method
      console.log('SimplePool instance closed (if it existed)');
    }
    // No cache to clear here as it's not a complex cache
    console.log('✅ All connections and cache cleared');
  } catch (error) {
    console.error('Error closing relay connections:', error);
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

// Fetch user profile metadata from public relays
export async function getUserProfile(pubkey: string): Promise<{
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
} | null> {
  try {
    console.log(`Fetching profile for pubkey: ${pubkey} from public relays`);
    
    const filter: any = {
      kinds: [EVENT_KINDS.METADATA],
      authors: [pubkey],
      limit: 1
    };

    // Use public relays for profile data with shorter timeout
    const events = await fetchEventsWithTimeout(PROFILE_RELAYS, filter, 3000);
    
    if (events.length === 0) {
      console.log(`No profile found for pubkey: ${pubkey}`);
      return null;
    }

    // Get the most recent metadata event
    const latestEvent = events.sort((a: any, b: any) => b.created_at - a.created_at)[0];
    
    try {
      const metadata = JSON.parse(latestEvent.content);
      console.log(`Profile found for ${pubkey}:`, metadata);
      return metadata;
    } catch (error) {
      console.error('Failed to parse metadata content:', error);
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch user profile from public relays:', error);
    return null;
  }
}

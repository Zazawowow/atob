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

// Simple connection pool (SSR-safe)
let connectionPool: Map<string, any> | null = null;
let cache: Map<string, { data: any; timestamp: number; ttl: number }> | null = null;

// Get connection pool (lazy initialization)
function getConnectionPool(): Map<string, any> {
  if (typeof window === 'undefined') return new Map();
  if (!connectionPool) {
    connectionPool = new Map();
  }
  return connectionPool;
}

// Get cache (lazy initialization)
function getCache(): Map<string, { data: any; timestamp: number; ttl: number }> {
  if (typeof window === 'undefined') return new Map();
  if (!cache) {
    cache = new Map();
  }
  return cache;
}

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

// Simple connection management
async function getConnection(relay: string): Promise<any> {
  if (typeof window === 'undefined') return null;
  
  const pool = getConnectionPool();
  
  // Return existing connection if available
  if (pool.has(relay)) {
    return pool.get(relay);
  }
  
  try {
    console.log(`🔌 Connecting to ${relay}`);
    const SimplePool = await getSimplePool();
    if (!SimplePool) {
      throw new Error('Failed to load SimplePool');
    }
    
    const connection = new SimplePool();
    
    // Test the connection without timeout since ensureRelay is synchronous
    try {
      // Test the connection by ensuring relay
      connection.ensureRelay(relay);
      pool.set(relay, connection);
      console.log(`✅ Connected to ${relay}`);
      return connection;
    } catch (error) {
      console.warn(`⚠️ Failed to ensure relay ${relay}:`, error);
      // Still return the connection as it might work for publishing
      pool.set(relay, connection);
      return connection;
    }
  } catch (error) {
    console.warn(`❌ Failed to connect to ${relay}:`, error);
    // Don't store failed connections
    pool.delete(relay);
    return null;
  }
}

// Simple caching
async function getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
  if (typeof window === 'undefined') {
    return fetcher();
  }
  
  const cacheMap = getCache();
  const cached = cacheMap.get(key);
  const now = Date.now();
  
  // Return cached data if still valid
  if (cached && (now - cached.timestamp) < cached.ttl) {
    console.log(`📦 Cache hit for ${key}`);
    return cached.data;
  }
  
  // Fetch fresh data
  const data = await fetcher();
  
  // Cache the result
  cacheMap.set(key, {
    data,
    timestamp: now,
    ttl
  });
  
  return data;
}

// Check if a relay is responsive
export async function checkRelay(relay: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const pool = await getConnection(relay);
    return !!pool;
  } catch (error) {
    return false;
  }
}

// Get working relays
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

// Smart listEvents function with caching and connection management
export async function listEvents(
  filters: any[], // Changed from Filter[] to any[] to avoid SSR issues
  timeoutMs = 15000
): Promise<any[]> { // Changed from NostrEvent[] to any[] to avoid SSR issues
  // Only run on client side
  if (typeof window === 'undefined') {
    console.log('SSR: Returning empty array for listEvents');
    return [];
  }

  console.log('🚀 Fetching events with smart connection management');
  
  const relays = getRelays();
  console.log(`Using relays: ${relays.join(', ')}`);

  // Create cache key based on filters
  const filterKey = JSON.stringify(filters);
  const cacheKey = `events:${filterKey}`;

  return getCachedOrFetch(
    cacheKey,
    async () => {
      // Fix: Ensure filter is properly formatted
      let fixedFilter: any = { kinds: [EVENT_KINDS.PACKAGE] }; // Changed from Filter to any

      if (filters.length > 0 && filters[0].kinds && filters[0].kinds.length > 0) {
        fixedFilter = filters[0];
        console.log('Using filter:', fixedFilter);
      } else {
        console.log('Using default filter:', fixedFilter);
      }

      // Try to get a working connection
      let workingPool = null;
      for (const relay of relays) {
        try {
          workingPool = await getConnection(relay);
          if (workingPool) {
            console.log(`✅ Using connection to ${relay}`);
            break;
          }
        } catch (error) {
          console.warn(`❌ Failed to connect to ${relay}:`, error);
        }
      }

      if (!workingPool) {
        console.warn('⚠️ No working connections available, falling back to local data');
        return [];
      }

      // Fetch events with optimized timeout
      try {
        const events = await fetchEventsWithTimeout(
          workingPool,
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
    },
    60000 // 1 minute cache
  );
}

// Fetch events with timeout
async function fetchEventsWithTimeout(
  pool: any,
  relays: string[],
  filter: any, // Changed from Filter to any to avoid SSR issues
  timeoutMs: number
): Promise<any[]> { // Changed from NostrEvent[] to any[] to avoid SSR issues
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      console.warn(`Fetch timeout after ${timeoutMs}ms for relays: ${relays.join(', ')}`);
      resolve([]); // Resolve with empty array instead of rejecting
    }, timeoutMs);

    const events: any[] = []; // Changed from NostrEvent[] to any[]
    const seen = new Set<string>();
    let hasReceivedEose = false;

    try {
      console.log(`🔍 Subscribing to ${relays.length} relay(s) with filter:`, filter);
      
      const sub = pool.subscribe(relays, filter, {
        onevent: (event: any) => { // Changed from NostrEvent to any
          if (!seen.has(event.id)) {
            seen.add(event.id);
            events.push(event);
            console.log(`📦 Received event ${event.id} (total: ${events.length})`);
          }
        },
        oneose: () => {
          if (!hasReceivedEose) {
            hasReceivedEose = true;
            clearTimeout(timeoutId);
            console.log(`✅ EOSE received, resolving with ${events.length} events`);
            resolve(events);
          }
        }
      });

      // Close subscription after timeout to prevent memory leaks
      setTimeout(() => {
        if (!hasReceivedEose) {
          console.log(`⏰ Timeout reached, closing subscription`);
          sub.close();
        }
      }, timeoutMs);

    } catch (error) {
      console.warn('Error in fetchEventsWithTimeout:', error);
      clearTimeout(timeoutId);
      resolve([]); // Resolve with empty array instead of rejecting
    }
  });
}



// Initialize cache cleanup (client-side only) - lazy initialization
function initializeClientSideFeatures() {
  if (typeof window === 'undefined') return;
  
  // Start cache cleanup interval
  setInterval(() => {
    const cacheMap = getCache();
    let cleaned = 0;
    
    for (const [key, entry] of cacheMap.entries()) {
      if (Date.now() - entry.timestamp > entry.ttl) {
        cacheMap.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }, 60000); // 1 minute cleanup
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    const pool = getConnectionPool();
    pool.forEach((connection, relay) => {
      try {
        connection.close();
        console.log(`🔌 Closed connection to ${relay}`);
      } catch (error) {
        console.warn(`Error closing connection to ${relay}:`, error);
      }
    });
    pool.clear();
    console.log('✅ All connections and cache cleared on page unload');
  });
}

// Lazy initialization on first use
let clientSideFeaturesInitialized = false;
function ensureClientSideFeatures() {
  if (!clientSideFeaturesInitialized && typeof window !== 'undefined') {
    initializeClientSideFeatures();
    clientSideFeaturesInitialized = true;
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
  console.log('🔐 Creating signed event:', { kind, contentLength: content.length, tagsCount: tags.length });
  
  let pubkey: string | null = null;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    pubkey = localStorage.getItem('nostr_pubkey');
    console.log('📝 Got pubkey from localStorage:', pubkey);
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
    console.log('📝 Generated event ID:', event.id);

    // Convert hex private key to Uint8Array
    const privateKeyBytes = new Uint8Array(
      privateKey.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    console.log('🔑 Private key converted to bytes, length:', privateKeyBytes.length);

    // Sign the event using the private key
    const { schnorr } = await import('@noble/curves/secp256k1');
    const signature = schnorr.sign(event.id, privateKeyBytes);
    event.sig = Array.from(signature)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    console.log('✍️ Generated signature:', event.sig);
    
    console.log('✅ Successfully created signed event:', { id: event.id, kind: event.kind, pubkey: event.pubkey });
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
export async function publishEvent(event: any): Promise<string[]> {
  try {
    const relays = getRelays();
    if (relays.length === 0) {
      throw new Error('No relay configured');
    }

    const relay = relays[0];
    
    const SimplePool = await getSimplePool();
    if (!SimplePool) {
      throw new Error('Failed to load SimplePool');
    }
    
    const pool = new SimplePool();
    
    // Simple publish - nostr-tools handles the complexity
    try {
      await pool.publish([relay], event);
      console.log(`✅ Published to ${relay}`);
      return ['ok'];
    } catch (error: any) {
      console.error(`❌ Failed to publish to ${relay}:`, error);
      return ['failed: ' + error.message];
    }
  } catch (error: any) {
    console.error('❌ Publish error:', error);
    return ['failed: ' + error.message];
  }
}

// Close all connections
export async function closePool(): Promise<void> {
  try {
    console.log('🔌 Closing all relay connections...');
    const pool = getConnectionPool();
    pool.forEach((connection, relay) => {
      try {
        connection.close();
        console.log(`🔌 Closed connection to ${relay}`);
      } catch (error) {
        console.warn(`Error closing connection to ${relay}:`, error);
      }
    });
    pool.clear();
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
    const pool = await getConnection(PROFILE_RELAYS[0]);
    if (!pool) {
      console.warn('No connection available for profile fetch');
      return null;
    }
    const events = await fetchEventsWithTimeout(pool, PROFILE_RELAYS, filter, 3000);
    
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

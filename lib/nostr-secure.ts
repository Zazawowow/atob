// Secure Nostr service with encryption and access control
// Only uses our custom relay and encrypts all data

// Types for secure operations
export interface SecureJobData {
  title: string;
  location: string;
  peopleNeeded: number;
  compensation: string;
  description?: string;
  requirements?: string;
  duration?: string;
  contactInfo?: string;
  allowedNpubs: string[]; // List of approved npubs who can view this job
}

export interface SecurePackageData {
  title: string;
  pickupLocation: string;
  destination: string;
  cost: string;
  description?: string;
  allowedNpubs: string[]; // List of approved npubs who can view this package
}

// Configuration
const RELAY_URL = 'wss://nostr.l484.com';
const EVENT_KINDS = {
  SECURE_JOB: 30003,
  SECURE_PACKAGE: 30001,
  SECURE_DELIVERY: 30002,
  APPROVED_NPUBS: 30004, // Special event kind for storing approved npubs
};

// Lazy load nostr-tools only in browser
let nostrTools: any = null;
let SimplePool: any = null;
let nip04: any = null;
let nip19: any = null;
let getEventHash: any = null;
let schnorr: any = null;

async function loadNostrTools() {
  if (typeof window === 'undefined') {
    // Return mock objects for SSR
    return {
      SimplePool: class MockSimplePool {
        constructor() {}
        subscribe() { return { close: () => {} }; }
        get() { return null; }
        publish() { return Promise.resolve(); }
        close() {}
      },
      nip04: {
        encrypt: () => Promise.resolve(''),
        decrypt: () => Promise.resolve(''),
      },
      nip19: {
        decode: () => ({ data: '' }),
        npubEncode: () => '',
      },
      getEventHash: () => '',
      schnorr: {
        sign: () => new Uint8Array(),
      },
    };
  }
  
  if (!nostrTools) {
    try {
      nostrTools = await import('nostr-tools');
      SimplePool = nostrTools.SimplePool;
      nip04 = nostrTools.nip04;
      nip19 = nostrTools.nip19;
      getEventHash = nostrTools.getEventHash;
      
      // Load schnorr for signing
      const nobleCurves = await import('@noble/curves/secp256k1');
      schnorr = nobleCurves.schnorr;
    } catch (error) {
      console.error('Failed to load nostr-tools:', error);
      throw error;
    }
  }
  
  return { SimplePool, nip04, nip19, getEventHash, schnorr };
}

// Get pool instance
async function getPool() {
  const { SimplePool } = await loadNostrTools();
  return new SimplePool();
}

// Convert npub to hex pubkey
async function npubToHex(npub: string): Promise<string> {
  if (npub.startsWith('npub')) {
    const { nip19 } = await loadNostrTools();
    const { data } = nip19.decode(npub);
    return data as string;
  }
  return npub;
}

// Convert hex pubkey to npub
async function hexToNpub(hex: string): Promise<string> {
  const { nip19 } = await loadNostrTools();
  return nip19.npubEncode(hex);
}

// Encrypt content for multiple npubs
async function encryptForNpubs(content: string, npubs: string[], senderPrivkey: string): Promise<Record<string, string>> {
  const { nip04 } = await loadNostrTools();
  const encryptedMap: Record<string, string> = {};
  
  for (const npub of npubs) {
    try {
      const pubkey = await npubToHex(npub);
      const encrypted = await nip04.encrypt(senderPrivkey, pubkey, content);
      encryptedMap[pubkey] = encrypted;
    } catch (error) {
      console.error(`Failed to encrypt for npub ${npub}:`, error);
    }
  }
  
  return encryptedMap;
}

// Decrypt content if user is allowed
async function decryptIfAllowed(event: any, userPrivkey: string, userPubkey: string): Promise<string | null> {
  try {
    const { nip04 } = await loadNostrTools();
    
    // Check if user's pubkey is in the allowed list
    const allowedPubkeys = event.tags
      .filter((tag: any[]) => tag[0] === 'p')
      .map((tag: any[]) => tag[1]);
    
    if (!allowedPubkeys.includes(userPubkey)) {
      return null; // User not authorized
    }
    
    // Parse encrypted content map
    const encryptedMap = JSON.parse(event.content);
    const encrypted = encryptedMap[userPubkey];
    
    if (!encrypted) {
      return null; // No encrypted content for this user
    }
    
    // Decrypt the content
    return await nip04.decrypt(userPrivkey, userPubkey, encrypted);
  } catch (error) {
    console.error('Failed to decrypt content:', error);
    return null;
  }
}

// Create and sign a secure event
async function createSecureEvent(
  kind: number,
  content: string,
  tags: string[][],
  privkey: string,
  pubkey: string
): Promise<any> {
  const { getEventHash, schnorr } = await loadNostrTools();
  
  const event = {
    kind,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
    id: '',
    sig: '',
  };
  
  // Get event hash
  event.id = getEventHash(event);
  
  // Sign the event
  const privateKeyBytes = new Uint8Array(
    privkey.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );
  
  const signature = schnorr.sign(event.id, privateKeyBytes);
  event.sig = Array.from(signature)
    .map((b: unknown) => (b as number).toString(16).padStart(2, '0'))
    .join('');
  
  return event;
}

// Publish event to our relay
async function publishToRelay(event: any): Promise<boolean> {
  try {
    const pool = await getPool();
    await pool.publish([RELAY_URL], event);
    console.log('Event published successfully to', RELAY_URL);
    return true;
  } catch (error) {
    console.error('Failed to publish to relay:', error);
    return false;
  }
}

// Get user's keys from localStorage
function getUserKeys(): { pubkey: string; privkey: string } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const pubkey = localStorage.getItem('nostr_pubkey');
    const privkey = localStorage.getItem('nostr_privkey');
    
    if (!pubkey || !privkey) return null;
    
    return { pubkey, privkey };
  } catch (error) {
    console.error('Failed to get user keys:', error);
    return null;
  }
}

// Post a secure job
export async function postSecureJob(jobData: Omit<SecureJobData, 'allowedNpubs'>, allowedNpubs: string[]): Promise<string> {
  const keys = getUserKeys();
  if (!keys) {
    throw new Error('User not authenticated');
  }
  
  // Add the poster to allowed npubs if not already included
  const posterNpub = await hexToNpub(keys.pubkey);
  const allAllowedNpubs = allowedNpubs.includes(posterNpub) 
    ? allowedNpubs 
    : [...allowedNpubs, posterNpub];
  
  // Create the job data with allowed npubs
  const secureJobData: SecureJobData = {
    ...jobData,
    allowedNpubs: allAllowedNpubs,
  };
  
  // Encrypt the job data for all allowed npubs
  const encryptedMap = await encryptForNpubs(
    JSON.stringify(secureJobData),
    allAllowedNpubs,
    keys.privkey
  );
  
  // Create tags for allowed npubs
  const tags = allAllowedNpubs.map(npub => ['p', npub]);
  
  // Create and sign the event
  const event = await createSecureEvent(
    EVENT_KINDS.SECURE_JOB,
    JSON.stringify(encryptedMap),
    tags,
    keys.privkey,
    keys.pubkey
  );
  
  // Publish to our relay
  const success = await publishToRelay(event);
  if (!success) {
    throw new Error('Failed to publish job to relay');
  }
  
  return event.id;
}

// Fetch secure jobs that the user can access
export async function fetchSecureJobs(): Promise<SecureJobData[]> {
  const keys = getUserKeys();
  if (!keys) {
    throw new Error('User not authenticated');
  }
  
  try {
    const pool = await getPool();
    const events = await pool.list([RELAY_URL], [{ kinds: [EVENT_KINDS.SECURE_JOB] }]);
    
    const jobs: SecureJobData[] = [];
    
    for (const event of events) {
      const decrypted = await decryptIfAllowed(event, keys.privkey, keys.pubkey);
      if (decrypted) {
        try {
          const jobData = JSON.parse(decrypted) as SecureJobData;
          jobs.push(jobData);
        } catch (error) {
          console.error('Failed to parse job data:', error);
        }
      }
    }
    
    // Sort by creation date (newest first)
    jobs.sort((a, b) => (b as any).created_at - (a as any).created_at);
    
    return jobs;
  } catch (error) {
    console.error('Failed to fetch secure jobs:', error);
    return [];
  }
}

// Post a secure package
export async function postSecurePackage(packageData: Omit<SecurePackageData, 'allowedNpubs'>, allowedNpubs: string[]): Promise<string> {
  const keys = getUserKeys();
  if (!keys) {
    throw new Error('User not authenticated');
  }
  
  // Add the poster to allowed npubs if not already included
  const posterNpub = await hexToNpub(keys.pubkey);
  const allAllowedNpubs = allowedNpubs.includes(posterNpub) 
    ? allowedNpubs 
    : [...allowedNpubs, posterNpub];
  
  // Create the package data with allowed npubs
  const securePackageData: SecurePackageData = {
    ...packageData,
    allowedNpubs: allAllowedNpubs,
  };
  
  // Encrypt the package data for all allowed npubs
  const encryptedMap = await encryptForNpubs(
    JSON.stringify(securePackageData),
    allAllowedNpubs,
    keys.privkey
  );
  
  // Create tags for allowed npubs
  const tags = allAllowedNpubs.map(npub => ['p', npub]);
  
  // Create and sign the event
  const event = await createSecureEvent(
    EVENT_KINDS.SECURE_PACKAGE,
    JSON.stringify(encryptedMap),
    tags,
    keys.privkey,
    keys.pubkey
  );
  
  // Publish to our relay
  const success = await publishToRelay(event);
  if (!success) {
    throw new Error('Failed to publish package to relay');
  }
  
  return event.id;
}

// Fetch secure packages that the user can access
export async function fetchSecurePackages(): Promise<SecurePackageData[]> {
  const keys = getUserKeys();
  if (!keys) {
    throw new Error('User not authenticated');
  }
  
  try {
    const pool = await getPool();
    const events = await pool.list([RELAY_URL], [{ kinds: [EVENT_KINDS.SECURE_PACKAGE] }]);
    
    const packages: SecurePackageData[] = [];
    
    for (const event of events) {
      const decrypted = await decryptIfAllowed(event, keys.privkey, keys.pubkey);
      if (decrypted) {
        try {
          const packageData = JSON.parse(decrypted) as SecurePackageData;
          packages.push(packageData);
        } catch (error) {
          console.error('Failed to parse package data:', error);
        }
      }
    }
    
    // Sort by creation date (newest first)
    packages.sort((a, b) => (b as any).created_at - (a as any).created_at);
    
    return packages;
  } catch (error) {
    console.error('Failed to fetch secure packages:', error);
    return [];
  }
}

// Get approved npubs list (managed by admin)
export async function getApprovedNpubs(): Promise<string[]> {
  // Get approved npubs from localStorage (managed by admin)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('approved_npubs');
      if (stored) {
        const approvedNpubs = JSON.parse(stored);
        return approvedNpubs;
      }
    } catch (error) {
      console.error('Failed to parse approved npubs:', error);
    }
  }
  
  // Fallback: return admin npub only if no stored list
  const adminNpub = 'npub10wzfa7jkqj6c65xyr93hhxrns37ml9tss82jvymv8fymwdtu6cts3h6pvr';
  return [adminNpub];
}

// Check if an npub is approved
export async function isNpubApproved(npub: string): Promise<boolean> {
  const approvedNpubs = await getApprovedNpubs();
  return approvedNpubs.includes(npub);
}

// Utility function to get user's npub
export async function getUserNpub(): Promise<string | null> {
  const keys = getUserKeys();
  if (!keys) return null;
  
  return await hexToNpub(keys.pubkey);
} 
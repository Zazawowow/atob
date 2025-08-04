// Wrapper for nostr-tools to handle SSR issues
let nostrTools: any = null;

export async function getNostrTools() {
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
      nip19: {
        decode: () => ({ data: '' }),
        npubEncode: () => '',
      },
      getEventHash: () => '',
      getPublicKey: () => '',
      nip04: {},
    };
  }

  if (!nostrTools) {
    try {
      nostrTools = await import('nostr-tools');
    } catch (error) {
      console.error('Failed to load nostr-tools:', error);
      return null;
    }
  }

  return nostrTools;
}

export async function getSimplePool() {
  const tools = await getNostrTools();
  return tools?.SimplePool;
}

export async function getNip19() {
  const tools = await getNostrTools();
  return tools?.nip19;
}

export async function getEventHash() {
  const tools = await getNostrTools();
  return tools?.getEventHash;
}

export async function getPublicKey() {
  const tools = await getNostrTools();
  return tools?.getPublicKey;
}

export async function getNip04() {
  const tools = await getNostrTools();
  return tools?.nip04;
} 
// Client-side wrapper for Nostr functions to prevent SSR issues

// Types
export interface ProfileData {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  website?: string;
  nip05?: string;
  followers?: number;
  following?: number;
  deliveries?: number;
  rating?: number;
}

// Wrapper functions that only run on client side
export async function getUserProfile(pubkey: string): Promise<ProfileData | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const { getUserProfile: originalGetUserProfile } = await import('./nostr');
  return originalGetUserProfile(pubkey);
}

export async function getMyDeliveries(): Promise<any[]> {
  if (typeof window === 'undefined') {
    return [];
  }
  
  const { getMyDeliveries: originalGetMyDeliveries } = await import('./nostr');
  return originalGetMyDeliveries();
}

export async function getPackages(): Promise<any[]> {
  if (typeof window === 'undefined') {
    return [];
  }
  
  const { getPackages: originalGetPackages } = await import('./nostr');
  return originalGetPackages();
}

export async function createPackage(packageData: any): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create package during SSR');
  }
  
  const { createPackage: originalCreatePackage } = await import('./nostr');
  return originalCreatePackage(packageData);
}

export async function createJob(jobData: any): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create job during SSR');
  }
  
  const { createJob: originalCreateJob } = await import('./nostr');
  return originalCreateJob(jobData);
}

export async function confirmDelivery(deliveryData: any): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot confirm delivery during SSR');
  }
  
  const { confirmDelivery: originalConfirmDelivery } = await import('./nostr');
  return originalConfirmDelivery(deliveryData);
}

export async function pickupPackage(packageId: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot pickup package during SSR');
  }
  
  const { pickupPackage: originalPickupPackage } = await import('./nostr');
  return originalPickupPackage(packageId);
}

export async function deletePackage(packageId: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete package during SSR');
  }
  
  const { deletePackage: originalDeletePackage } = await import('./nostr');
  return originalDeletePackage(packageId);
}

export async function deleteJob(jobId: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete job during SSR');
  }
  
  const { deleteJob: originalDeleteJob } = await import('./nostr');
  return originalDeleteJob(jobId);
}

export async function completeJob(jobId: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot complete job during SSR');
  }
  
  const { completeJob: originalCompleteJob } = await import('./nostr');
  return originalCompleteJob(jobId);
}

export async function applyForJob(jobId: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot apply for job during SSR');
  }
  
  const { applyForJob: originalApplyForJob } = await import('./nostr');
  return originalApplyForJob(jobId);
}

export async function acceptJobApplicant(jobId: string, workerPubkey: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot accept job applicant during SSR');
  }
  
  const { acceptJobApplicant: originalAcceptJobApplicant } = await import('./nostr');
  return originalAcceptJobApplicant(jobId, workerPubkey);
}

export async function rejectJobApplicant(jobId: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot reject job applicant during SSR');
  }
  
  const { rejectJobApplicant: originalRejectJobApplicant } = await import('./nostr');
  return originalRejectJobApplicant(jobId);
}

export async function getEffectiveStatus(packageId: string): Promise<string> {
  if (typeof window === 'undefined') {
    return 'unknown';
  }
  
  const { getEffectiveStatus: originalGetEffectiveStatus } = await import('./nostr');
  return originalGetEffectiveStatus(packageId);
}

export async function getJobs(): Promise<any[]> {
  if (typeof window === 'undefined') {
    return [];
  }
  
  const { getJobs: originalGetJobs } = await import('./nostr');
  return originalGetJobs();
}

export async function getMyJobs(): Promise<any[]> {
  if (typeof window === 'undefined') {
    return [];
  }
  
  const { getMyJobs: originalGetMyJobs } = await import('./nostr');
  return originalGetMyJobs();
}

export async function updateProfile(profileData: ProfileData): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot update profile during SSR');
  }
  
  const { updateProfile: originalUpdateProfile } = await import('./nostr');
  return originalUpdateProfile(profileData);
}

export async function forceStatusRefresh(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  
  const { forceStatusRefresh: originalForceStatusRefresh } = await import('./nostr');
  return originalForceStatusRefresh();
}

export async function deleteAllJobsAndPackages(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  
  const { deleteAllJobsAndPackages: originalDeleteAllJobsAndPackages } = await import('./nostr');
  return originalDeleteAllJobsAndPackages();
}

export async function forceClearAllData(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  
  const { forceClearAllData: originalForceClearAllData } = await import('./nostr');
  return originalForceClearAllData();
} 
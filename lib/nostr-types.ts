// Event kinds for our application
export const EVENT_KINDS = {
  METADATA: 0, // Standard Nostr metadata
  TEXT_NOTE: 1, // Standard Nostr text note
  PACKAGE: 30001, // Custom event kind for packages
  DELIVERY: 30002, // Custom event kind for deliveries
  JOB: 30003, // Custom event kind for jobs
};

// Package data interface
export interface PackageData {
  // Required fields
  id: string;
  title: string;
  pickupLocation: string;
  destination: string;
  cost: string;
  pubkey: string;
  created_at: number;
  status: 'available' | 'in_transit' | 'delivered' | 'expired';

  // Optional fields
  description?: string;
  courier_pubkey?: string;
  pickup_time?: number;
  delivery_time?: number;
}

// Job data interface
export interface JobData {
  // Required fields
  id: string;
  title: string;
  location: string;
  peopleNeeded: number;
  compensation: string;
  pubkey: string;
  created_at: number;
  status: 'open' | 'in_progress' | 'completed' | 'expired';

  // Optional fields
  description?: string;
  requirements?: string;
  duration?: string;
  contactInfo?: string;
  assignedWorkers?: string[];
}

// Profile data interface
export interface ProfileData {
  pubkey: string;
  name: string;
  displayName: string;
  picture: string;
  followers: number;
  following: number;
  deliveries: number;
  rating: number;
  about?: string;
  website?: string;
  nip05?: string;
}

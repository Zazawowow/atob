import { getUserPubkey } from './nostr';
import type { JobData } from './nostr-types';

// Local storage keys
const JOBS_STORAGE_KEY = 'shared_jobs_v1';
const MY_JOBS_STORAGE_KEY = 'my_jobs_v1';

// Add backup storage keys
const JOBS_BACKUP_KEY = 'shared_jobs_backup_v1';
const MY_JOBS_BACKUP_KEY = 'my_jobs_backup_v1';

// Backup current jobs before any major operation
function backupJobs(): void {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    const jobs = localStorage.getItem(JOBS_STORAGE_KEY);
    const myJobs = localStorage.getItem(MY_JOBS_STORAGE_KEY);
    
    if (jobs) {
      localStorage.setItem(JOBS_BACKUP_KEY, jobs);
    }
    if (myJobs) {
      localStorage.setItem(MY_JOBS_BACKUP_KEY, myJobs);
    }
  } catch (error) {
    console.error('Failed to backup jobs:', error);
  }
}

// Restore from backup if main storage is empty
function restoreFromBackupIfNeeded(): void {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    const jobs = localStorage.getItem(JOBS_STORAGE_KEY);
    const myJobs = localStorage.getItem(MY_JOBS_STORAGE_KEY);
    
    if (!jobs) {
      const backup = localStorage.getItem(JOBS_BACKUP_KEY);
      if (backup) {
        localStorage.setItem(JOBS_STORAGE_KEY, backup);
        console.log('Restored jobs from backup');
      }
    }
    
    if (!myJobs) {
      const backup = localStorage.getItem(MY_JOBS_BACKUP_KEY);
      if (backup) {
        localStorage.setItem(MY_JOBS_STORAGE_KEY, backup);
        console.log('Restored my jobs from backup');
      }
    }
  } catch (error) {
    console.error('Failed to restore from backup:', error);
  }
}

// Get all available jobs from local storage
export function getLocalJobs(): JobData[] {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return [];
    }
    
    restoreFromBackupIfNeeded();
    const jobsJson = localStorage.getItem(JOBS_STORAGE_KEY);
    if (!jobsJson) return [];

    const jobs = JSON.parse(jobsJson) as JobData[];
    backupJobs(); // Backup after successful read

    return jobs;
  } catch (error) {
    console.error('Failed to get local jobs:', error);
    return [];
  }
}

// Get jobs posted by the current user
export function getMyLocalJobs(): JobData[] {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return [];
    }
    
    const myJobsJson = localStorage.getItem(MY_JOBS_STORAGE_KEY);
    if (!myJobsJson) return [];

    return JSON.parse(myJobsJson) as JobData[];
  } catch (error) {
    console.error('Failed to get my local jobs:', error);
    return [];
  }
}

// Save a new job to local storage
export function saveLocalJob(
  jobData: Omit<JobData, 'id' | 'status' | 'pubkey'>
): string {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      throw new Error('localStorage not available');
    }
    
    const jobs = getLocalJobs();

    // Generate a unique ID
    const id = `local-job-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const newJob: JobData = {
      ...jobData,
      id,
      status: 'open',
      pubkey: getUserPubkey(),
    };

    jobs.push(newJob);
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));

    // Also save to my jobs
    const myJobs = getMyLocalJobs();
    myJobs.push(newJob);
    localStorage.setItem(MY_JOBS_STORAGE_KEY, JSON.stringify(myJobs));

    backupJobs();
    return id;
  } catch (error) {
    console.error('Failed to save local job:', error);
    throw new Error('Failed to save job');
  }
}

// Delete a job from local storage
export function deleteLocalJob(jobId: string): void {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    const jobs = getLocalJobs();
    const myJobs = getMyLocalJobs();

    // Remove from all jobs
    const updatedJobs = jobs.filter((job) => job.id !== jobId);
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));

    // Remove from my jobs
    const updatedMyJobs = myJobs.filter((job) => job.id !== jobId);
    localStorage.setItem(MY_JOBS_STORAGE_KEY, JSON.stringify(updatedMyJobs));

    backupJobs();
  } catch (error) {
    console.error('Failed to delete local job:', error);
  }
}

// Get a specific job by ID
export function getLocalJobById(id: string): JobData | null {
  try {
    const jobs = getLocalJobs();
    return jobs.find((job) => job.id === id) || null;
  } catch (error) {
    console.error('Failed to get local job by ID:', error);
    return null;
  }
}

// Update job status
export function updateLocalJobStatus(
  jobId: string,
  status: JobData['status'],
  data?: Partial<JobData>
): void {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    const jobs = getLocalJobs();
    const myJobs = getMyLocalJobs();

    const updateJob = (jobList: JobData[]) => {
      return jobList.map((job) => {
        if (job.id === jobId) {
          return { ...job, status, ...data };
        }
        return job;
      });
    };

    const updatedJobs = updateJob(jobs);
    const updatedMyJobs = updateJob(myJobs);

    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
    localStorage.setItem(MY_JOBS_STORAGE_KEY, JSON.stringify(updatedMyJobs));

    backupJobs();
  } catch (error) {
    console.error('Failed to update local job status:', error);
  }
}

// Apply for a job (add worker to assigned workers)
export function applyForLocalJob(jobId: string, workerPubkey: string): void {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    const jobs = getLocalJobs();
    const myJobs = getMyLocalJobs();

    const updateJob = (jobList: JobData[]) => {
      return jobList.map((job) => {
        if (job.id === jobId) {
          const assignedWorkers = job.assignedWorkers || [];
          if (!assignedWorkers.includes(workerPubkey)) {
            return {
              ...job,
              assignedWorkers: [...assignedWorkers, workerPubkey],
              status: assignedWorkers.length === 0 ? 'in_progress' : job.status,
            };
          }
        }
        return job;
      });
    };

    const updatedJobs = updateJob(jobs);
    const updatedMyJobs = updateJob(myJobs);

    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
    localStorage.setItem(MY_JOBS_STORAGE_KEY, JSON.stringify(updatedMyJobs));

    backupJobs();
  } catch (error) {
    console.error('Failed to apply for local job:', error);
  }
}

// Complete a job
export function completeLocalJob(jobId: string): void {
  try {
    updateLocalJobStatus(jobId, 'completed');
  } catch (error) {
    console.error('Failed to complete local job:', error);
  }
}

// Debug function to check storage
export function debugJobStorage(): void {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log('localStorage not available in this environment');
      return;
    }
    
    console.log('=== Job Storage Debug ===');
    console.log('All jobs:', getLocalJobs());
    console.log('My jobs:', getMyLocalJobs());
    console.log('Storage keys:', {
      jobs: localStorage.getItem(JOBS_STORAGE_KEY),
      myJobs: localStorage.getItem(MY_JOBS_STORAGE_KEY),
    });
  } catch (error) {
    console.error('Debug job storage failed:', error);
  }
} 
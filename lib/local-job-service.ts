import { getUserPubkey } from './nostr';
import type { JobData } from './nostr-types';

// Local storage keys
const JOBS_STORAGE_KEY = 'shared_jobs_v2';
// Remove separate per-user store to avoid duplication and divergence
const MY_JOBS_STORAGE_KEY = 'my_jobs_v2';

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
      // Do not auto-restore a separate my jobs list to avoid divergence
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
    
    // Derive "my jobs" from the shared jobs store to keep a single source of truth
    const all = getLocalJobs();
    const pubkey = getUserPubkey();
    return all.filter(j => j.pubkey === pubkey);
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

    // No separate my jobs write; derive from shared store

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

    // Remove from all jobs
    const updatedJobs = jobs.filter((job) => job.id !== jobId);
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));

    // No separate my jobs store to update

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

    const updateJob = (jobList: JobData[]) => {
      return jobList.map((job) => {
        if (job.id === jobId) {
          return { ...job, status, ...data };
        }
        return job;
      });
    };

    const updatedJobs = updateJob(jobs);

    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
    // No separate my jobs store to update

    backupJobs();
  } catch (error) {
    console.error('Failed to update local job status:', error);
  }
}

// Apply for a job (add worker to applicants)
export function applyForLocalJob(jobId: string, workerPubkey: string): void {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    console.log('applyForLocalJob called with jobId:', jobId, 'workerPubkey:', workerPubkey);
    
    const jobs = getLocalJobs();

    const updateJob = (jobList: JobData[]) => {
      return jobList.map((job) => {
        if (job.id === jobId) {
          const applicants = job.applicants || [];
          console.log('Job', jobId, 'current applicants:', applicants);
          if (!applicants.includes(workerPubkey)) {
            const updatedJob = {
              ...job,
              applicants: [...applicants, workerPubkey],
              // Don't change status automatically - job poster will accept applicant
            };
            console.log('Updated job with new applicants:', updatedJob.applicants);
            return updatedJob;
          } else {
            console.log('Worker already applied to job', jobId);
          }
        }
        return job;
      });
    };

    const updatedJobs = updateJob(jobs);

    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
    // No separate my jobs store to update

    console.log('Job application saved to localStorage');
    backupJobs();
  } catch (error) {
    console.error('Failed to apply for local job:', error);
  }
}

// Accept a job applicant (set acceptedWorker and update status)
export function acceptJobApplicant(jobId: string, workerPubkey: string): void {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    console.log('acceptJobApplicant called with jobId:', jobId, 'workerPubkey:', workerPubkey);
    
    const jobs = getLocalJobs();

    const updateJob = (jobList: JobData[]) => {
      return jobList.map((job) => {
        if (job.id === jobId) {
          const updatedJob = {
            ...job,
            acceptedWorker: workerPubkey,
            status: 'in_progress' as const,
          };
          console.log('Accepted worker for job:', updatedJob);
          return updatedJob;
        }
        return job;
      });
    };

    const updatedJobs = updateJob(jobs);

    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
    console.log('Job applicant acceptance saved to localStorage');
    backupJobs();
  } catch (error) {
    console.error('Failed to accept job applicant:', error);
  }
}

// Reject a job applicant (remove acceptedWorker and revert status)
export function rejectJobApplicant(jobId: string): void {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    console.log('rejectJobApplicant called with jobId:', jobId);
    
    const jobs = getLocalJobs();

    const updateJob = (jobList: JobData[]) => {
      return jobList.map((job) => {
        if (job.id === jobId) {
          const updatedJob = {
            ...job,
            acceptedWorker: undefined,
            status: 'open' as const,
          };
          console.log('Rejected worker for job:', updatedJob);
          return updatedJob;
        }
        return job;
      });
    };

    const updatedJobs = updateJob(jobs);

    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
    console.log('Job applicant rejection saved to localStorage');
    backupJobs();
  } catch (error) {
    console.error('Failed to reject job applicant:', error);
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

// Save an existing job to localStorage (for jobs from Nostr)
export function saveExistingJobToLocal(job: JobData): void {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    const jobs = getLocalJobs();

    // Check if job already exists
    const existingJobIndex = jobs.findIndex(j => j.id === job.id);
    if (existingJobIndex === -1) {
      // Add to all jobs
      jobs.push(job);
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
      console.log('Saved existing job to localStorage:', job.id);
    }

    // Check if it's the user's job and add to my jobs
    // Do not maintain a separate my jobs list; derive when needed

    backupJobs();
  } catch (error) {
    console.error('Failed to save existing job to local:', error);
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
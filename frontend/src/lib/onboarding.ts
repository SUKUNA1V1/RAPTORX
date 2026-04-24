/**
 * Onboarding utilities and state management
 */
import axios from 'axios';

export interface OnboardingDraft {
  step_number: number;
  draft_data: unknown;
}

export interface OnboardingStep {
  step: number;
  title: string;
  description: string;
}

const ONBOARDING_STORAGE_KEY = 'raptorx_onboarding_draft';
const ONBOARDING_STEPS_PREFIX = 'raptorx_onboarding_step_';

export class OnboardingManager {
  /**
   * Save draft to both localStorage and backend
   */
  static async saveDraft(step: number, data: unknown): Promise<void> {
    // Save to localStorage first (offline capability)
    const draft = { step_number: step, draft_data: data };
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(draft));
    
    // Also save step-specific data for multi-step retrieval
    localStorage.setItem(`${ONBOARDING_STEPS_PREFIX}${step}`, JSON.stringify(data));

    // Save to backend
    try {
      await axios.post('/api/onboarding/draft/save', draft);
    } catch (error) {
      console.error('Failed to save draft to backend:', error);
      // Continue anyway - localStorage backup is available
    }
  }

  /**
   * Load draft from localStorage first, then backend
   */
  static async loadDraft(): Promise<OnboardingDraft | null> {
    // Try localStorage first
    const localDraft = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (localDraft) {
      try {
        return JSON.parse(localDraft) as OnboardingDraft;
      } catch {
        // Invalid JSON, continue to backend
      }
    }

    // Try backend
    try {
      const response = await axios.get('/api/onboarding/draft');
      if (response.data) {
        // Cache in localStorage
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(response.data));
        return response.data;
      }
    } catch {
      // No draft available
    }

    return null;
  }

  /**
   * Load all completed steps data at once
   */
  static async loadAllStepsData(): Promise<Record<number, unknown>> {
    const allData: Record<number, unknown> = {};
    
    // Try loading from localStorage first
    for (let step = 1; step <= 7; step++) {
      const stepData = localStorage.getItem(`${ONBOARDING_STEPS_PREFIX}${step}`);
      if (stepData) {
        try {
          allData[step] = JSON.parse(stepData) as unknown;
        } catch {
          // Continue on parse error
        }
      }
    }
    
    // If we have data, return it
    if (Object.keys(allData).length > 0) {
      return allData;
    }
    
    // Try loading from backend
    try {
      const response = await axios.get('/api/onboarding/steps');
      if (response.data && typeof response.data === 'object') {
        return response.data as Record<number, unknown>;
      }
    } catch {
      // Backend endpoint may not exist
    }
    
    return allData;
  }

  /**
   * Load specific step data
   */
  static loadStepData(step: number): unknown | null {
    const stepData = localStorage.getItem(`${ONBOARDING_STEPS_PREFIX}${step}`);
    if (stepData) {
      try {
        return JSON.parse(stepData) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Clear draft from storage
   */
  static clearDraft(): void {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    // Clear all step data
    for (let step = 1; step <= 7; step++) {
      localStorage.removeItem(`${ONBOARDING_STEPS_PREFIX}${step}`);
    }
  }

  /**
   * Get onboarding status
   */
  static async getStatus() {
    return axios.get('/api/onboarding/status');
  }

  /**
   * Submit complete onboarding
   */
  static async submit(steps: Record<string, unknown>) {
    return axios.post('/api/onboarding/submit', steps);
  }

  /**
   * Apply onboarding (create org configuration)
   */
  static async apply(steps: Record<string, unknown>) {
    return axios.post('/api/onboarding/apply', steps);
  }
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { step: 1, title: 'Company Profile', description: 'Basic organization information' },
  { step: 2, title: 'Identity & Roles', description: 'Create initial administrators' },
  { step: 3, title: 'Buildings & Zones', description: 'Define physical infrastructure' },
  { step: 4, title: 'Access Points', description: 'Configure doors and entry points' },
  { step: 5, title: 'Access Policies', description: 'Set access control rules' },
  { step: 6, title: 'Add Users', description: 'Add employees for training data' },
  { step: 7, title: 'Data Settings', description: 'Privacy and data retention' },
  { step: 8, title: 'Review & Apply', description: 'Finalize and create organization' },
];

export const getStepTitle = (step: number): string => {
  const s = ONBOARDING_STEPS.find(s => s.step === step);
  return s ? s.title : `Step ${step}`;
};

export const getStepDescription = (step: number): string => {
  const s = ONBOARDING_STEPS.find(s => s.step === step);
  return s ? s.description : '';
};

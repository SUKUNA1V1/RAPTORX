/**
 * Onboarding utilities and state management
 */
import axios from 'axios';

export interface OnboardingDraft {
  step_number: number;
  draft_data: Record<string, unknown>;
}

export interface OnboardingStep {
  step: number;
  title: string;
  description: string;
}

const ONBOARDING_STORAGE_KEY = 'raptorx_onboarding_draft';

export class OnboardingManager {
  /**
   * Save draft to both localStorage and backend
   */
  static async saveDraft(step: number, data: Record<string, unknown>): Promise<void> {
    // Save to localStorage first (offline capability)
    const draft = { step_number: step, draft_data: data };
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(draft));

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
   * Clear draft from storage
   */
  static clearDraft(): void {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
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
  { step: 6, title: 'Data Settings', description: 'Privacy and data retention' },
  { step: 7, title: 'Review & Apply', description: 'Finalize and create organization' },
];

export const getStepTitle = (step: number): string => {
  const s = ONBOARDING_STEPS.find(s => s.step === step);
  return s ? s.title : `Step ${step}`;
};

export const getStepDescription = (step: number): string => {
  const s = ONBOARDING_STEPS.find(s => s.step === step);
  return s ? s.description : '';
};

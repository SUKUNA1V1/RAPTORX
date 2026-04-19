/**
 * Access Policies/Rules API service
 */
import axios from 'axios';
import type { AccessPolicy } from 'types/onboarding';

const API_BASE = '/api';

export const rulesService = {
  /**
   * Create a new access policy/rule
   */
  async create(data: AccessPolicy) {
    const response = await axios.post(`${API_BASE}/access-policies`, data);
    return response.data as AccessPolicy;
  },

  /**
   * Update an access policy
   */
  async update(id: string, data: Partial<AccessPolicy>) {
    const response = await axios.put(`${API_BASE}/access-policies/${id}`, data);
    return response.data as AccessPolicy;
  },

  /**
   * Delete an access policy
   */
  async delete(id: string) {
    await axios.delete(`${API_BASE}/access-policies/${id}`);
  },

  /**
   * Get all access policies
   */
  async getAll() {
    const response = await axios.get(`${API_BASE}/access-policies`);
    return response.data as AccessPolicy[];
  },

  /**
   * Get a single policy
   */
  async getById(id: string) {
    const response = await axios.get(`${API_BASE}/access-policies/${id}`);
    return response.data as AccessPolicy;
  },

  /**
   * Simulate policy access (dry-run to see who can access what)
   */
  async simulatePolicy(policyId: string) {
    const response = await axios.post(`${API_BASE}/access-policies/${policyId}/simulate`, {});
    return response.data as {
      affected_users: number;
      affected_access_points: number;
      sample_rules: Array<{
        user: string;
        access_point: string;
        allowed: boolean;
      }>;
    };
  },

  /**
   * Get policy recommendations based on common patterns
   */
  async getRecommendations() {
    const response = await axios.get(`${API_BASE}/access-policies/recommendations`);
    return response.data as AccessPolicy[];
  },

  /**
   * Enable/disable dry-run mode (audit mode)
   */
  async setDryRunMode(enabled: boolean) {
    const response = await axios.put(`${API_BASE}/access-policies/dry-run`, {
      enabled,
    });
    return response.data as { dry_run_enabled: boolean };
  },

  /**
   * Get current dry-run mode status
   */
  async getDryRunMode() {
    const response = await axios.get(`${API_BASE}/access-policies/dry-run`);
    return response.data as { dry_run_enabled: boolean };
  },

  /**
   * Template: Create a default set of policies for a standard organization
   */
  async createDefaultPolicies() {
    const response = await axios.post(`${API_BASE}/access-policies/default-set`, {});
    return response.data as AccessPolicy[];
  },
};

/**
 * Access Points API service
 */
import axios from 'axios';
import type { AccessPoint, AccessPointCSVRow, CSVImportResult } from 'types/onboarding';

const API_BASE = '/api';

export const accessPointsService = {
  /**
   * Create a new access point
   */
  async create(data: AccessPoint) {
    const response = await axios.post(`${API_BASE}/access-points`, data);
    return response.data as AccessPoint;
  },

  /**
   * Update an access point
   */
  async update(id: string, data: Partial<AccessPoint>) {
    const response = await axios.put(`${API_BASE}/access-points/${id}`, data);
    return response.data as AccessPoint;
  },

  /**
   * Delete an access point
   */
  async delete(id: string) {
    await axios.delete(`${API_BASE}/access-points/${id}`);
  },

  /**
   * Get all access points
   */
  async getAll() {
    const response = await axios.get(`${API_BASE}/access-points`);
    return response.data as AccessPoint[];
  },

  /**
   * Get a single access point
   */
  async getById(id: string) {
    const response = await axios.get(`${API_BASE}/access-points/${id}`);
    return response.data as AccessPoint;
  },

  /**
   * Bulk import access points from CSV
   * Expects CSV with columns: name, type, building_id, floor_id, room_id, status, required_clearance, is_restricted, ip_address
   */
  async bulkImport(csvData: AccessPointCSVRow[]) {
    const response = await axios.post(`${API_BASE}/access-points/bulk-import`, {
      data: csvData,
    });
    return response.data as CSVImportResult<AccessPoint>;
  },

  /**
   * Validate access points before import
   */
  async validate(data: AccessPointCSVRow[]) {
    const response = await axios.post(`${API_BASE}/access-points/validate`, {
      data,
    });
    return response.data as CSVImportResult<AccessPoint>;
  },

  /**
   * Get access points by building
   */
  async getByBuilding(buildingId: string) {
    const response = await axios.get(`${API_BASE}/access-points`, {
      params: { building_id: buildingId },
    });
    return response.data as AccessPoint[];
  },

  /**
   * Simulate access rule (who can access what)
   */
  async simulateAccess(userId: string, accessPointId: string) {
    const response = await axios.post(`${API_BASE}/access-points/${accessPointId}/simulate-access`, {
      user_id: userId,
    });
    return response.data as { allowed: boolean; reason: string };
  },
};

/**
 * Buildings & Zones API service
 */
import axios from 'axios';
import type { Building, BuildingCSVRow, CSVImportResult } from 'types/onboarding';

const API_BASE = '/api';

export const buildingsService = {
  /**
   * Create a new building
   */
  async createBuilding(data: Building) {
    const response = await axios.post(`${API_BASE}/buildings`, data);
    return response.data as Building;
  },

  /**
   * Update a building
   */
  async updateBuilding(id: string, data: Partial<Building>) {
    const response = await axios.put(`${API_BASE}/buildings/${id}`, data);
    return response.data as Building;
  },

  /**
   * Delete a building
   */
  async deleteBuilding(id: string) {
    await axios.delete(`${API_BASE}/buildings/${id}`);
  },

  /**
   * Get all buildings
   */
  async getBuildings() {
    const response = await axios.get(`${API_BASE}/buildings`);
    return response.data as Building[];
  },

  /**
   * Get a single building
   */
  async getBuilding(id: string) {
    const response = await axios.get(`${API_BASE}/buildings/${id}`);
    return response.data as Building;
  },

  /**
   * Bulk import buildings from CSV
   * Expects columns: building_name, floor_name, zone_name, room_name (optional)
   */
  async bulkImport(csvData: BuildingCSVRow[]) {
    const response = await axios.post(`${API_BASE}/buildings/bulk-import`, {
      data: csvData,
    });
    return response.data as CSVImportResult<Building>;
  },

  /**
   * Validate buildings before import
   */
  async validate(data: BuildingCSVRow[]) {
    const response = await axios.post(`${API_BASE}/buildings/validate`, {
      data,
    });
    return response.data as CSVImportResult<Building>;
  },

  /**
   * Create a floor in a building
   */
  async createFloor(buildingId: string, floorData: { name: string; number?: number }) {
    const response = await axios.post(`${API_BASE}/buildings/${buildingId}/floors`, floorData);
    return response.data;
  },

  /**
   * Create a zone in a floor
   */
  async createZone(buildingId: string, floorId: string, zoneData: { name: string }) {
    const response = await axios.post(
      `${API_BASE}/buildings/${buildingId}/floors/${floorId}/zones`,
      zoneData,
    );
    return response.data;
  },

  /**
   * Create a room in a zone
   */
  async createRoom(
    buildingId: string,
    floorId: string,
    zoneId: string,
    roomData: { name: string },
  ) {
    const response = await axios.post(
      `${API_BASE}/buildings/${buildingId}/floors/${floorId}/zones/${zoneId}/rooms`,
      roomData,
    );
    return response.data;
  },
};

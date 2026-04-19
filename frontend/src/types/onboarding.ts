/**
 * TypeScript types for the enterprise onboarding flow
 */

// Step 1: Company Profile
export interface CompanyProfileData {
  company_name: string;
  industry?: string;
  country?: string;
  timezone?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  compliance_requirements?: string[]; // SOC2, ISO27001, HIPAA, etc.
}

// Step 2: Identity & Roles
export interface AdminUser {
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  temp_password?: string;
}

export interface IdentityRolesData {
  initial_admins: AdminUser[];
  role_mappings?: Record<string, string>;
  integration_type?: 'manual' | 'okta' | 'azuread' | 'ldap' | 'scim';
}

// Step 3: Buildings & Zones
export interface Room {
  name: string;
  zone_id?: string;
}

export interface Zone {
  id?: string;
  name: string;
  floor_id?: string;
  rooms: Room[];
}

export interface Floor {
  id?: string;
  name: string;
  building_id?: string;
  zones: Zone[];
}

export interface Building {
  id?: string;
  name: string;
  address?: string;
  city?: string;
  floors: Floor[];
}

export interface BuildingsZonesData {
  buildings: Building[];
  csv_import_count?: number;
}

// Step 4: Access Points
export interface AccessPoint {
  id?: string;
  name: string;
  type: 'door' | 'reader' | 'gate';
  building_id: string;
  floor_id?: string;
  room_id?: string;
  zone_id?: string;
  status: 'active' | 'inactive' | 'maintenance';
  required_clearance?: number;
  is_restricted: boolean;
  ip_address?: string;
  device_certificate_id?: string;
}

export interface AccessPointsData {
  access_points: AccessPoint[];
  csv_import_count?: number;
}

// Step 5: Access Policies
export interface AccessPolicy {
  id?: string;
  name: string;
  role?: string;
  department?: string;
  min_clearance?: number;
  allowed_days: string[]; // Monday, Tuesday, etc.
  time_start: string; // HH:MM
  time_end: string; // HH:MM
  max_daily_accesses?: number;
  deny_overrides_allow: boolean;
  access_points?: string[]; // IDs
}

export interface AccessPoliciesData {
  policies: AccessPolicy[];
  dry_run_mode: boolean;
}

// Step 6: Data & Baseline
export interface DataBaselineData {
  use_historical_logs: boolean;
  historical_logs_csv?: File;
  privacy_mask_pii: boolean;
  data_retention_days: number;
  start_with_conservative_defaults: boolean;
}

// Step 7: Review & Go Live
export interface ReviewSummary {
  company_profile: CompanyProfileData;
  identity_roles: IdentityRolesData;
  buildings_zones: BuildingsZonesData;
  access_points: AccessPointsData;
  policies: AccessPoliciesData;
  data_baseline: DataBaselineData;
}

export interface OnboardingCompleteResponse {
  success: boolean;
  organization_id: string;
  message: string;
}

// CSV Import types
export interface CSVImportResult<T> {
  valid: T[];
  errors: Array<{
    row: number;
    message: string;
    data: Record<string, unknown>;
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}

export interface BuildingCSVRow {
  building_name: string;
  floor_name: string;
  zone_name: string;
  room_name?: string;
}

export interface AccessPointCSVRow {
  name: string;
  type: string;
  building_name: string;
  floor_name?: string;
  room_name?: string;
  zone_name?: string;
  status: string;
  required_clearance?: string;
  is_restricted: string;
  ip_address?: string;
}

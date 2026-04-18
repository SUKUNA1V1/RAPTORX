import axios from 'axios';

const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = envApiBaseUrl && envApiBaseUrl.trim() ? envApiBaseUrl : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export interface OverviewStats {
  total_accesses_today: number;
  granted_today: number;
  denied_today: number;
  delayed_today: number;
  active_alerts_count: number;
  total_users: number;
  total_access_points: number;
}

export interface AccessLogItem {
  id: number;
  timestamp: string;
  decision: string;
  risk_score: number;
  method?: string;
  badge_id_used?: string;
  user?: {
    first_name: string;
    last_name: string;
    badge_id: string;
    role: string;
  } | null;
  access_point?: {
    name: string;
    building: string;
    room?: string | null;
  } | null;
}

export interface AccessLogsResponse {
  items: AccessLogItem[];
  total: number;
}

export interface AlertItem {
  id: number;
  alert_type: string;
  severity: string;
  status: string;
  created_at: string;
  description: string;
  confidence: number;
  user?: {
    id: number;
    name: string;
    role: string;
  } | null;
  access_point?: {
    id: number;
    name: string;
    building: string;
  } | null;
}

export interface UserItem {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  badge_id: string;
  role: string;
  department?: string;
  clearance_level?: number;
  is_active: boolean;
}

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  badge_id: string;
  role: string;
  department?: string;
  is_active?: boolean;
}

export interface AccessPointItem {
  id: number;
  name: string;
  type: string;
  status: string;
  building: string;
  floor?: string | null;
  room?: string | null;
  zone?: string | null;
  required_clearance?: number;
  is_restricted?: boolean;
}

export interface CreateAccessPointPayload {
  name: string;
  type: string;
  status: string;
  building: string;
  floor?: string;
  room?: string;
  zone?: string;
  required_clearance?: number;
  is_restricted?: boolean;
}

export interface AccessRequestPayload {
  badge_id: string;
  access_point_id: number;
  timestamp?: string;
  method?: string;
}

export interface AccessDecision {
  decision: string;
  risk_score: number;
  if_score?: number | null;
  ae_score?: number | null;
  log_id?: number | null;
  user_name?: string | null;
  access_point_name?: string | null;
  mode?: string | null;
  reasoning?: string | null;
  alert_created: boolean;
}

export interface MlStatus {
  [key: string]: unknown;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  rank?: number;
}

export interface TimelineItem {
  timestamp: string;
  granted: number;
  denied: number;
  delayed: number;
}

export interface MonthlyTimelineItem {
  month: number;
  granted: number;
  denied: number;
  delayed: number;
}

export interface TopAccessPointItem {
  name: string;
  building: string;
  total: number;
  granted: number;
  denied: number;
}

export interface SystemHealth {
  timestamp: string;
  process: {
    cpu_percent: number;
    memory_mb: number;
    threads: number;
  };
  system: {
    cpu_percent: number;
    memory_percent: number;
    memory_available_mb: number;
    disk_percent: number;
  };
}

export const apiClient = {
  getOverview: async () => (await api.get<OverviewStats>('/stats/overview')).data,
  getAccessLogs: async () =>
    (await api.get<AccessLogsResponse>('/access/logs', { params: { limit: 10000 } })).data,
  getAlerts: async (limit = 10000) => (await api.get<AlertItem[]>('/alerts', { params: { limit } })).data,

  getOpenAlertsCount: async (): Promise<number> => {
    const data = await api.get<AlertItem[]>('/alerts', { params: { limit: 10000 } });
    return data.data.filter(a => a.status === 'open').length;
  },
  resolveAlert: async (alertId: number) =>
    (await api.put<{ id: number; status: string; is_resolved: boolean; resolved_at: string }>(`/alerts/${alertId}/resolve`)).data,
  markAlertFalsePositive: async (alertId: number) =>
    (await api.put<{ id: number; status: string; is_resolved: boolean; resolved_at: string }>(`/alerts/${alertId}/false-positive`)).data,
  getUsers: async () => (await api.get<UserItem[]>('/users', { params: { limit: 10000 } })).data,
  createUser: async (payload: CreateUserPayload) =>
    (await api.post<UserItem>('/users', payload)).data,
  updateUser: async (userId: number, payload: CreateUserPayload) =>
    (await api.put<UserItem>(`/users/${userId}`, payload)).data,
  getAccessPoints: async () => (await api.get<AccessPointItem[]>('/access-points')).data,
  createAccessPoint: async (payload: CreateAccessPointPayload) =>
    (await api.post<AccessPointItem>('/access-points', payload)).data,
  updateAccessPoint: async (accessPointId: number, payload: CreateAccessPointPayload) =>
    (await api.put<AccessPointItem>(`/access-points/${accessPointId}`, payload)).data,
  getMlStatus: async () => (await api.get<MlStatus>('/ml/status')).data,
  getFeatureImportance: async () =>
    (await api.get<FeatureImportanceItem[]>('/explainations/feature-importance')).data,
  getModelInsights: async () => (await api.get<Record<string, unknown>>('/explainations/model-insights')).data,
  getDecisionExplanation: async (logId: number) =>
    (await api.get<Record<string, unknown>>(`/explainations/decision/${logId}`)).data,
  getAccessTimeline: async (date?: string) =>
    (await api.get<TimelineItem[]>('/stats/access-timeline', { params: date ? { date } : {} })).data,
  getMonthlyTimeline: async () =>
    (await api.get<MonthlyTimelineItem[]>('/stats/monthly-timeline')).data,
  getTopAccessPoints: async () =>
    (await api.get<TopAccessPointItem[]>('/stats/top-access-points')).data,
  getDatabasePerformance: async () =>
    (await api.get<Record<string, unknown>>('/stats/database-performance')).data,
  getApiPerformance: async () => (await api.get<Record<string, unknown>>('/stats/api-performance')).data,
  getSystemHealth: async () => (await api.get<SystemHealth>('/stats/system-health')).data,
  requestAccess: async (payload: AccessRequestPayload) => (await api.post<AccessDecision>('/access/request', payload)).data,
  
  // Admin endpoints
  getAdminProfile: async (adminId: number) =>
    (await api.get<UserItem>('/admin/profile', { params: { admin_id: adminId } })).data,
  updateAdminUsername: async (adminId: number, newEmail: string) =>
    (await api.put<UserItem>('/admin/profile/username', null, { params: { admin_id: adminId, new_email: newEmail } })).data,
  changeAdminPassword: async (adminId: number, currentPassword: string, newPassword: string) =>
    (await api.put<{ message: string }>('/admin/profile/password', null, {
      params: { admin_id: adminId, current_password: currentPassword, new_password: newPassword }
    })).data,
  listAdmins: async () =>
    (await api.get<UserItem[]>('/admin/list')).data,
  createAdmin: async (email: string, tempPassword: string, role: string, firstName: string = 'Admin', lastName: string = 'User') =>
    (await api.post<UserItem>('/admin', {
      email,
      temp_password: tempPassword,
      role,
      first_name: firstName,
      last_name: lastName
    })).data,
  deleteAdmin: async (adminId: number) =>
    (await api.delete<{ message: string }>(`/admin/${adminId}`)).data,
};

export default api;

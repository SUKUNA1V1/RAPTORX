export type UserRole =
  | "employee"
  | "manager"
  | "admin"
  | "security"
  | "contractor"
  | "visitor";

export type Decision = "granted" | "denied" | "delayed";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type AlertStatus = "open" | "acknowledged" | "resolved" | "false_positive";

export type PointStatus = "active" | "maintenance" | "disabled";

export interface User {
  id: number;
  badge_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  department: string | null;
  clearance_level: number;
  is_active: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export interface AccessPoint {
  id: number;
  name: string;
  type: string;
  building: string;
  floor: string | null;
  room: string | null;
  zone: string | null;
  status: PointStatus;
  required_clearance: number;
  is_restricted: boolean;
  ip_address: string | null;
}

export interface AccessLog {
  id: number;
  user_id: number | null;
  access_point_id: number;
  timestamp: string;
  decision: Decision;
  risk_score: number;
  method: string;
  badge_id_used: string | null;
  hour: number | null;
  day_of_week: number | null;
  is_weekend: boolean;
  access_frequency_24h: number | null;
  time_since_last_access_min: number | null;
  location_match: boolean | null;
  role_level: number | null;
  is_restricted_area: boolean;
  user?: Pick<User, "first_name" | "last_name" | "badge_id" | "role">;
  access_point?: Pick<AccessPoint, "name" | "building" | "room">;
}

export interface AnomalyAlert {
  id: number;
  log_id?: number;
  alert_type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  is_resolved: boolean;
  description?: string | null;
  confidence?: number | null;
  triggered_by?: string | null;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: number | null;
  notes?: string | null;
  log?: AccessLog;
}

export interface AccessRule {
  id: number;
  access_point_id: number;
  role: UserRole | null;
  department: string | null;
  min_clearance: number;
  allowed_days: string;
  time_start: string;
  time_end: string;
  max_daily_accesses: number | null;
  is_active: boolean;
  description: string | null;
}

export interface StatsOverview {
  total_accesses_today: number;
  granted_today: number;
  denied_today: number;
  delayed_today: number;
  active_alerts_count: number;
  total_users: number;
  total_access_points: number;
}

export interface TimelinePoint {
  hour: number;
  granted: number;
  denied: number;
  delayed: number;
}

export interface AnomalyDistItem {
  severity: AlertSeverity;
  count: number;
}

export interface TopAccessPoint {
  name: string;
  building: string;
  total: number;
  granted: number;
  denied: number;
}

export interface MLStatus {
  is_loaded: boolean;
  isolation_forest: boolean;
  autoencoder: boolean;
  if_artifact_found?: boolean;
  ae_artifact_found?: boolean;
  mode: string;
  grant_threshold: number;
  deny_threshold: number;
  if_weight: number;
  ae_weight: number;
}

export interface AccessDecision {
  decision: Decision;
  risk_score: number;
  if_score: number | null;
  ae_score: number | null;
  log_id: number;
  user_name?: string;
  access_point_name?: string;
  mode: string;
  reasoning: string;
  alert_created: boolean;
}

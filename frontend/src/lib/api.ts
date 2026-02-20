import axios, { AxiosError } from "axios";
import type {
  User,
  AccessPoint,
  AccessLog,
  AnomalyAlert,
  StatsOverview,
  TimelinePoint,
  AnomalyDistItem,
  TopAccessPoint,
  MLStatus,
  AccessDecision,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    console.error(`API Error: ${err.config?.url} -> ${err.message}`);
    return Promise.reject(err);
  }
);

export const getHealth = () => api.get("/health").then((r) => r.data);

export const getOverview = () => api.get<StatsOverview>("/api/stats/overview").then((r) => r.data);

export const getTimeline = () => api.get<TimelinePoint[]>("/api/stats/access-timeline").then((r) => r.data);

export const getAnomalyDist = () =>
  api.get<AnomalyDistItem[]>("/api/stats/anomaly-distribution").then((r) => r.data);

export const getTopAccessPoints = () =>
  api.get<TopAccessPoint[]>("/api/stats/top-access-points").then((r) => r.data);

export const getUsers = (params?: {
  role?: string;
  department?: string;
  is_active?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}) => api.get<User[]>("/api/users", { params }).then((r) => r.data);

export const createUser = (data: Partial<User>) => api.post<User>("/api/users", data).then((r) => r.data);

export const updateUser = (id: number, data: Partial<User>) =>
  api.put<User>(`/api/users/${id}`, data).then((r) => r.data);

export const getLogs = (params?: {
  user_id?: number;
  access_point_id?: number;
  decision?: string;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}) => api.get<{ items: AccessLog[]; total: number }>("/api/access/logs", { params }).then((r) => r.data);

export const requestAccess = (data: {
  badge_id: string;
  access_point_id: number;
  timestamp?: string;
  method?: string;
}) => api.post<AccessDecision>("/api/access/request", data).then((r) => r.data);

export const getAlerts = (params?: {
  severity?: string;
  status?: string;
  skip?: number;
  limit?: number;
}) => api.get<AnomalyAlert[]>("/api/alerts", { params }).then((r) => r.data);

export const resolveAlert = (id: number, resolvedBy = 0) =>
  api.put(`/api/alerts/${id}/resolve`, { resolved_by: resolvedBy }).then((r) => r.data);

export const markFalsePositive = (id: number, resolvedBy = 0) =>
  api.put(`/api/alerts/${id}/false-positive`, { resolved_by: resolvedBy }).then((r) => r.data);

export const getAccessPointsList = (params?: { status?: string; building?: string }) =>
  api.get<AccessPoint[]>("/api/access-points", { params }).then((r) => r.data);

export const getMLStatus = () => api.get<MLStatus>("/api/ml/status").then((r) => r.data);

import { api } from "./apiClient";
import type { UserProfile, AuditLog, DataHealthReport, SystemSettings } from "../types";

export async function fetchAdminStats() {
  return await api.get("/api/admin/stats");
}

export async function fetchAdminAnalytics(range = "7d") {
  return await api.get(`/api/admin/analytics?range=${encodeURIComponent(range)}`);
}

export async function fetchAdminUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  provider?: string;
  verified?: string;
  class?: string;
  sort?: string;
  order?: "asc" | "desc";
}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.role) query.set("role", params.role);
  if (params.status) query.set("status", params.status);
  if (params.provider) query.set("provider", params.provider);
  if (params.verified) query.set("verified", params.verified);
  if (params.class) query.set("class", params.class);
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);

  return await api.get(`/api/admin/users?${query.toString()}`);
}

export async function fetchAdminUserDetail(uid: string, subLimit?: number, logLimit?: number) {
  const query = new URLSearchParams();
  if (subLimit) query.set("subLimit", String(subLimit));
  if (logLimit) query.set("logLimit", String(logLimit));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return await api.get(`/api/admin/users/${encodeURIComponent(uid)}${qs}`);
}

export async function updateAdminUser(uid: string, updates: Partial<UserProfile>) {
  return await api.patch(`/api/admin/users/${encodeURIComponent(uid)}`, updates);
}

export async function approveUserAccount(uid: string) {
  return await api.post(`/api/admin/users/${encodeURIComponent(uid)}/approve`);
}

export async function suspendUserAccount(uid: string, reason?: string) {
  return await api.post(`/api/admin/users/${encodeURIComponent(uid)}/suspend`, { reason });
}

export async function reactivateUserAccount(uid: string) {
  return await api.post(`/api/admin/users/${encodeURIComponent(uid)}/reactivate`);
}

export async function deleteUserAccount(uid: string) {
  return await api.delete(`/api/admin/users/${encodeURIComponent(uid)}`);
}

export async function bulkUserOperation(action: string, uids: string[], payload?: any) {
  return await api.post(`/api/admin/users/bulk`, { action, uids, payload });
}

export async function fetchDataHealth(): Promise<DataHealthReport> {
  return await api.get<DataHealthReport>(`/api/admin/data-health`);
}

export async function scanDataHealth(): Promise<DataHealthReport> {
  return await api.post<DataHealthReport>(`/api/admin/data-health/scan`);
}

export async function repairDataHealth(issueIds?: string[], dryRun = true) {
  return await api.post(`/api/admin/data-health/repair`, { issueIds, dryRun });
}

export async function fetchAuditLogs(params: { limit?: number; action?: string; actor?: string }) {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.action) query.set("action", params.action);
  if (params.actor) query.set("actor", params.actor);

  return await api.get(`/api/admin/audit-logs?${query.toString()}`);
}

export async function fetchSystemHealth() {
  return await api.get(`/api/admin/system-health`);
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  return await api.get<SystemSettings>(`/api/admin/settings`);
}

export async function updateSystemSettings(settings: Partial<SystemSettings>) {
  return await api.put(`/api/admin/settings`, settings);
}

import axios from "axios";
import type { DashboardData, StageBreakdown, Deal, ManagerStats, ChannelStats, Period } from "../types";

const api = axios.create({ baseURL: "/api" });

export async function fetchDashboard(period: Period): Promise<DashboardData> {
  const { data } = await api.get("/dashboard", { params: { period } });
  return data;
}

export async function fetchStages(period: Period): Promise<{ stages: StageBreakdown[]; period: string }> {
  const { data } = await api.get("/stages", { params: { period } });
  return data;
}

export async function fetchProblemDeals(params: {
  min_days_stale?: number;
  manager_id?: number | null;
  stage?: string | null;
  channel?: string | null;
  sort_by?: string;
}): Promise<{ deals: Deal[]; total_count: number; total_amount: number }> {
  const { data } = await api.get("/deals/problems", { params });
  return data;
}

export async function fetchDeals(params: {
  status?: string;
  stage?: string;
  manager_id?: number;
}): Promise<{ deals: Deal[]; total_count: number }> {
  const { data } = await api.get("/deals", { params });
  return data;
}

export async function fetchManagers(period: Period): Promise<{ managers: ManagerStats[]; period: string }> {
  const { data } = await api.get("/deals/managers", { params: { period } });
  return data;
}

export async function fetchChannels(period: Period): Promise<{ channels: ChannelStats[]; period: string }> {
  const { data } = await api.get("/deals/channels", { params: { period } });
  return data;
}

export async function fetchMeta(): Promise<{
  managers: { id: number; name: string }[];
  channels: string[];
}> {
  const [mgrs, chs] = await Promise.all([
    api.get("/meta/managers"),
    api.get("/meta/channels"),
  ]);
  return { managers: mgrs.data, channels: chs.data };
}

export type Period = "month" | "quarter" | "all";

export interface FunnelStage {
  stage: string;
  deals_count: number;
  total_amount: number;
  conversion_to_next: number | null;
}

export interface MoneySummary {
  total_active: number;
  total_active_count: number;
  total_won: number;
  total_won_count: number;
  total_lost: number;
  total_lost_count: number;
}

export interface PlanFact {
  plan: number;
  fact: number;
  percentage: number;
}

export interface DashboardData {
  funnel: FunnelStage[];
  money_summary: MoneySummary;
  plan_fact: PlanFact;
  period: string;
}

export interface StageBreakdown {
  stage: string;
  active_count: number;
  active_amount: number;
  won_count: number;
  won_amount: number;
  lost_count: number;
  lost_amount: number;
  lost_revenue: number;
  conversion_to_next: number | null;
  avg_days_in_stage: number;
}

export interface Deal {
  id: number;
  client_name: string;
  stage: string;
  amount: number;
  status: string;
  manager_name: string;
  manager_id: number;
  channel: string;
  last_activity_at: string;
  days_stale: number;
  has_next_step: boolean;
  is_important: boolean;
  risk_reasons: string[];
}

export interface ManagerStats {
  manager_id: number;
  manager_name: string;
  total_deals: number;
  won_count: number;
  won_amount: number;
  lost_count: number;
  lost_amount: number;
  active_count: number;
  active_amount: number;
  conversion_pct: number;
  avg_stale_days: number;
}

export interface ChannelStats {
  channel: string;
  total_leads: number;
  won_count: number;
  won_amount: number;
  lost_count: number;
  lost_amount: number;
  conversion_pct: number;
  avg_deal_amount: number;
}

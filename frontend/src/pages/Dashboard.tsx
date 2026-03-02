import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { fetchDashboard } from "../api/client";
import PeriodFilter from "../components/PeriodFilter";
import type { DashboardData, Period } from "../types";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} тыс ₽`;
  return `${n} ₽`;
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}М`;
  return `${(n / 1_000).toFixed(0)}K`;
}

const STAGE_COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#f0f4ff"];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { stage: string; deals_count: number; conversion_to_next: number | null } }>;
}

function FunnelTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800">{d.stage}</p>
      <p className="text-slate-600">{d.deals_count} сделок</p>
      <p className="text-brand-600 font-medium">{fmt(payload[0].value)}</p>
      {d.conversion_to_next !== null && (
        <p className="text-slate-500 text-xs mt-1">Конверсия далее: {d.conversion_to_next}%</p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDashboard(period)
      .then(setData)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (!data) return null;

  const { funnel, money_summary: ms, plan_fact: pf } = data;
  const pct = Math.min(pf.percentage, 100);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Дашборд</h1>
          <p className="text-sm text-slate-500 mt-0.5">Воронка, деньги в CRM и план/факт</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Money cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">В активной воронке</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{fmt(ms.total_active)}</p>
          <p className="text-sm text-slate-500 mt-1">{ms.total_active_count} активных сделок</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Закрыто (выиграно)</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{fmt(ms.total_won)}</p>
          <p className="text-sm text-slate-500 mt-1">{ms.total_won_count} сделок за период</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Потеряно</p>
          <p className="text-3xl font-bold text-red-500 mt-2">{fmt(ms.total_lost)}</p>
          <p className="text-sm text-slate-500 mt-1">{ms.total_lost_count} сделок за период</p>
        </div>
      </div>

      {/* Plan / Fact */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">План / Факт</p>
            <p className="text-lg font-semibold text-slate-900 mt-0.5">
              {fmt(pf.fact)}{" "}
              <span className="text-slate-400 font-normal">из {fmt(pf.plan)}</span>
            </p>
          </div>
          <div
            className={`text-3xl font-bold ${
              pf.percentage >= 80 ? "text-emerald-600" : pf.percentage >= 50 ? "text-amber-500" : "text-red-500"
            }`}
          >
            {pf.percentage}%
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1.5">
          <span>0</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Funnel chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Воронка продаж</h2>
        <p className="text-xs text-slate-500 mb-5">Текущий активный пайплайн — сколько денег на каждом этапе прямо сейчас</p>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={funnel}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            barSize={48}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="stage"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtShort}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<FunnelTooltip />} />
            <Bar dataKey="total_amount" radius={[6, 6, 0, 0]}>
              {funnel.map((_, index) => (
                <Cell key={index} fill={STAGE_COLORS[index] || "#e0e7ff"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Conversion badges */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {funnel.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
              <span className="font-medium">{s.stage}</span>
              <span className="text-slate-400">{s.deals_count} шт</span>
              {s.conversion_to_next !== null && (
                <span className="text-brand-600 font-semibold">→ {s.conversion_to_next}%</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

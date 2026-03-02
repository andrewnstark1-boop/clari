import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

interface Summary {
  sessions_today: number;
  sessions_7d: number;
  sessions_30d: number;
  total_page_views_30d: number;
  avg_session_duration_seconds: number;
  daily_sessions: { date: string; sessions: number }[];
  page_stats: { page: string; label: string; views: number; avg_time_seconds: number }[];
  period_usage: Record<string, number>;
  filter_usage: { filter: string; count: number }[];
}

function fmtTime(seconds: number): string {
  if (seconds < 60) return `${seconds}с`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}м ${s}с` : `${m}м`;
}

function fmtDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

const PAGE_COLORS = ["#6366f1", "#818cf8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const FILTER_LABELS: Record<string, string> = {
  manager: "Менеджер",
  stage: "Этап",
  channel: "Канал",
  min_days: "Дней без активности",
};

const PERIOD_LABELS: Record<string, string> = {
  month: "Месяц",
  quarter: "Квартал",
  all: "Всё время",
};

export default function Analytics() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/analytics/summary")
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка...</div>;
  }
  if (!data) return null;

  const totalPeriodUsage = Object.values(data.period_usage).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Продуктовая аналитика</h1>
        <p className="text-sm text-slate-500 mt-0.5">Как пользователи работают с Клари — данные за 30 дней</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Сессий сегодня", value: data.sessions_today, sub: "уникальных визитов", color: "text-brand-600" },
          { label: "Сессий за 7 дней", value: data.sessions_7d, sub: "уникальных визитов", color: "text-slate-900" },
          { label: "Сессий за 30 дней", value: data.sessions_30d, sub: "уникальных визитов", color: "text-slate-900" },
          { label: "Ср. длина сессии", value: fmtTime(data.avg_session_duration_seconds), sub: "суммарно по страницам", color: "text-slate-900" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Daily sessions chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Сессии по дням (последние 30 дней)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.daily_sessions} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              labelFormatter={(v) => fmtDate(String(v))}
              formatter={(v: number) => [`${v} сессий`]}
            />
            <Line
              type="monotone"
              dataKey="sessions"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Page stats + period usage side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* Page popularity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Популярность страниц</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data.page_stats}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              barSize={18}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip formatter={(v: number) => [`${v} просм.`]} />
              <Bar dataKey="views" radius={[0, 4, 4, 0]}>
                {data.page_stats.map((_, i) => (
                  <Cell key={i} fill={PAGE_COLORS[i % PAGE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg time on page */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Среднее время на странице</h2>
          <p className="text-xs text-slate-400 mb-4">Где пользователи проводят больше всего времени</p>
          <div className="space-y-3">
            {[...data.page_stats]
              .sort((a, b) => b.avg_time_seconds - a.avg_time_seconds)
              .map((p, i) => {
                const maxTime = Math.max(...data.page_stats.map((x) => x.avg_time_seconds), 1);
                const pct = (p.avg_time_seconds / maxTime) * 100;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{p.label}</span>
                      <span className="text-slate-500 font-medium">{fmtTime(p.avg_time_seconds)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PAGE_COLORS[i % PAGE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Period filter usage + Problem deals filters */}
      <div className="grid grid-cols-2 gap-4">
        {/* Period filter */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Фильтр периода — что выбирают</h2>
          <p className="text-xs text-slate-400 mb-4">Насколько CEO смотрят в прошлое</p>
          {totalPeriodUsage === 0 ? (
            <p className="text-sm text-slate-400">Нет данных</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.period_usage)
                .sort(([, a], [, b]) => b - a)
                .map(([period, count]) => {
                  const pct = (count / totalPeriodUsage) * 100;
                  return (
                    <div key={period}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{PERIOD_LABELS[period] ?? period}</span>
                        <span className="text-slate-500">{count} раз ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Filters on problem deals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Фильтры на «Под риском»</h2>
          <p className="text-xs text-slate-400 mb-4">По каким критериям CEO ищет проблемные сделки</p>
          {data.filter_usage.length === 0 ? (
            <p className="text-sm text-slate-400">Нет данных</p>
          ) : (
            <div className="space-y-2">
              {data.filter_usage.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm font-medium text-slate-700">
                    {FILTER_LABELS[f.filter] ?? f.filter}
                  </span>
                  <span className="text-sm font-semibold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-lg">
                    {f.count} применений
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center pb-2">
        Данные собираются автоматически при навигации пользователей по Клари
      </p>
    </div>
  );
}

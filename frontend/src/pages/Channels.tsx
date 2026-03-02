import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { fetchChannels } from "../api/client";
import PeriodFilter from "../components/PeriodFilter";
import type { ChannelStats, Period } from "../types";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`;
  return `${(n / 1_000).toFixed(0)} тыс ₽`;
}

export default function Channels() {
  const [period, setPeriod] = useState<Period>("month");
  const [channels, setChannels] = useState<ChannelStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchChannels(period)
      .then((d) => setChannels(d.channels))
      .finally(() => setLoading(false));
  }, [period]);

  const chartData = channels.map((c) => ({
    name: c.channel,
    Выиграно: Math.round(c.won_amount / 1_000_000),
    Потеряно: Math.round(c.lost_amount / 1_000_000),
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Каналы</h1>
          <p className="text-sm text-slate-500 mt-0.5">Откуда приходят деньги, а откуда сливается бюджет</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Загрузка...</div>
      ) : (
        <>
          {/* Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Выиграно vs Потеряно по каналам, млн ₽</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={28} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [`${v} млн ₽`]} />
                <Legend />
                <Bar dataKey="Выиграно" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Потеряно" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Канал</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Лидов</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Сделок</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Выручка</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ср. чек</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Потеряно</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Конв.</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{c.channel}</td>
                    <td className="px-4 py-3.5 text-right text-slate-600">{c.total_leads}</td>
                    <td className="px-4 py-3.5 text-right text-slate-600">{c.won_count}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">{fmt(c.won_amount)}</td>
                    <td className="px-4 py-3.5 text-right text-slate-600">{fmt(c.avg_deal_amount)}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-red-500">{fmt(c.lost_amount)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={`font-bold ${
                          c.conversion_pct >= 20 ? "text-emerald-600" : c.conversion_pct >= 10 ? "text-amber-600" : "text-red-600"
                        }`}
                      >
                        {c.conversion_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { fetchStages } from "../api/client";
import PeriodFilter from "../components/PeriodFilter";
import type { StageBreakdown, Period } from "../types";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} тыс ₽`;
  return `${n} ₽`;
}

function LostBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-red-600 w-28 text-right shrink-0">{fmt(value)}</span>
    </div>
  );
}

export default function Stages() {
  const [period, setPeriod] = useState<Period>("month");
  const [stages, setStages] = useState<StageBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchStages(period)
      .then((d) => setStages(d.stages))
      .finally(() => setLoading(false));
  }, [period]);

  const maxLost = Math.max(...stages.map((s) => s.lost_revenue), 1);
  const totalLost = stages.reduce((a, s) => a + s.lost_revenue, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Разрез по этапам</h1>
          <p className="text-sm text-slate-500 mt-0.5">Где именно теряются деньги — отсортировано по упущенной выручке</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Summary */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-4">
        <div className="text-3xl">💸</div>
        <div>
          <p className="text-sm text-red-700 font-medium">Всего упущенной выручки за период</p>
          <p className="text-3xl font-bold text-red-600">{fmt(totalLost)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Этап</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Активных</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Выиграно</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Конверсия →</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ср. дней</th>
                <th className="px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wide">Упущено ↓</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-800">{s.stage}</span>
                    <span className="ml-2 text-xs text-slate-400">{s.active_count} сделок</span>
                  </td>
                  <td className="px-4 py-4 text-right text-slate-700">{fmt(s.active_amount)}</td>
                  <td className="px-4 py-4 text-right text-emerald-600 font-medium">{fmt(s.won_amount)}</td>
                  <td className="px-4 py-4 text-right">
                    {s.conversion_to_next !== null ? (
                      <span
                        className={`font-semibold ${
                          s.conversion_to_next >= 60
                            ? "text-emerald-600"
                            : s.conversion_to_next >= 40
                            ? "text-amber-500"
                            : "text-red-500"
                        }`}
                      >
                        {s.conversion_to_next}%
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right text-slate-500">{s.avg_days_in_stage} дн</td>
                  <td className="px-4 py-4 min-w-[220px]">
                    <LostBar value={s.lost_revenue} max={maxLost} />
                    <p className="text-xs text-slate-400 mt-0.5">{s.lost_count} сделок</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

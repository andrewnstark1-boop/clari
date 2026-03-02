import { useEffect, useState } from "react";
import { fetchManagers } from "../api/client";
import PeriodFilter from "../components/PeriodFilter";
import type { ManagerStats, Period } from "../types";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`;
  return `${(n / 1_000).toFixed(0)} тыс ₽`;
}

function ConvBadge({ v }: { v: number }) {
  const color = v >= 25 ? "text-emerald-600 bg-emerald-50" : v >= 15 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${color}`}>{v}%</span>;
}

export default function Managers() {
  const [period, setPeriod] = useState<Period>("month");
  const [managers, setManagers] = useState<ManagerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchManagers(period)
      .then((d) => setManagers(d.managers))
      .finally(() => setLoading(false));
  }, [period]);

  const maxWon = Math.max(...managers.map((m) => m.won_amount), 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Менеджеры</h1>
          <p className="text-sm text-slate-500 mt-0.5">Кто зарабатывает, а кто теряет больше всего денег</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {managers.map((m, i) => {
            const barPct = maxWon > 0 ? (m.won_amount / maxWon) * 100 : 0;
            return (
              <div key={m.manager_id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{m.manager_name}</p>
                      <p className="text-xs text-slate-500">{m.total_deals} сделок всего</p>
                    </div>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div>
                      <p className="text-xs text-slate-400">Выиграно</p>
                      <p className="font-bold text-emerald-600">{fmt(m.won_amount)}</p>
                      <p className="text-xs text-slate-400">{m.won_count} сделок</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Потеряно</p>
                      <p className="font-bold text-red-500">{fmt(m.lost_amount)}</p>
                      <p className="text-xs text-slate-400">{m.lost_count} сделок</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Конверсия</p>
                      <ConvBadge v={m.conversion_pct} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Ср. просрочка</p>
                      <p
                        className={`font-semibold text-sm ${
                          m.avg_stale_days >= 14 ? "text-red-500" : m.avg_stale_days >= 7 ? "text-amber-500" : "text-slate-600"
                        }`}
                      >
                        {m.avg_stale_days} дн
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Выручка</span>
                    <span>{fmt(m.won_amount)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${barPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

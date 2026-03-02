import { useEffect, useState } from "react";
import { fetchProblemDeals, fetchMeta } from "../api/client";
import type { Deal } from "../types";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`;
  return `${(n / 1_000).toFixed(0)} тыс ₽`;
}

function RiskBadge({ reason }: { reason: string }) {
  let color = "bg-slate-100 text-slate-600";
  if (reason.startsWith("Нет активности")) color = "bg-red-100 text-red-700";
  else if (reason.startsWith("Нет next step")) color = "bg-amber-100 text-amber-700";
  else if (reason.startsWith("Важный")) color = "bg-purple-100 text-purple-700";
  else if (reason.startsWith("Крупная")) color = "bg-blue-100 text-blue-700";
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-md font-medium ${color}`}>
      {reason}
    </span>
  );
}

export default function ProblemDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [minDays, setMinDays] = useState(7);
  const [managerId, setManagerId] = useState<number | null>(null);
  const [stage, setStage] = useState("");
  const [channel, setChannel] = useState("");
  const [sortBy, setSortBy] = useState("amount");

  const [managers, setManagers] = useState<{ id: number; name: string }[]>([]);
  const [channels, setChannels] = useState<string[]>([]);

  useEffect(() => {
    fetchMeta().then((m) => {
      setManagers(m.managers);
      setChannels(m.channels);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchProblemDeals({
      min_days_stale: minDays,
      manager_id: managerId,
      stage: stage || null,
      channel: channel || null,
      sort_by: sortBy,
    })
      .then((d) => {
        setDeals(d.deals);
        setTotalAmount(d.total_amount);
      })
      .finally(() => setLoading(false));
  }, [minDays, managerId, stage, channel, sortBy]);

  const STAGES = ["Заявка", "Контакт", "Показ", "Бронь", "Ипотека", "Сделка"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Сделки под риском</h1>
          <p className="text-sm text-slate-500 mt-0.5">Забытые, без next step и крупные — готовый список для РОПа</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm text-amber-700 font-medium">Сделок под риском</p>
          <p className="text-4xl font-bold text-amber-600 mt-1">{deals.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="text-sm text-red-700 font-medium">Денег под риском</p>
          <p className="text-4xl font-bold text-red-600 mt-1">{fmt(totalAmount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Без активности, дней</label>
            <select
              value={minDays}
              onChange={(e) => setMinDays(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value={3}>≥ 3 дней</option>
              <option value={7}>≥ 7 дней</option>
              <option value={14}>≥ 14 дней</option>
              <option value={30}>≥ 30 дней</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Менеджер</label>
            <select
              value={managerId ?? ""}
              onChange={(e) => setManagerId(e.target.value ? Number(e.target.value) : null)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Все менеджеры</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Этап</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Все этапы</option>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Канал</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Все каналы</option>
              {channels.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Сортировка</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="amount">По сумме ↓</option>
              <option value="last_activity">По дате активности ↑</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Этап</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Сумма</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Менеджер</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Без активности</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Риски</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {d.is_important && <span title="Важный клиент">⭐</span>}
                      <span className="font-medium text-slate-800">{d.client_name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{d.channel}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs bg-slate-100 text-slate-700 rounded px-2 py-0.5 font-medium">{d.stage}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900">{fmt(d.amount)}</td>
                  <td className="px-4 py-3.5 text-slate-600">{d.manager_name}</td>
                  <td className="px-4 py-3.5 text-right">
                    <span
                      className={`font-semibold ${
                        d.days_stale >= 30
                          ? "text-red-600"
                          : d.days_stale >= 14
                          ? "text-amber-600"
                          : "text-slate-600"
                      }`}
                    >
                      {d.days_stale} дн
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {d.risk_reasons.map((r, i) => (
                        <RiskBadge key={i} reason={r} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {deals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Нет проблемных сделок по выбранным фильтрам
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

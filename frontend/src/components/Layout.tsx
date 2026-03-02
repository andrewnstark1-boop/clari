import { NavLink, Outlet } from "react-router-dom";
import { useAnalytics } from "../hooks/useAnalytics";

const nav = [
  { to: "/", label: "Дашборд", icon: "📊" },
  { to: "/stages", label: "Этапы", icon: "🔍" },
  { to: "/problems", label: "Под риском", icon: "⚠️" },
  { to: "/managers", label: "Менеджеры", icon: "👥" },
  { to: "/channels", label: "Каналы", icon: "📡" },
  { to: "/analytics", label: "Аналитика", icon: "🧪" },
];

export default function Layout() {
  useAnalytics(); // tracks page views + time on page automatically

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-100">
          <span className="text-xl font-bold text-brand-600 tracking-tight">Клари</span>
          <p className="text-xs text-slate-400 mt-0.5">CRM-аналитика</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">Данные: март 2026</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

import type { Period } from "../types";

interface Props {
  value: Period;
  onChange: (p: Period) => void;
}

const options: { value: Period; label: string }[] = [
  { value: "month", label: "Месяц" },
  { value: "quarter", label: "Квартал" },
  { value: "all", label: "Всё время" },
];

export default function PeriodFilter({ value, onChange }: Props) {
  return (
    <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-brand-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

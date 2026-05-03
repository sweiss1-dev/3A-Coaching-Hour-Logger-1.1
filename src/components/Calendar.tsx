import { useMemo, useState } from "react";

type Props = {
  /** YYYY-MM-DD or null */
  selected: string | null;
  onSelect: (date: string) => void;
  /** Map of YYYY-MM-DD → total hours that day, used to mark logged days */
  logged: Record<string, number>;
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar({ selected, onSelect, logged }: Props) {
  const today = new Date();
  const initial = selected ? new Date(selected + "T00:00:00") : today;
  const [view, setView] = useState<{ year: number; month: number }>({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });

  const grid = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(view.year, view.month, d) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [view.year, view.month]);

  const todayStr = ymd(today);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() =>
            setView(view.month === 0
              ? { year: view.year - 1, month: 11 }
              : { year: view.year, month: view.month - 1 })
          }
          className="p-2 hover:bg-slate-100 rounded-md text-slate-600"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="font-semibold">
          {MONTHS[view.month]} {view.year}
        </div>
        <button
          type="button"
          onClick={() =>
            setView(view.month === 11
              ? { year: view.year + 1, month: 0 }
              : { year: view.year, month: view.month + 1 })
          }
          className="p-2 hover:bg-slate-100 rounded-md text-slate-600"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1 text-xs font-medium text-slate-500">
        {DOW.map((d) => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, i) => {
          if (!cell.date) return <div key={i} />;
          const dStr = ymd(cell.date);
          const isToday = dStr === todayStr;
          const isSelected = dStr === selected;
          const hasHours = logged[dStr] && logged[dStr] > 0;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(dStr)}
              className={[
                "aspect-square rounded-md text-sm flex flex-col items-center justify-center transition relative",
                isSelected
                  ? "bg-slate-900 text-white"
                  : isToday
                  ? "bg-slate-100 text-slate-900 hover:bg-slate-200"
                  : "hover:bg-slate-100 text-slate-700",
              ].join(" ")}
            >
              <span>{cell.date.getDate()}</span>
              {hasHours && (
                <span
                  className={`mt-0.5 text-[10px] leading-none ${
                    isSelected ? "text-emerald-300" : "text-emerald-600"
                  }`}
                >
                  {logged[dStr].toFixed(1)}h
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

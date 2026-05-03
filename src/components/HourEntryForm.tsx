import { useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  userId: string;
  date: string; // YYYY-MM-DD
  onSaved: () => void;
};

function diffHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return Math.max(0, (endMin - startMin) / 60);
}

export default function HourEntryForm({ userId, date, onSaved }: Props) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hours = diffHours(start, end);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (hours <= 0) {
      setError("End time must be after start time.");
      return;
    }
    setBusy(true);
    const { error: insertErr } = await supabase.from("hours").insert({
      user_id: userId,
      work_date: date,
      start_time: start,
      end_time: end,
      hours,
    });
    setBusy(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={save} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <div className="text-sm text-slate-500 mb-3">
        Logging hours for <span className="font-medium text-slate-900">{date}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Start time</label>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
            className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">End time</label>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
            className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </div>
      </div>
      <div className="mt-3 text-sm text-slate-600">
        Total: <span className="font-semibold text-slate-900">{hours.toFixed(2)} hours</span>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white rounded-md py-2 font-medium disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save entry"}
      </button>
    </form>
  );
}

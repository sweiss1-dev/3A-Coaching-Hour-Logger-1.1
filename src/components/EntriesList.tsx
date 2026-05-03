import { supabase, type HourEntry } from "../lib/supabase";

type Props = {
  entries: HourEntry[];
  onChanged: () => void;
};

export default function EntriesList({ entries, onChanged }: Props) {
  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("hours").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    onChanged();
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 text-sm text-slate-500">
        No entries yet. Pick a date on the calendar to log your first hours.
      </div>
    );
  }

  const total = entries.reduce((sum, e) => sum + Number(e.hours), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
        <h3 className="font-semibold">Recent entries</h3>
        <div className="text-sm text-slate-500">
          Total: <span className="font-semibold text-slate-900">{total.toFixed(2)}h</span>
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {entries.map((e) => (
          <li key={e.id} className="px-5 py-3 flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">{e.work_date}</div>
              <div className="text-slate-500">
                {e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)} · {Number(e.hours).toFixed(2)}h
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(e.id)}
              className="text-slate-400 hover:text-red-600 text-xs"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

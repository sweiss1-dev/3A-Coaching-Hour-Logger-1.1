import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type HourEntry } from "../lib/supabase";
import Calendar from "./Calendar";
import HourEntryForm from "./HourEntryForm";
import EntriesList from "./EntriesList";
import AdminDashboard from "./AdminDashboard";

const ADMIN_EMAIL = "f.sweiss7@gmail.com";
//\\=======================================\\//
// Change this whatever Email you'd like to be the administrator.
// In this case, threeacoaching@gmail.com
//\\=======================================\\//
type Props = { session: Session };

export default function Dashboard({ session }: Props) {
  if (session.user.email === ADMIN_EMAIL) {
    return <AdminDashboard session={session} />;
  }
  const [entries, setEntries] = useState<HourEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = session.user.id;
  const fullName =
    (session.user.user_metadata?.full_name as string | undefined) ??
    session.user.email ??
    "User";

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hours")
      .select("*")
      .eq("user_id", userId)
      .order("work_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(100);
    if (!error && data) setEntries(data as HourEntry[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const loggedMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      map[e.work_date] = (map[e.work_date] ?? 0) + Number(e.hours);
    }
    return map;
  }, [entries]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">3A Coaching — Hour Logger</div>
            <div className="text-xs text-slate-500">Signed in as {fullName}</div>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md px-3 py-1.5"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Calendar
            selected={selected}
            onSelect={setSelected}
            logged={loggedMap}
          />
          {selected && (
            <HourEntryForm
              userId={userId}
              date={selected}
              onSaved={() => {
                loadEntries();
              }}
            />
          )}
        </div>

        <div>
          {loading ? (
            <div className="text-sm text-slate-500">Loading entries…</div>
          ) : (
            <EntriesList entries={entries} onChanged={loadEntries} />
          )}
        </div>
      </main>
    </div>
  );
}

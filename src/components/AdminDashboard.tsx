import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type HourEntry, type Profile } from "../lib/supabase";

type Props = { session: Session };

type UserHours = {
  profile: Profile;
  entries: HourEntry[];
  total: number;
};

export default function AdminDashboard({ session }: Props) {
  const [data, setData] = useState<UserHours[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .order("full_name");

      const { data: hours } = await supabase
        .from("hours")
        .select("*")
        .order("work_date", { ascending: false });

      const profileList = (profiles ?? []) as Profile[];
      const hoursList = (hours ?? []) as HourEntry[];

      const result: UserHours[] = profileList.map((p) => {
        const entries = hoursList.filter((h) => h.user_id === p.id);
        const total = entries.reduce((sum, e) => sum + Number(e.hours), 0);
        return { profile: p, entries, total };
      });

      setData(result);
      setLoading(false);
    }
    load();
  }, []);

  const grandTotal = data.reduce((sum, u) => sum + u.total, 0);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  async function sendEmail() {
    setSending(true);
    setSendMsg(null);
    const { error } = await supabase.functions.invoke("send-biweekly-report");
    setSending(false);
    if (error) {
      setSendMsg("Failed: " + error.message);
    } else {
      setSendMsg("Email sent successfully!");
      // Reload since hours get cleared after send
      setData([]);
      setLoading(true);
      const { data: profiles } = await supabase.from("profiles").select("id,full_name,email").order("full_name");
      const { data: hours } = await supabase.from("hours").select("*").order("work_date", { ascending: false });
      const profileList = (profiles ?? []) as Profile[];
      const hoursList = (hours ?? []) as HourEntry[];
      setData(profileList.map((p) => {
        const entries = hoursList.filter((h) => h.user_id === p.id);
        const total = entries.reduce((sum, e) => sum + Number(e.hours), 0);
        return { profile: p, entries, total };
      }));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">3A Coaching — Admin View</div>
            <div className="text-xs text-slate-500">All employee hours</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Grand total: <span className="font-semibold text-slate-900">{grandTotal.toFixed(2)}h</span>
            </span>
            {sendMsg && <span className={`text-xs ${sendMsg.startsWith("Failed") ? "text-red-600" : "text-emerald-600"}`}>{sendMsg}</span>}
            <button
              onClick={sendEmail}
              disabled={sending}
              className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-3 py-1.5 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send email now"}
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md px-3 py-1.5"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="text-sm text-slate-500">Loading all hours…</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-slate-500">No employees found.</div>
        ) : (
          data.map((u) => (
            <div key={u.profile.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
                <div>
                  <div className="font-semibold">{u.profile.full_name || "(no name)"}</div>
                  <div className="text-xs text-slate-500">{u.profile.email}</div>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {u.total.toFixed(2)}h total
                </div>
              </div>
              {u.entries.length === 0 ? (
                <div className="px-5 py-3 text-sm text-slate-400">No hours logged yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {u.entries.map((e) => (
                    <li key={e.id} className="px-5 py-2 text-sm flex justify-between">
                      <span className="text-slate-700">{e.work_date}</span>
                      <span className="text-slate-500">
                        {e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)}
                      </span>
                      <span className="font-medium">{Number(e.hours).toFixed(2)}h</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}

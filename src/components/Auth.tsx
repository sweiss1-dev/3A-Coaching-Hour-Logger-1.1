import { useState } from "react";
import { supabase } from "../lib/supabase";

type Mode = "sign-in" | "sign-up";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "sign-up") {
        if (!fullName.trim()) {
          throw new Error("Please enter your full name.");
        }
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (signUpErr) throw signUpErr;
        if (data.user && !data.session) {
          setMessage("Account created. Check your email to confirm, then sign in.");
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex justify-center items-center gap-3 mb-1">
          <img src="http://www.3acoachinginstitute.com/ci/image/3A_Logo7.png" alt="3A Coaching logo" className="h-10 w-auto" />
          {/* - <h1 className="text-2xl font-semibold">3A Coaching</h1> */}
        </div>
        <p className="text-slate-500 mb-6 text-sm text-center">Hour Logger</p>

        <div className="flex bg-slate-100 rounded-lg p-1 mb-6 text-sm">
          <button
            type="button"
            onClick={() => setMode("sign-in")}
            className={`flex-1 py-1.5 rounded-md transition ${
              mode === "sign-in" ? "bg-white shadow-sm font-medium" : "text-slate-500"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("sign-up")}
            className={`flex-1 py-1.5 rounded-md transition ${
              mode === "sign-up" ? "bg-white shadow-sm font-medium" : "text-slate-500"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "sign-up" && (
            <div>
              <label className="text-xs font-medium text-slate-600">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-md py-2 font-medium disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

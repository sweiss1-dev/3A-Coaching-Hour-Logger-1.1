// Supabase Edge Function: send-biweekly-report
//
// Pulls every hour entry from the last 15 days, formats a .txt report grouped
// by user, and emails it as an attachment to threeacoaching@gmail.com via Resend.
//
// Env vars required (set in Supabase → Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL                — auto-provided
//   SUPABASE_SERVICE_ROLE_KEY  — auto-provided
//   RESEND_API_KEY             — from https://resend.com/api-keys
//   REPORT_TO_EMAIL            — threeacoaching@gmail.com
//   REPORT_FROM_EMAIL          — e.g. "Hour Logger <onboarding@resend.dev>" (or your verified domain)
//   PERIOD_DAYS                — optional, defaults to 15
//
// Trigger: invoked by pg_cron every 15 days (see README).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type HourRow = {
  id: string;
  user_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  hours: number;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function buildReport(
  rows: HourRow[],
  profiles: Map<string, ProfileRow>,
  periodStart: string,
  periodEnd: string
): string {
  const lines: string[] = [];
  lines.push("3A Coaching — Hours Report");
  lines.push(`Period: ${periodStart} to ${periodEnd}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  if (rows.length === 0) {
    lines.push("No hours logged in this period.");
    return lines.join("\n");
  }

  // Group by user
  const byUser = new Map<string, HourRow[]>();
  for (const r of rows) {
    const arr = byUser.get(r.user_id) ?? [];
    arr.push(r);
    byUser.set(r.user_id, arr);
  }

  // Sort users by name
  const users = [...byUser.keys()].sort((a, b) => {
    const na = profiles.get(a)?.full_name || profiles.get(a)?.email || a;
    const nb = profiles.get(b)?.full_name || profiles.get(b)?.email || b;
    return na.localeCompare(nb);
  });

  let grandTotal = 0;

  for (const userId of users) {
    const profile = profiles.get(userId);
    const name = profile?.full_name?.trim() || profile?.email || "(unknown user)";
    const userRows = (byUser.get(userId) ?? []).sort((a, b) => {
      if (a.work_date !== b.work_date) return a.work_date.localeCompare(b.work_date);
      return a.start_time.localeCompare(b.start_time);
    });

    lines.push(`=== ${name} ===`);
    if (profile?.email) lines.push(`Email: ${profile.email}`);

    let userTotal = 0;
    for (const r of userRows) {
      const h = Number(r.hours);
      userTotal += h;
      lines.push(
        `  ${r.work_date}   ${r.start_time.slice(0, 5)} - ${r.end_time.slice(0, 5)}   ${h.toFixed(2)} hours`
      );
    }
    lines.push(`Total: ${userTotal.toFixed(2)} hours`);
    lines.push("");
    grandTotal += userTotal;
  }

  lines.push("---");
  lines.push(`Grand total: ${grandTotal.toFixed(2)} hours across ${users.length} user(s)`);
  return lines.join("\n");
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // 1. Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const toEmail = Deno.env.get("REPORT_TO_EMAIL") ?? "threeacoaching@gmail.com";
    const fromEmail =
      Deno.env.get("REPORT_FROM_EMAIL") ?? "Hour Logger <onboarding@resend.dev>";
    const periodDays = Number(Deno.env.get("PERIOD_DAYS") ?? "15");

    if (!supabaseUrl || !serviceKey) {
      return new Response("Missing Supabase env vars", { status: 500, headers: corsHeaders });
    }
    if (!resendKey) {
      return new Response("Missing RESEND_API_KEY", { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - periodDays);
    const periodStart = ymd(start);
    const periodEnd = ymd(now);

    const { data: hours, error: hoursErr } = await supabase
      .from("hours")
      .select("id,user_id,work_date,start_time,end_time,hours")
      .gte("work_date", periodStart)
      .lte("work_date", periodEnd)
      .order("work_date", { ascending: true });

    if (hoursErr) {
      return new Response(`DB error: ${hoursErr.message}`, { status: 500, headers: corsHeaders });
    }

    const rows = (hours ?? []) as HourRow[];

    // Pull profiles for the users that appear in this period
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const profiles = new Map<string, ProfileRow>();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", userIds);
      for (const p of (profs ?? []) as ProfileRow[]) profiles.set(p.id, p);
    }

    const reportText = buildReport(rows, profiles, periodStart, periodEnd);
    const filename = `3a-hours_${periodStart}_to_${periodEnd}.txt`;

    // Resend: send email with .txt attachment
    const attachmentBase64 = btoa(unescape(encodeURIComponent(reportText)));
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `3A Coaching — Hours Report (${periodStart} to ${periodEnd})`,
        text: `Bi-weekly hours report attached.\n\nPeriod: ${periodStart} to ${periodEnd}\nUsers: ${userIds.length}\nEntries: ${rows.length}\n`,
        attachments: [
          {
            filename,
            content: attachmentBase64,
          },
        ],
      }),
    });

    if (!emailRes.ok) {
      const body = await emailRes.text();
      return new Response(`Resend error: ${emailRes.status} ${body}`, { status: 502, headers: corsHeaders });
    }
    
    //await supabase.from("hours").delete().gte("work_date", periodStart);

    return new Response(
      JSON.stringify({
        ok: true,
        period: { start: periodStart, end: periodEnd },
        users: userIds.length,
        entries: rows.length,
        filename,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(`Error: ${err instanceof Error ? err.message : String(err)}`, {
      status: 500,
      headers: corsHeaders
    });
  }
});
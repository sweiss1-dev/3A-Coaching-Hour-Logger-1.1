import { createClient } from "@supabase/supabase-js";

const url = "https://nebqkqchrtffketdzysw.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lYnFrcWNocnRmZmtldGR6eXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjI4NDgsImV4cCI6MjA5Mjg5ODg0OH0.-kJAeH-e7HCwHNxxx3YjONEZ558kuqDGhkdNFsWW9m0";

export const supabase = createClient(url, anonKey);

export type HourEntry = {
  id: string;
  user_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
};
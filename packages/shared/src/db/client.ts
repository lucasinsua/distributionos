import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

let supabaseInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY environment variables"
    );
  }

  supabaseInstance = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });

  return supabaseInstance;
}

export function createSupabaseClient(
  url: string,
  key: string
): SupabaseClient<Database> {
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

export type { SupabaseClient, Database };

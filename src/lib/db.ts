import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}
if (!supabaseServiceRoleKey) {
  throw new Error(
    "Missing environment variable: SUPABASE_SERVICE_ROLE_KEY"
  );
}

/**
 * Public Supabase client — uses the anon key.
 * Safe to use in browser and server contexts where RLS is enforced.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin Supabase client — uses the service-role key.
 * Server-only. Bypasses Row Level Security.
 * Never expose this client to the browser.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

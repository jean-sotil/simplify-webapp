import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/db";

/**
 * Returns the active session from the Supabase auth client.
 * Returns null when no user is authenticated.
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

/**
 * Returns the currently authenticated user by re-validating against
 * the Supabase auth server. More secure than reading from the local
 * session cache because it confirms the JWT has not been revoked.
 * Returns null when no user is authenticated.
 */
export async function getUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user;
}

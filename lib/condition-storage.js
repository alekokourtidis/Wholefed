// Health conditions + profile sync — localStorage primary, Supabase background sync

import { getSupabase } from "./supabase";
import { getConditions as getLocalConditions, setConditions as setLocalConditions, getProfile as getLocalProfile, setProfile as setLocalProfile } from "./user-profile";

// Save conditions to localStorage + Supabase
export async function syncConditions(conditions, userId) {
  setLocalConditions(conditions);

  if (userId) {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      await supabase
        .from("user_conditions")
        .update({ conditions, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } catch {}
  }
}

// Save profile to localStorage + Supabase
export async function syncProfile(profile, userId) {
  setLocalProfile(profile);

  if (userId) {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      await supabase
        .from("user_conditions")
        .update({ profile, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } catch {}
  }
}

// Load conditions — Supabase if authenticated, localStorage fallback
export async function loadConditions(userId) {
  if (userId) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data } = await supabase
          .from("user_conditions")
          .select("conditions, profile")
          .eq("user_id", userId)
          .single();
        if (data) {
          // Also update localStorage so offline access works
          if (data.conditions) setLocalConditions(data.conditions);
          if (data.profile) setLocalProfile(data.profile);
          return { conditions: data.conditions || [], profile: data.profile || {} };
        }
      } catch {}
    }
  }
  return { conditions: getLocalConditions(), profile: getLocalProfile() };
}

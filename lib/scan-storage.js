// Scan history storage — localStorage primary, Supabase syncs in background for authenticated users

import { getSupabase } from "./supabase";

const HISTORY_KEY = "wholefed_history";
const MAX_LOCAL = 50;

// Save a scan to localStorage + Supabase (if authenticated)
export async function saveScan(scanData, userId) {
  // Always save to localStorage first (offline-first)
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    history.unshift(scanData);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_LOCAL)));
  } catch {}

  // Sync to Supabase if user is authenticated
  if (userId) {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      await supabase.from("scans").insert({
        user_id: userId,
        title: scanData.name || "Meal Scan",
        photo_url: scanData.image || null,
        score: scanData.score || 0,
        variety: scanData.variety || 0,
        nutrition: scanData.nutrition || 0,
        verdict: scanData.verdict || null,
        ingredients: scanData.ingredients || [],
        insights: scanData.insights || [],
        annotations: scanData.annotations || [],
        upgrade: scanData.upgrade || null,
      });
    } catch (err) {
      console.warn("Failed to sync scan to Supabase:", err);
    }
  }
}

// Get scan history — from Supabase if authenticated, localStorage otherwise
export async function getHistory(userId) {
  if (userId) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("scans")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (!error && data && data.length > 0) {
          return data.map((scan) => ({
            id: scan.id,
            name: scan.title,
            date: scan.created_at,
            score: scan.score,
            variety: scan.variety,
            nutrition: scan.nutrition,
            image: scan.photo_url,
            verdict: scan.verdict,
            ingredients: scan.ingredients,
            insights: scan.insights,
            annotations: scan.annotations,
            upgrade: scan.upgrade,
          }));
        }
      } catch (err) {
        console.warn("Failed to fetch from Supabase:", err);
      }
    }
  }

  // Fallback to localStorage
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

// Delete a scan
export async function deleteScan(scanId, userId) {
  // Remove from localStorage
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const filtered = history.filter((s) => s.id !== scanId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch {}

  // Remove from Supabase
  if (userId) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("scans").delete().eq("id", scanId).eq("user_id", userId);
      } catch {}
    }
  }
}

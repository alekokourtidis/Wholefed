"use client";

// Promo / affiliate code system for the paywall.
// FREE_CODES grant full Pro access for free (bypass the paywall) — used to give
// friends or affiliates 100% off. `aleko1` is Aleko's personal share code.
import { setPro } from "./scans";

const FREE_CODES = ["aleko1", "ak48"];
const REF_KEY = "wholefed_ref";
const CODE_KEY = "wholefed_promo_code";
// Dedicated, permanent flag for promo-granted access. Access checks honor this
// FIRST, so RevenueCat (which has no real entitlement for a promo user) can't
// overwrite it, and removing the code later never revokes an existing redeemer.
export const PROMO_PRO_KEY = "wholefed_promo_pro";

export function hasPromoAccess() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PROMO_PRO_KEY) === "true";
  } catch {
    return false;
  }
}

export function normalizeCode(code) {
  return (code || "").trim().toLowerCase().replace(/\s+/g, "");
}

// Try to redeem a code. Returns { ok, free, message }.
export function redeemCode(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, message: "Enter a code" };
  if (FREE_CODES.includes(code)) {
    setPro(true);
    try {
      localStorage.setItem(PROMO_PRO_KEY, "true");
      localStorage.setItem(CODE_KEY, code);
    } catch {}
    return { ok: true, free: true, message: "Code applied — you're all set." };
  }
  return { ok: false, message: "That code isn't valid." };
}

// Capture an affiliate ref from the URL (?ref=CODE) so referrals can be tracked.
export function captureRef() {
  if (typeof window === "undefined") return;
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) localStorage.setItem(REF_KEY, normalizeCode(ref));
  } catch {}
}

export function getStoredRef() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

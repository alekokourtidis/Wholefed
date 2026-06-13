// Scan counter — tracks total scans in localStorage
// Free users get 3 scans, then paywall

const MAX_FREE_SCANS = 3;
const STORAGE_KEY = "wholefed_scan_count";
const PRO_KEY = "wholefed_pro";

export function getScanCount() {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
}

export function incrementScanCount() {
  const count = getScanCount() + 1;
  localStorage.setItem(STORAGE_KEY, String(count));
  return count;
}

export function canScan() {
  if (isPro()) return true;
  return getScanCount() < MAX_FREE_SCANS;
}

export function scansRemaining() {
  if (isPro()) return Infinity;
  return Math.max(0, MAX_FREE_SCANS - getScanCount());
}

export function isPro() {
  if (typeof window === "undefined") return false;
  // Promo-granted access is permanent and overrides everything else.
  if (localStorage.getItem("wholefed_promo_pro") === "true") return true;
  return localStorage.getItem(PRO_KEY) === "true";
}

export function setPro(value) {
  localStorage.setItem(PRO_KEY, value ? "true" : "false");
}

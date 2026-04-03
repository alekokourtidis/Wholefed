// User profile storage — conditions, about you, lab data

const CONDITIONS_KEY = "wholefed_conditions";
const PROFILE_KEY = "wholefed_profile";

export function getConditions() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CONDITIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function setConditions(conditions) {
  localStorage.setItem(CONDITIONS_KEY, JSON.stringify(conditions));
}

export function getProfile() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

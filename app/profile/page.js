"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";
import { searchConditions } from "../../lib/conditions";
import { getConditions, getProfile, getConditionScoreEnabled, setConditionScoreEnabled } from "../../lib/user-profile";
import { syncConditions, syncProfile, loadConditions } from "../../lib/condition-storage";
import { useAuth, signOut } from "../../lib/auth";
import { isPro } from "../../lib/scans";
import { getLabResults, setLabResults, clearLabResults } from "../../lib/lab-storage";

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [conditions, setConditions] = useState([]);
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [profile, setProfileState] = useState({ age: "", gender: "", height: "", weight: "" });
  const [showLabs, setShowLabs] = useState(true);
  const [pro, setPro] = useState(false);
  const [labs, setLabs] = useState(null);
  const [labLoading, setLabLoading] = useState(false);
  const [labError, setLabError] = useState("");
  const [labsEnabled, setLabsEnabled] = useState(true);
  const [showAllMarkers, setShowAllMarkers] = useState(false);
  const [customName, setCustomName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [conditionScoreOn, setConditionScoreOn] = useState(false);
  const labFileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const data = await loadConditions(user?.id);
      setConditions(data.conditions);
      setProfileState({ age: "", gender: "", height: "", weight: "", ...data.profile });
      setPro(isPro());
      setLabs(getLabResults());
      const labToggle = localStorage.getItem("wholefed_labs_enabled");
      setLabsEnabled(labToggle !== "false");
      const savedName = localStorage.getItem("wholefed_display_name") || "";
      setCustomName(savedName);
      setConditionScoreOn(getConditionScoreEnabled());
    };
    load();
  }, [user]);

  const saveCustomName = (value) => {
    const trimmed = value.trim().slice(0, 30);
    setCustomName(trimmed);
    localStorage.setItem("wholefed_display_name", trimmed);
    setEditingName(false);
  };

  const toggleLabs = () => {
    const next = !labsEnabled;
    setLabsEnabled(next);
    localStorage.setItem("wholefed_labs_enabled", next ? "true" : "false");
  };

  const processLabImage = async (base64) => {
    setLabLoading(true);
    setLabError("");
    try {
      const res = await fetch("/api/extract-labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (data.error) {
        setLabError(data.error);
      } else if (!data.markers || data.markers.length === 0) {
        setLabError("No biomarkers found — make sure the image shows lab results clearly.");
      } else {
        setLabResults(data);
        setLabs(data);
      }
    } catch (err) {
      setLabError("Failed to process bloodwork. Try a clearer photo.");
    }
    setLabLoading(false);
  };

  const handleLabUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    await processLabImage(base64);
    if (labFileRef.current) labFileRef.current.value = "";
  };

  // Native camera/gallery for bloodwork (Capacitor)
  const handleLabCamera = async (source) => {
    try {
      if (window.Capacitor?.isNativePlatform?.()) {
        const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
        const photo = await Camera.getPhoto({
          quality: 90,
          resultType: CameraResultType.DataUrl,
          source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
          width: 2000,
          height: 2000,
        });
        await processLabImage(photo.dataUrl);
      } else {
        labFileRef.current?.click();
      }
    } catch (err) {
      if (!err.message?.includes("cancelled")) {
        setLabError("Failed to capture photo.");
      }
    }
  };

  const handleRemoveLabs = () => {
    clearLabResults();
    setLabs(null);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const displayName = customName || user?.email?.split("@")[0] || "Guest";
  const initials = displayName.slice(0, 2).toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const filtered = searchConditions(search).filter(
    (c) => !conditions.includes(c)
  );

  const addCondition = (c) => {
    if (!conditions.includes(c)) {
      const updated = [...conditions, c];
      setConditions(updated);
      syncConditions(updated, user?.id);
    }
    setSearch("");
    setShowSuggestions(false);
  };

  const removeCondition = (c) => {
    const updated = conditions.filter((x) => x !== c);
    setConditions(updated);
    syncConditions(updated, user?.id);
  };

  const updateProfile = (field, value) => {
    const updated = { ...profile, [field]: value };
    setProfileState(updated);
    syncProfile(updated, user?.id);
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-28">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-center items-center h-16 bg-transparent backdrop-blur-md">
        <h1 className="text-[#d4cfc4] font-thin tracking-[0.3em] text-sm uppercase">
          WHOLEFED
        </h1>
      </header>

      <main className="px-6 pt-24 pb-8">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-full bg-[#1c2623] ring-2 ring-[#bcccab]/20 ring-offset-4 ring-offset-[#131313] flex items-center justify-center mb-4">
            <span className="text-xl font-light text-[#d4cfc4]">{initials}</span>
          </div>
          {editingName ? (
            <input
              type="text"
              autoFocus
              defaultValue={customName}
              maxLength={30}
              onBlur={(e) => saveCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveCustomName(e.target.value);
                if (e.key === "Escape") setEditingName(false);
              }}
              className="text-lg font-light text-[#e5e2e1] bg-transparent border-b border-[#bcccab]/30 text-center outline-none focus:border-[#bcccab] px-2 py-1 max-w-[200px]"
              placeholder="Your name"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-lg font-light text-[#e5e2e1] active:opacity-60 transition-opacity"
            >
              {displayName}
            </button>
          )}
          <p className="text-[9px] tracking-[0.12em] uppercase text-[#8a8578] mt-1">
            {customName ? "Tap name to edit" : "Tap to set your name"}
          </p>
          {pro && (
            <div className="mt-2 flex items-center gap-2 px-3 py-1 rounded-full border border-[#bcccab]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#bcccab]" />
              <span className="text-[9px] tracking-[0.2em] uppercase text-[#bcccab] font-medium">
                Pro
              </span>
            </div>
          )}
        </div>

        {/* Personalize Your Analysis */}
        <div className="mb-10">
          <h3 className="text-[10px] tracking-[0.15em] uppercase text-[#6b7a5e] font-bold mb-2">
            Personalize Your Analysis
          </h3>
          <p className="text-[13px] font-light text-[#8a8578] mb-4">
            Flags relevant nutrients during scans.
          </p>

          {/* Search input */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 focus-within:border-[#6b7a5e]/40 transition-colors">
              <span className="material-symbols-outlined text-[#8a8578]/40 text-lg">search</span>
              <input
                type="text"
                placeholder="Search conditions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="flex-1 bg-transparent text-[14px] font-light text-[#d4cfc4] placeholder:text-[#8a8578]/30 outline-none"
              />
            </div>

            {showSuggestions && search.trim() && (
              <div className="absolute left-0 right-0 mt-1 bg-[#1c2623] border border-white/[0.06] rounded-xl overflow-hidden z-10 max-h-48 overflow-y-auto no-scrollbar">
                {filtered.length > 0 ? (
                  filtered.slice(0, 6).map((s) => (
                    <button
                      key={s}
                      onClick={() => addCondition(s)}
                      className="w-full text-left px-4 py-3 text-[13px] font-light text-[#d4cfc4] hover:bg-white/[0.03] border-b border-white/[0.03] last:border-0 transition-colors"
                    >
                      {s}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-[13px] font-light text-[#8a8578]/50">
                    No matching condition found
                  </div>
                )}
              </div>
            )}
          </div>

          {conditions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {conditions.map((c) => (
                <div
                  key={c}
                  className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-[#6b7a5e]/10 border border-[#6b7a5e]/15"
                >
                  <span className="text-[12px] font-light text-[#bcccab]/70">{c}</span>
                  <button
                    onClick={() => removeCondition(c)}
                    className="w-3.5 h-3.5 flex items-center justify-center text-[#bcccab]/25 hover:text-[#bcccab]/50 transition-colors"
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="1" y1="1" x2="7" y2="7" />
                      <line x1="7" y1="1" x2="1" y2="7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {conditions.length === 0 && (
            <p className="text-[11px] text-[#8a8578]/40 mt-3">
              No conditions added — your scores still work great.
            </p>
          )}

          {conditions.length > 0 && (
            <div className="mt-5 flex items-start justify-between gap-4 pt-4 border-t border-white/[0.04]">
              <div className="flex-1">
                <p className="text-[12px] font-light text-[#d4cfc4]">Adjust score for my conditions</p>
                <p className="text-[10px] text-[#8a8578]/60 mt-0.5 leading-relaxed">
                  Off by default. When on, meal scores deduct extra points for foods that conflict with your conditions.
                </p>
              </div>
              <button
                onClick={() => {
                  const next = !conditionScoreOn;
                  setConditionScoreOn(next);
                  setConditionScoreEnabled(next);
                }}
                className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${conditionScoreOn ? "bg-[#6b7a5e]" : "bg-white/[0.08]"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${conditionScoreOn ? "translate-x-[18px]" : "translate-x-0.5"}`} />
              </button>
            </div>
          )}
        </div>

        {/* Lab Results */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowLabs(!showLabs)}
              className="flex items-center gap-2"
            >
              <h3 className="text-[10px] tracking-[0.15em] uppercase text-[#6b7a5e] font-bold">
                Lab Results
              </h3>
              <span className="material-symbols-outlined text-[#6b7a5e] text-sm" style={{ fontVariationSettings: "'wght' 300" }}>
                {showLabs ? "expand_less" : "expand_more"}
              </span>
            </button>
            <button
              onClick={toggleLabs}
              className={`w-10 h-[22px] rounded-full relative transition-colors ${labsEnabled ? "bg-[#6b7a5e]" : "bg-white/10"}`}
            >
              <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-all ${labsEnabled ? "left-[20px]" : "left-[2px]"}`} />
            </button>
          </div>
          {showLabs && (
            <div className="mt-3">
              {labs && labs.markers && labs.markers.length > 0 ? (
                <>
                  {/* Lab results summary */}
                  <div className="p-4 rounded-2xl border border-[#6b7a5e]/20 bg-white/[0.02] mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#bcccab] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className="text-[11px] tracking-[0.15em] uppercase text-[#bcccab] font-medium">
                          {labs.markers.length} Biomarkers Loaded
                        </span>
                      </div>
                      {labs.lab_date && (
                        <span className="text-[10px] text-[#8a8578]">
                          {new Date(labs.lab_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    {labs.summary && (
                      <p className="text-[12px] font-light text-[#acabaa] leading-relaxed mb-3">{labs.summary}</p>
                    )}
                    {/* Show flagged markers first, then normal if expanded */}
                    <div className="space-y-1.5">
                      {labs.markers
                        .filter((m) => showAllMarkers || m.status === "high" || m.status === "low")
                        .map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="font-light text-[#d4cfc4]">{m.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-light text-[#acabaa]">{m.value} {m.unit}</span>
                            {m.status === "high" && (
                              <span className="flex items-center gap-0.5 text-[#8aab7f]">
                                <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                                <span className="text-[9px] tracking-wider uppercase font-medium">high</span>
                              </span>
                            )}
                            {m.status === "low" && (
                              <span className="flex items-center gap-0.5 text-[#8aab7f]">
                                <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_downward</span>
                                <span className="text-[9px] tracking-wider uppercase font-medium">low</span>
                              </span>
                            )}
                            {m.status === "normal" && (
                              <span className="text-[9px] tracking-wider uppercase font-medium text-[#8a8578]/40">normal</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {!showAllMarkers && labs.markers.filter((m) => m.status === "normal").length > 0 && (
                        <button
                          onClick={() => setShowAllMarkers(true)}
                          className="text-[10px] text-[#bcccab]/40 pt-1 active:text-[#bcccab]/60 transition-colors"
                        >
                          + {labs.markers.filter((m) => m.status === "normal").length} normal markers
                        </button>
                      )}
                      {showAllMarkers && (
                        <button
                          onClick={() => setShowAllMarkers(false)}
                          className="text-[10px] text-[#bcccab]/40 pt-1 active:text-[#bcccab]/60 transition-colors"
                        >
                          Show less
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLabCamera("gallery")}
                      className="flex-1 py-3 rounded-xl border border-[#6b7a5e]/20 flex items-center justify-center gap-2 active:bg-white/[0.02] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[#bcccab]/50 text-sm">sync</span>
                      <span className="text-[11px] font-light text-[#bcccab]/50">Update</span>
                    </button>
                    <button
                      onClick={handleRemoveLabs}
                      className="py-3 px-5 rounded-xl border border-white/[0.06] flex items-center justify-center active:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-[11px] font-light text-[#8a8578]/50">Remove</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-light text-[#8a8578] mb-4 leading-relaxed">
                    Upload a screenshot or photo of your bloodwork and we&apos;ll personalize every scan to your body.
                  </p>
                  {labLoading ? (
                    <div className="w-full py-4 rounded-2xl border border-[#6b7a5e]/20 flex items-center justify-center gap-3">
                      <div className="w-4 h-4 rounded-full border border-[#bcccab]/30 border-t-[#bcccab] animate-spin" />
                      <span className="text-[13px] font-light text-[#bcccab]/60 tracking-wide">
                        Reading bloodwork...
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLabCamera("gallery")}
                        className="flex-1 py-4 rounded-2xl border border-[#6b7a5e]/20 flex items-center justify-center gap-2 active:bg-white/[0.02] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[#bcccab]/60 text-base">photo_library</span>
                        <span className="text-[12px] font-light text-[#bcccab]/60 tracking-wide">
                          Upload
                        </span>
                      </button>
                      <button
                        onClick={() => handleLabCamera("camera")}
                        className="flex-1 py-4 rounded-2xl border border-[#6b7a5e]/20 flex items-center justify-center gap-2 active:bg-white/[0.02] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[#bcccab]/60 text-base">photo_camera</span>
                        <span className="text-[12px] font-light text-[#bcccab]/60 tracking-wide">
                          Take Photo
                        </span>
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-[#8a8578]/30 mt-3 text-center">
                    Turn off any time with the toggle above.
                  </p>
                  {labError && (
                    <p className="text-[11px] text-red-400 mt-2 text-center">{labError}</p>
                  )}
                </>
              )}
              <input
                ref={labFileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleLabUpload}
              />
            </div>
          )}
        </div>

        {/* About You */}
        <div className="mb-10">
          <h3 className="text-[10px] tracking-[0.15em] uppercase text-[#6b7a5e] font-bold mb-2">
            About You
          </h3>
          <p className="text-[13px] font-light text-[#8a8578] mb-4">
            Helps us tailor nutrient targets. Optional.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "age", label: "Age", placeholder: "e.g. 25", type: "number" },
              { key: "gender", label: "Gender", placeholder: "e.g. Male" },
              { key: "height", label: "Height", placeholder: "e.g. 5'10\"" },
              { key: "weight", label: "Weight", placeholder: "e.g. 160 lbs" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-[9px] tracking-[0.15em] uppercase text-[#6b7a5e]/60 mb-1.5 block">
                  {field.label}
                </label>
                <input
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  value={profile[field.key] || ""}
                  onChange={(e) => updateProfile(field.key, e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-[13px] font-light text-[#d4cfc4] placeholder:text-[#8a8578]/25 outline-none focus:border-[#6b7a5e]/40 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Legal — Terms + Privacy (required for in-app discoverability) */}
        <div className="mb-6">
          <h3 className="text-[10px] tracking-[0.15em] uppercase text-[#6b7a5e] font-bold mb-3">
            Legal
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => router.push("/terms")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.05] transition-colors"
            >
              <span className="text-[13px] font-light text-[#d4cfc4]">Terms of Use (EULA)</span>
              <span className="material-symbols-outlined text-[#8a8578] text-base">chevron_right</span>
            </button>
            <button
              onClick={() => router.push("/privacy")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.05] transition-colors"
            >
              <span className="text-[13px] font-light text-[#d4cfc4]">Privacy Policy</span>
              <span className="material-symbols-outlined text-[#8a8578] text-base">chevron_right</span>
            </button>
            <button
              onClick={() => router.push("/subscribe")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.05] transition-colors"
            >
              <span className="text-[13px] font-light text-[#d4cfc4]">Manage Subscription</span>
              <span className="material-symbols-outlined text-[#8a8578] text-base">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Sign Out / Sign In */}
        {user ? (
          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full py-3.5 rounded-xl bg-white/[0.04] text-[#8a8578] text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-white/[0.06] transition-colors"
            >
              Sign Out
            </button>
            <button
              onClick={async () => {
                if (!confirm("Delete your account? This permanently removes all your data and cannot be undone.")) return;
                try {
                  const { getSupabase } = await import("../../lib/supabase");
                  const supabase = getSupabase();
                  if (supabase) {
                    await supabase.rpc("delete_user_data");
                  }
                  // Clear all local data
                  localStorage.clear();
                  await signOut();
                  router.push("/");
                } catch {
                  setLabError("Failed to delete account. Please try again.");
                }
              }}
              className="w-full py-3.5 rounded-xl bg-white/[0.04] text-red-400/60 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-red-500/10 transition-colors"
            >
              Delete Account
            </button>
          </div>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}

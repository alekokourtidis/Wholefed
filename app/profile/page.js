"use client";

import { useState, useEffect } from "react";
import BottomNav from "../components/BottomNav";
import { searchConditions } from "../../lib/conditions";
import { getConditions, setConditions as saveConditions, getProfile, setProfile as saveProfile } from "../../lib/user-profile";

export default function ProfilePage() {
  const [conditions, setConditions] = useState([]);
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [profile, setProfileState] = useState({ age: "", gender: "", height: "", weight: "" });

  // Load saved data on mount
  useEffect(() => {
    setConditions(getConditions());
    setProfileState({ age: "", gender: "", height: "", weight: "", ...getProfile() });
  }, []);

  const filtered = searchConditions(search).filter(
    (c) => !conditions.includes(c)
  );

  const addCondition = (c) => {
    if (!conditions.includes(c)) {
      const updated = [...conditions, c];
      setConditions(updated);
      saveConditions(updated);
    }
    setSearch("");
    setShowSuggestions(false);
  };

  const removeCondition = (c) => {
    const updated = conditions.filter((x) => x !== c);
    setConditions(updated);
    saveConditions(updated);
  };

  const updateProfile = (field, value) => {
    const updated = { ...profile, [field]: value };
    setProfileState(updated);
    saveProfile(updated);
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-28">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-center items-center h-16 bg-transparent backdrop-blur-md">
        <h1 className="text-[#d4cfc4] font-thin tracking-[0.3em] text-sm uppercase">
          WHOLEFED
        </h1>
      </header>

      <main className="px-6 pt-20 pb-8">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-18 h-18 rounded-full bg-[#1c2623] border border-white/[0.06] flex items-center justify-center mb-3">
            <span className="text-xl font-light text-[#d4cfc4]">JD</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-4" />
            <h2 className="text-lg font-light text-[#e5e2e1]">Julianne Devis</h2>
            <button className="w-4 text-[#8a8578]/30 hover:text-[#8a8578] transition-colors">
              <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'wght' 200" }}>edit</span>
            </button>
          </div>
          <p className="text-[9px] tracking-[0.2em] uppercase text-[#8a8578] mt-1">
            Member since October 2025
          </p>
          <div className="mt-2 flex items-center gap-2 px-3 py-1 rounded-full border border-[#6b7a5e]/30">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6b7a5e]" />
            <span className="text-[9px] tracking-[0.2em] uppercase text-[#bcccab] font-medium">
              Pro
            </span>
          </div>
        </div>

        {/* Health Conditions */}
        <div className="mb-10">
          <h3 className="text-[10px] tracking-[0.25em] uppercase text-[#8a8578] font-bold mb-2">
            Health Conditions
          </h3>
          <p className="text-[13px] font-light text-[#8a8578] mb-4">
            Anything we should know about? This helps us flag relevant nutrients.
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

            {/* Suggestions dropdown — only shows validated conditions */}
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

          {/* Added conditions as tags */}
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
              No conditions added — that&apos;s fine, your scores still work great.
            </p>
          )}
        </div>

        {/* Lab Results */}
        <div className="mb-10">
          <h3 className="text-[10px] tracking-[0.25em] uppercase text-[#bcccab] font-bold mb-2">
            Lab Results
          </h3>
          <p className="text-[13px] font-light text-[#8a8578] mb-4 leading-relaxed">
            Upload bloodwork and we&apos;ll automatically personalize every scan to your body.
          </p>
          <button className="w-full py-5 rounded-2xl bg-[#1c2623] border border-[#6b7a5e]/20 flex items-center justify-center gap-3 active:bg-[#1c2623]/80 transition-colors">
            <span className="material-symbols-outlined text-[#bcccab] text-xl">
              labs
            </span>
            <span className="text-[13px] font-medium text-[#bcccab] tracking-wide">
              Upload Bloodwork
            </span>
          </button>
          <p className="text-[10px] text-[#8a8578]/50 mt-2 text-center">
            PDF, photo, or screenshot of lab results
          </p>
        </div>

        {/* About You */}
        <div className="mb-10">
          <h3 className="text-[10px] tracking-[0.25em] uppercase text-[#8a8578] font-bold mb-2">
            About You
          </h3>
          <p className="text-[13px] font-light text-[#8a8578] mb-4">
            Helps us tailor nutrient targets. Optional.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "age", label: "Age", placeholder: "e.g. 25", type: "number" },
              { key: "gender", label: "Gender", placeholder: "e.g. Male" },
              { key: "height", label: "Height", placeholder: "e.g. 5'10\"" },
              { key: "weight", label: "Weight", placeholder: "e.g. 160 lbs" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-[9px] tracking-[0.2em] uppercase text-[#8a8578]/60 mb-1 block">
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

        {/* Sign Out */}
        <button className="w-full py-3.5 rounded-xl bg-white/[0.04] text-[#8a8578] text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-white/[0.06] transition-colors">
          Sign Out
        </button>
      </main>

      <BottomNav />
    </div>
  );
}

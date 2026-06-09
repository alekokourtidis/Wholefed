"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../../lib/auth";
import { getHistory, deleteScan } from "../../lib/scan-storage";

// Ring/number color: #00400A (darkest) to #BDC9C0 (lightest)
function scoreGreen(value) {
  if (value >= 85) return "#00400A";
  if (value >= 75) return "#3D6B3A";
  if (value >= 60) return "#7E9B78";
  return "#BDC9C0";
}

// Dot color: 3 scales (1-3 white, 4-6 light green, 7-10 dark green)
function dotGreen(value) {
  if (value >= 7) return { color: "#006400", glow: "0 0 4px rgba(0,100,0,0.35)" };
  if (value >= 4) return { color: "#8BAA80", glow: "0 0 3px rgba(139,170,128,0.2)" };
  return { color: "#FFFFFF", glow: "0 0 3px rgba(255,255,255,0.15)" };
}

function MiniScoreRing({ score }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const fill = Math.max(score, 5); // minimum 5% arc
  const offset = circ * (1 - fill / 100);
  return (
    <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
        <defs>
          <linearGradient id="ringGrad" gradientUnits="userSpaceOnUse" x1="20" y1="4" x2="20" y2="36">
            <stop offset="0%" stopColor="#8BAA80" />
            <stop offset="100%" stopColor="#00400A" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
        <circle
          cx="20" cy="20" r={r}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          stroke="url(#ringGrad)"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="text-[13px] font-light tabular-nums text-[#6b8a5e]">{score}</span>
    </div>
  );
}

function SwipeRow({ children, onDelete }) {
  const ref = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [showDelete, setShowDelete] = useState(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
  };
  const handleTouchMove = (e) => {
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    if (diff > 0) setOffset(Math.min(diff, 80));
    else setOffset(0);
  };
  const handleTouchEnd = () => {
    if (offset > 40) {
      setOffset(80);
      setShowDelete(true);
    } else {
      setOffset(0);
      setShowDelete(false);
    }
  };
  const reset = () => { setOffset(0); setShowDelete(false); };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete button behind */}
      <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-500/20 rounded-r-xl">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex flex-col items-center gap-1"
        >
          <span className="material-symbols-outlined text-red-400 text-lg">delete</span>
          <span className="text-[8px] text-red-400 uppercase tracking-wider">Delete</span>
        </button>
      </div>
      {/* Content row */}
      <div
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (showDelete) reset(); }}
        className="relative bg-surface transition-transform"
        style={{ transform: `translateX(-${offset}px)` }}
      >
        {children}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [scans, setScans] = useState([]);

  useEffect(() => {
    const loadHistory = async () => {
      const history = await getHistory(user?.id);
      const fmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      setScans(history.map((s) => ({
        ...s,
        date: fmt.format(new Date(s.date)).replace(",", "").toUpperCase(),
      })));
    };
    loadHistory();
  }, [user]);

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-28">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-center items-center h-16 bg-transparent backdrop-blur-md">
        <h1 className="text-[#d4cfc4] font-thin tracking-[0.3em] text-sm uppercase">
          WHOLEFED
        </h1>
      </header>

      <main className="px-6 pt-24 pb-8">
        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-extralight tracking-wide text-[#e5e2e1]">
              JOURNAL
            </h2>
            {scans.length > 0 && (
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#8a8578]">
                {scans.length} {scans.length === 1 ? "Scan" : "Scans"}
              </p>
            )}
          </div>
          <div className="h-px bg-white/[0.06] mt-4" />
        </div>

        {scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-28">
            <span className="material-symbols-outlined text-[#8a8578]/15 text-5xl mb-8" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
            <p className="text-[18px] font-light text-[#8a8578]/50 text-center leading-relaxed">
              No scans yet
            </p>
            <p className="text-[13px] font-light text-[#8a8578]/30 text-center mt-3 leading-relaxed max-w-[240px]">
              See what&apos;s actually in your food.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-10 px-8 py-3.5 rounded-2xl bg-[#7d8f70] text-white text-[14px] font-medium tracking-wide active:bg-[#6b7a5e] transition-colors"
            >
              Scan My First Meal
            </button>
          </div>
        ) : (
          <>
            {/* Scan List — swipe left to delete */}
            <div className="space-y-6">
              {scans.map((scan) => (
                <SwipeRow
                  key={scan.id}
                  onDelete={async () => {
                    await deleteScan(scan.id, user?.id);
                    setScans((prev) => prev.filter((s) => s.id !== scan.id));
                  }}
                >
                  <div
                    className="flex items-center gap-4 cursor-pointer active:opacity-70 transition-opacity"
                    onClick={() => {
                      try {
                        sessionStorage.setItem("wholefed_saved_scan", JSON.stringify(scan));
                      } catch {}
                      router.push(`/results?scan=${scan.id}`);
                    }}
                  >
                    <div className="w-[80px] h-[80px] rounded-xl overflow-hidden flex-shrink-0 bg-surface-container">
                      {scan.image && scan.image !== "text" && !scan.image.startsWith("text") ? (
                        <img
                          src={scan.image}
                          alt={scan.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            background:
                              "linear-gradient(135deg, #1c2623 0%, #2d3a30 40%, #3d4b32 80%, #6b7a5e 100%)",
                          }}
                        >
                          <span
                            className="material-symbols-outlined text-[#bcccab]/80 text-[28px]"
                            style={{ fontVariationSettings: "'wght' 200" }}
                          >
                            edit_note
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-light text-[#e5e2e1] leading-snug">
                        {scan.name}
                      </h3>
                      <p className="text-[9px] tracking-[0.15em] uppercase text-[#8a8578] mt-1.5">
                        {scan.date}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotGreen(scan.variety).color, boxShadow: dotGreen(scan.variety).glow }} />
                          <span className="text-[9px] tracking-[0.15em] uppercase text-[#8a8578]">Completeness</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotGreen(scan.nutrition).color, boxShadow: dotGreen(scan.nutrition).glow }} />
                          <span className="text-[9px] tracking-[0.15em] uppercase text-[#8a8578]">Quality</span>
                        </div>
                      </div>
                    </div>
                    <MiniScoreRing score={scan.score} />
                  </div>
                </SwipeRow>
              ))}
            </div>
            <div className="flex flex-col items-center mt-16 mb-4">
              <div className="w-1 h-1 rounded-full bg-[#8a8578]/40 mb-4" />
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#8a8578]/50">End of Archive</p>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

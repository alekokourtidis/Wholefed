"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";

function getRecentDates() {
  const now = new Date();
  const dates = [];
  const offsets = [0, 1, 3, 5];
  const times = ["12:45 PM", "08:15 AM", "01:30 PM", "07:10 PM"];
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });

  offsets.forEach((daysAgo, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    const parts = fmt.format(d).replace(",", "").toUpperCase();
    dates.push(`${parts} • ${times[i]}`);
  });
  return dates;
}

const baseScanData = [
  {
    id: 1,
    name: "Harvest Quinoa & Sprout Bowl",
    date: "",
    score: 92,
    variety: 90,
    nutrition: 88,
    image: "/healthymeal1.jpg",
  },
  {
    id: 2,
    name: "Sourdough Avocado & Microgreens",
    date: "",
    score: 85,
    variety: 82,
    nutrition: 68,
    image: "/meal3.jpg",
  },
  {
    id: 3,
    name: "Citrus & Pomegranate Kale Mix",
    date: "",
    score: 78,
    variety: 76,
    nutrition: 70,
    image: "/meal4.jpeg",
  },
  {
    id: 4,
    name: "Ancient Grain & Lentil Broth",
    date: "",
    score: 71,
    variety: 58,
    nutrition: 52,
    image: "/meal3.jpg",
  },
];

// Ring/number color: #00400A (darkest) to #BDC9C0 (lightest)
function scoreGreen(value) {
  if (value >= 85) return "#00400A";
  if (value >= 75) return "#3D6B3A";
  if (value >= 60) return "#7E9B78";
  return "#BDC9C0";
}

// Dot color + glow intensity: dark green glows bright, lighter greens glow less
function dotGreen(value) {
  if (value >= 85) return { color: "#00400A", glow: "0 0 4px rgba(0,64,10,0.35)" };
  if (value >= 75) return { color: "#3D6B3A", glow: "0 0 4px rgba(61,107,58,0.3)" };
  if (value >= 60) return { color: "#8BAA80", glow: "0 0 3px rgba(139,170,128,0.2)" };
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

export default function HistoryPage() {
  const router = useRouter();
  const [scans, setScans] = useState(baseScanData);

  useEffect(() => {
    const dates = getRecentDates();
    setScans(baseScanData.map((s, i) => ({ ...s, date: dates[i] })));
  }, []);

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
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#8a8578]">
              {scans.length} Total Scans
            </p>
          </div>
          <div className="h-px bg-white/[0.06] mt-4" />
        </div>

        {/* Scan List */}
        <div className="space-y-6">
          {scans.map((scan) => (
            <div
              key={scan.id}
              className="flex items-center gap-4 cursor-pointer active:opacity-70 transition-opacity"
              onClick={() => router.push(`/results?scan=${scan.id}`)}
            >
              {/* Food Photo Thumbnail */}
              <div className="w-[80px] h-[80px] rounded-xl overflow-hidden flex-shrink-0 bg-surface-container">
                <img
                  src={scan.image}
                  alt={scan.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
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
                    <span className="text-[9px] tracking-[0.15em] uppercase text-[#8a8578]">
                      Variety
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotGreen(scan.nutrition).color, boxShadow: dotGreen(scan.nutrition).glow }} />
                    <span className="text-[9px] tracking-[0.15em] uppercase text-[#8a8578]">
                      Nutrition
                    </span>
                  </div>
                </div>
              </div>

              {/* Score Ring */}
              <MiniScoreRing score={scan.score} />
            </div>
          ))}
        </div>

        {/* End of Archive */}
        <div className="flex flex-col items-center mt-16 mb-4">
          <div className="w-1 h-1 rounded-full bg-[#8a8578]/40 mb-4" />
          <p className="text-[9px] tracking-[0.3em] uppercase text-[#8a8578]/50">
            End of Archive
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

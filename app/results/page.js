"use client";

import { useState, useEffect } from "react";
import BottomNav from "../components/BottomNav";
import { getConditions, getProfile } from "../../lib/user-profile";

const funFacts = [
  "Avocados have more potassium than bananas",
  "Eating greens before starch reduces glucose spikes by up to 73%",
  "Dark chocolate has more antioxidants per gram than blueberries",
  "Cooking tomatoes triples their lycopene content",
  "Cinnamon can lower fasting blood sugar by 10-29%",
  "Your gut microbiome weighs about 2kg — more than your brain",
  "Fermented foods can contain 100x more probiotics than supplements",
  "Salmon's omega-3s are 3x better absorbed when eaten with fat",
  "Bell peppers have 3x more vitamin C than oranges per gram",
  "Turmeric absorption increases 2000% when paired with black pepper",
  "Honey never spoils — 3000-year-old honey was found edible in Egyptian tombs",
  "Almonds are technically seeds, not nuts",
  "Broccoli has more protein per calorie than steak",
  "Carrots were originally purple before the 17th century",
  "A single Brazil nut contains your entire daily selenium requirement",
  "Chewing food 32 times can reduce calorie absorption by 12%",
  "Ginger is more effective than Dramamine for motion sickness",
  "Mushrooms are the only plant source of vitamin D",
  "Eating walnuts before bed can boost melatonin levels",
  "Kiwi skin has 3x more fiber than the flesh",
  "Frozen vegetables often have more nutrients than fresh — they're flash-frozen at peak ripeness",
  "Black rice was once reserved exclusively for Chinese emperors",
  "Your liver can regenerate itself from just 25% of its tissue",
  "Saffron is more expensive by weight than gold",
  "Pistachios are technically fruits",
  "Eating an apple is more effective at waking you up than coffee",
  "Celery requires more calories to digest than it contains",
  "Pomegranates can contain up to 1400 seeds each",
  "Garlic has been used as currency in ancient Egypt",
  "Sweet potatoes and regular potatoes are from completely different plant families",
  "Capsaicin in chili peppers tricks your brain into thinking you're on fire",
  "Cashews grow from the bottom of cashew apples",
  "One egg contains all the nutrients to turn a single cell into a baby chicken",
  "Coconut water can be used as an emergency blood plasma substitute",
  "Peanuts are legumes, not nuts — they grow underground",
  "Bananas are slightly radioactive due to their potassium content",
  "Your stomach lining replaces itself every 3-4 days",
  "Olive oil loses most of its antioxidants when heated above 180°C",
  "Red wine contains the same antioxidant — resveratrol — found in dark chocolate",
  "Asparagus grows up to 7 inches in a single day",
];

function getUnseenFact() {
  const seenKey = "wholefed_seen_facts";
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(seenKey) || "[]"); } catch {}
  const unseen = funFacts.filter((_, i) => !seen.includes(i));
  if (unseen.length === 0) {
    seen = [];
    localStorage.setItem(seenKey, "[]");
  }
  const available = unseen.length > 0 ? unseen : funFacts;
  const pick = available[Math.floor(Math.random() * available.length)];
  const idx = funFacts.indexOf(pick);
  seen.push(idx);
  localStorage.setItem(seenKey, JSON.stringify(seen));
  return pick;
}

// Force-assign card types to ensure visual variety
// The AI can't be trusted to return correct types, so we assign them ourselves
function normalizeInsights(raw, hasConditions) {
  if (!raw || !Array.isArray(raw)) return [];

  // Extract text from each item regardless of format
  const texts = raw.map((item) => {
    if (typeof item === "string") return { text: item, title: item.title, suggestions: item.suggestions };
    return {
      text: item.text || item.description || item.content || item.detail || item.body || "",
      title: item.title || null,
      suggestions: item.suggestions || null,
    };
  }).filter(i => i.text);

  // Force-assign types in this exact visual order:
  // good (cardless) → missing (card) → interaction (cardless) → fact (card) → condition/highlight
  const slots = ["good", "missing"];
  if (hasConditions) slots.push("condition");
  slots.push("interaction");
  if (!hasConditions && texts.length > 3) slots.push("highlight");
  slots.push("fact"); // always last

  return texts.slice(0, slots.length).map((item, i) => ({
    type: slots[i],
    text: item.text,
    title: slots[i] === "missing" ? (item.title || "Something Missing") : (slots[i] === "condition" ? item.title : null),
    suggestions: slots[i] === "missing" ? item.suggestions : null,
    icon: null,
  }));
}

export default function ResultsPage() {
  const [imageUrl, setImageUrl] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fact, setFact] = useState("");
  const [frostAmount, setFrostAmount] = useState(0);

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    setFrostAmount(Math.min(scrollTop / 200, 1));
  };

  useEffect(() => {
    setFact(getUnseenFact());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const img = sessionStorage.getItem("wholefed_image");
    const base64 = sessionStorage.getItem("wholefed_image_base64");
    setImageUrl(img || "/healthymeal1.jpg");

    const analyzeImage = async () => {
      // Use base64 if available (uploaded photo), otherwise use the demo image URL
      let imageData = base64;
      if (!imageData) {
        // Convert the demo image to base64
        const res = await fetch("/healthymeal1.jpg");
        const blob = await res.blob();
        imageData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }

      try {
        const conditions = getConditions();
        const profile = getProfile();
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageData, conditions, profile }),
        });
        const data = await res.json();
        if (data.error) {
          console.error("API error:", data.error);
          // Fallback demo data
          setAnalysis(getDemoData());
        } else {
          setAnalysis(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setAnalysis(getDemoData());
      }
      setLoading(false);
    };

    analyzeImage();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center gap-8 px-12">
        {/* Loading spinner ring */}
        <div className="w-20 h-20 rounded-full border-2 border-[#bcccab]/20 border-t-[#bcccab] animate-spin" />
        <p className="text-[#d4cfc4] text-sm font-light tracking-wider text-center">
          Analyzing your meal...
        </p>
        {fact && (
          <p className="text-[#8a8578] text-xs font-light text-center italic leading-relaxed mt-4">
            &ldquo;{fact}&rdquo;
          </p>
        )}
      </div>
    );
  }

  console.log("AI response:", JSON.stringify(analysis, null, 2));
  const { score, variety, nutrition, annotations, ingredients } = analysis;

  // Get insights — try normalizing, fall back to demo if empty
  let insights = normalizeInsights(analysis.insights);
  console.log("Normalized insights:", insights.length, JSON.stringify(insights));
  if (insights.length === 0 && analysis.insights?.length > 0) {
    // Nuclear fallback — the AI returned something we can't parse, show demo cards
    console.warn("Insights normalization failed, using demo data");
    insights = getDemoData().insights;
  }

  // Validate upgrade — reject if "from" food isn't in the detected ingredients
  const upgrade = analysis.upgrade && ingredients?.some(
    ing => ing.toLowerCase().includes(analysis.upgrade.from?.toLowerCase())
  ) ? analysis.upgrade : null;

  return (
    <div
      className="fixed inset-0 bg-surface text-on-surface overflow-y-auto no-scrollbar"
      onScroll={handleScroll}
    >
      {/* Sticky photo at top */}
      <div className="sticky top-0 h-[45vh] w-full z-0 overflow-hidden">
        <img
          src={imageUrl}
          alt="Your meal"
          className="w-full h-full object-cover"
        />
        {/* Frost overlay */}
        {frostAmount > 0 && (
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${frostAmount * 20}px)`,
              WebkitBackdropFilter: `blur(${frostAmount * 20}px)`,
              backgroundColor: `rgba(19, 19, 19, ${frostAmount * 0.5})`,
            }}
          />
        )}
        {/* Vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(14,14,14,0.3) 0%, transparent 25%, transparent 60%, rgba(14,14,14,0.8) 100%), radial-gradient(circle, transparent 40%, rgba(14,14,14,0.5) 100%)",
          }}
        />
        {/* Floating annotation pills */}
        <div
          className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-500"
          style={{ opacity: 1 - frostAmount }}
        >
            {annotations?.map((a, i) => {
              const layoutMap = {
                "top-left":    { pillTop: 15, pillLeft: 3,  dotTop: 30, dotLeft: 22 },
                "top-right":   { pillTop: 15, pillLeft: 52, dotTop: 30, dotLeft: 55 },
                "bottom-left": { pillTop: 65, pillLeft: 3,  dotTop: 55, dotLeft: 22 },
                "bottom-right":{ pillTop: 65, pillLeft: 50, dotTop: 55, dotLeft: 52 },
              };
              // Fallback order if position not provided
              const fallbackOrder = ["top-left", "top-right", "bottom-left", "bottom-right"];
              const pos = a.position?.toLowerCase()?.replace(" ", "-") || fallbackOrder[i] || "top-left";
              const l = layoutMap[pos] || layoutMap[fallbackOrder[i]] || layoutMap["top-left"];
              return (
              <div key={i} className="absolute inset-0">
                {/* Pill label */}
                <div
                  className="absolute glass-panel px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-xl z-20"
                  style={{ top: `${l.pillTop}%`, left: `${l.pillLeft}%` }}
                >
                  <div className="w-1 h-1 rounded-full bg-[#bcccab] shadow-[0_0_6px_rgba(188,204,171,0.8)]" />
                  <span className="text-[8px] tracking-[0.2em] uppercase font-bold text-white whitespace-nowrap">
                    {a.label}
                  </span>
                </div>
                {/* Dot pointing to the food */}
                <div
                  className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)] z-20"
                  style={{ top: `${l.dotTop}%`, left: `${l.dotLeft}%` }}
                />
                {/* Connecting line */}
                <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                  <line
                    x1={`${l.pillLeft + 8}%`}
                    y1={`${l.pillTop + 3}%`}
                    x2={`${l.dotLeft + 1}%`}
                    y2={`${l.dotTop + 1}%`}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              );
            })}
          </div>
      </div>

      {/* Analysis panel — slides up over the photo */}
      <div className="relative z-10 bg-surface rounded-t-3xl -mt-6 min-h-screen pb-32">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <section className="px-8 pt-4 flex flex-col gap-6">
          {/* Score Ring — fancy double ring */}
          <div className="flex justify-center items-center py-6">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
                {/* Outer decorative ring — thin, full circle */}
                <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                {/* Tick marks around the outer edge */}
                {Array.from({ length: 60 }).map((_, i) => {
                  const angle = (i / 60) * 2 * Math.PI;
                  const isMajor = i % 5 === 0;
                  const r1 = isMajor ? 91 : 93;
                  const r2 = 96;
                  return (
                    <line
                      key={i}
                      x1={100 + r1 * Math.cos(angle)}
                      y1={100 + r1 * Math.sin(angle)}
                      x2={100 + r2 * Math.cos(angle)}
                      y2={100 + r2 * Math.sin(angle)}
                      stroke={`rgba(255,255,255,${isMajor ? 0.12 : 0.05})`}
                      strokeWidth={isMajor ? 1.5 : 0.5}
                    />
                  );
                })}
                {/* Background track */}
                <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                {/* Score arc — gradient fill */}
                <circle
                  cx="100" cy="100" r="82"
                  fill="none"
                  strokeWidth="5"
                  strokeLinecap="round"
                  stroke="url(#scoreGrad)"
                  strokeDasharray={`${2 * Math.PI * 82}`}
                  strokeDashoffset={`${2 * Math.PI * 82 * (1 - score / 100)}`}
                  style={{ animation: "ringFill 2s ease-out forwards" }}
                />
                {/* Inner glow ring */}
                <circle cx="100" cy="100" r="82" fill="none" stroke="url(#scoreGrad)" strokeWidth="12" opacity="0.08" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 82}`}
                  strokeDashoffset={`${2 * Math.PI * 82 * (1 - score / 100)}`}
                  style={{ animation: "ringFill 2s ease-out forwards" }}
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={score >= 70 ? "#a8c49e" : "#c49e9e"} />
                    <stop offset="50%" stopColor={score >= 70 ? "#6b8a5e" : "#8a5e5e"} />
                    <stop offset="100%" stopColor={score >= 70 ? "#2d5a23" : "#5a2d2d"} />
                  </linearGradient>
                </defs>
              </svg>
              {/* Score number */}
              <div className="flex flex-col items-center score-number">
                <span className="text-[64px] font-extralight text-[#e5e2e1] leading-none tracking-[-0.03em]">
                  {score}
                </span>
                <span className="text-[9px] tracking-[0.3em] uppercase text-[#8a8578] mt-2 font-medium">
                  Total Score
                </span>
              </div>
            </div>
          </div>

          {/* Verdict — above bars */}
          {analysis?.verdict && (
            <div className="px-2">
              <p className="text-[15px] font-light text-[#d4cfc4] leading-relaxed text-center">
                {analysis.verdict}
              </p>
            </div>
          )}

          {/* Variety + Nutrition bars */}
          <div className="space-y-5 px-2">
            {[
              { label: "Variety", value: variety, icon: "spa" },
              { label: "Nutrition", value: nutrition, icon: "bolt" },
            ].map((bar) => (
              <div key={bar.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] tracking-[0.25em] font-bold text-[#8a8578] uppercase">
                    {bar.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-light text-[#d4cfc4]">{bar.value}</span>
                    <span className="material-symbols-outlined text-[#6b7a5e] text-sm">{bar.icon}</span>
                  </div>
                </div>
                <div className="relative h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      width: `${bar.value}%`,
                      background: "linear-gradient(90deg, #3d4b32 0%, #6b7a5e 50%, #8aab7f 100%)",
                      animation: "barFill 1.5s ease-out forwards",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Insight Cards — each type has a visually distinct layout */}
          <div className="space-y-5 pt-2">
            {normalizeInsights(insights, getConditions().length > 0).map((insight, i) => {
              const type = insight.type?.toLowerCase() || "interaction";

              {/* GOOD — check icon + text, then Quick Swap after */}
              if (type === "good" || type === "highlight") return (
                <div key={i}>
                  <div className="py-3 px-2 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#8aab7f] text-lg flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {type === "good" ? "check_circle" : "star"}
                    </span>
                    <p className="text-[14px] font-light text-[#d4cfc4] leading-relaxed">{insight.text}</p>
                  </div>
                  {/* Quick Swap — placed right after the good summary */}
                  {i === 0 && upgrade && (
                    <div className="glass-panel p-6 rounded-2xl border border-white/5 mt-5">
                      <p className="text-[10px] tracking-[0.25em] font-bold text-[#bcccab] uppercase mb-3">Quick Swap</p>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-light text-[#e5e2e1]">{upgrade.from}</span>
                        <span className="material-symbols-outlined text-[#8a8578] text-xl">east</span>
                        <span className="text-lg font-medium text-white">{upgrade.to}</span>
                      </div>
                    </div>
                  )}
                </div>
              );

              {/* NUTRIENT INTERACTION — green circle + timeline */}
              if (type === "interaction") return (
                <div key={i} className="py-4 px-2">
                  <p className="text-[10px] tracking-[0.25em] font-bold text-[#8a8578] uppercase mb-2">Nutrient Interaction</p>
                  <p className="text-[14px] font-light text-[#acabaa] leading-relaxed">{insight.text}</p>
                </div>
              );

              {/* WHAT'S MISSING — card with suggestion circles */}
              if (type === "missing") return (
                <div key={i} className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-4">
                  <p className="text-[10px] tracking-[0.25em] font-bold text-[#8a8578] uppercase">What&apos;s Missing</p>
                  {insight.title && (
                    <h3 className="text-lg font-light text-[#e5e2e1]">{insight.title}</h3>
                  )}
                  <p className="text-[13px] font-light text-[#acabaa] leading-relaxed">{insight.text}</p>
                  {/* Suggestions */}
                  {insight.suggestions && insight.suggestions.length > 0 && (
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.04]">
                      {insight.suggestions.map((s, j) => (
                        <span key={j} className="flex items-center gap-0 text-[11px] font-light text-[#bcccab]/50">
                          {s.name}
                          {j < insight.suggestions.length - 1 && <span className="mx-3 text-[#8a8578]/30">•</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );

              {/* DID YOU KNOW — divider + compact green tint */}
              if (type === "fact") return (
                <div key={i}>
                <div className="bg-[#6b7a5e]/[0.06] p-5 rounded-xl border border-[#6b7a5e]/[0.08]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#bcccab]/60 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                    <p className="text-[10px] tracking-[0.25em] font-bold text-[#8a8578] uppercase">Did You Know</p>
                  </div>
                  <p className="text-[13px] font-light text-[#acabaa] leading-relaxed">{insight.text}</p>
                </div>
                </div>
              );

              {/* FOR YOU (condition) — left green border */}
              if (type === "condition") return (
                <div key={i} className="flex gap-4 pl-4 border-l-2 border-[#6b7a5e]/40 py-2">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[#bcccab] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>monitor_heart</span>
                      <p className="text-[10px] tracking-[0.25em] font-bold text-[#8a8578] uppercase">For You</p>
                    </div>
                    {insight.title && <h3 className="text-base font-light text-[#e5e2e1] mb-1">{insight.title}</h3>}
                    <p className="text-[13px] font-light text-[#acabaa] leading-relaxed">{insight.text}</p>
                  </div>
                </div>
              );

              {/* DEFAULT */}
              return (
                <div key={i} className="glass-panel p-5 rounded-2xl border border-white/5">
                  <p className="text-[14px] font-light text-[#acabaa] leading-relaxed">{insight.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}

function getDemoData() {
  return {
    score: 87,
    variety: 78,
    nutrition: 62,
    verdict: "Solid protein from the eggs and good fats from the avocado — you're just missing a complex carb to round it out.",
    upgrade: null,
    annotations: [
      { label: "Antioxidant", ingredient: "Tomatoes", position: "top-left" },
      { label: "Cruciferous", ingredient: "Brussels Sprouts", position: "top-right" },
      { label: "Healthy Fats", ingredient: "Avocado", position: "bottom-left" },
      { label: "Complete Protein", ingredient: "Eggs", position: "bottom-right" },
    ],
    insights: [
      { type: "good", text: "Excellent protein-to-fat ratio — eggs provide complete amino acids while avocado adds heart-healthy monounsaturated fats." },
      { type: "missing", title: "Complex Carbs", text: "A source of slow-release energy would round this plate out perfectly.", suggestions: [
        { name: "Sweet Potato" },
        { name: "Quinoa" },
        { name: "Brown Rice" },
      ]},
      { type: "interaction", text: "The fat in avocado is helping your body absorb the fat-soluble vitamins A and K from the brussels sprouts." },
      { type: "fact", text: "The sulforaphane in those brussels sprouts is 3x more bioavailable when you chew them raw for 30 seconds before cooking." },
    ],
    ingredients: ["Tomatoes", "Brussels Sprouts", "Avocado", "Eggs", "Red Pepper Flakes"],
  };
}

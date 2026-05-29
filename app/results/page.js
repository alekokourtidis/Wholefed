"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";
import { getConditions, getProfile, getConditionScoreEnabled } from "../../lib/user-profile";
import { useAuth } from "../../lib/auth";
import { saveScan } from "../../lib/scan-storage";

const funFacts = [
  // Nutrient science
  "Avocados have more potassium than bananas",
  "Eating greens before starch reduces glucose spikes by up to 73%",
  "Dark chocolate has more antioxidants per gram than blueberries",
  "Cooking tomatoes triples their lycopene content",
  "Cinnamon can lower fasting blood sugar by 10-29%",
  "Salmon's omega-3s are 3x better absorbed when eaten with fat",
  "Bell peppers have 3x more vitamin C than oranges per gram",
  "Turmeric absorption increases 2000% when paired with black pepper",
  "Broccoli has more protein per calorie than steak",
  "Kiwi skin has 3x more fiber than the flesh",
  "Frozen vegetables often have more nutrients than fresh — they're flash-frozen at peak ripeness",
  "Olive oil loses most of its antioxidants when heated above 180°C",
  "Vitamin C in food is destroyed within 20 minutes of being cut and exposed to air",
  "Soaking beans overnight reduces their phytic acid by up to 70%, unlocking more minerals",
  "Pairing iron-rich spinach with vitamin C increases iron absorption by up to 6x",
  "Blueberries retain nearly all their antioxidants when frozen",
  "Eating protein within 30 minutes of exercise boosts muscle synthesis by 25%",
  "Resistant starch in cooled rice feeds beneficial gut bacteria more than freshly cooked rice",
  "Steaming broccoli retains 90% of its vitamin C — boiling keeps only 25%",
  "Your body absorbs more beta-carotene from cooked carrots than raw ones",
  "A tablespoon of chia seeds has more omega-3s than a serving of salmon",
  "The calcium in kale is absorbed 27% better than the calcium in milk",
  "Lemon juice added to tea increases catechin absorption by up to 80%",
  "Eating nuts with their skins provides 50% more antioxidants",
  "Garlic must be crushed and left for 10 minutes to activate its key compound, allicin",
  "Fermenting cabbage into sauerkraut creates 200x more bioavailable vitamin C",
  "Bone broth contains collagen peptides that are 90% absorbed by the gut",
  "Purple foods get their color from anthocyanins — one of the most potent antioxidant families",
  "Ground flaxseed is absorbed — whole flaxseed passes straight through you undigested",
  "Eating the white pith of citrus fruits provides as much fiber as the fruit itself",
  // Body facts
  "Your gut microbiome weighs about 2kg — more than your brain",
  "Fermented foods can contain 100x more probiotics than supplements",
  "Your stomach lining replaces itself every 3-4 days",
  "Your liver can regenerate itself from just 25% of its tissue",
  "Chewing food 32 times can reduce calorie absorption by 12%",
  "Your small intestine is about 6 meters long — roughly the height of a giraffe",
  "Your body produces about 1.5 liters of saliva per day",
  "The average person eats about 35 tons of food in their lifetime",
  "Your taste buds regenerate every 10-14 days",
  "Stomach acid is strong enough to dissolve metal — your mucus lining protects you",
  "You have more bacteria in your gut than stars in the Milky Way",
  "90% of your serotonin — the happiness chemical — is made in your gut, not your brain",
  "Your body uses 10% of daily calories just to digest food — it's called the thermic effect",
  "Dehydration of just 2% can reduce cognitive performance by up to 25%",
  "Your nose can detect over 1 trillion different scents — most of your taste is actually smell",
  // Food origins & history
  "Honey never spoils — 3000-year-old honey was found edible in Egyptian tombs",
  "Carrots were originally purple before the 17th century",
  "Black rice was once reserved exclusively for Chinese emperors",
  "Saffron is more expensive by weight than gold",
  "Garlic has been used as currency in ancient Egypt",
  "Cashews grow from the bottom of cashew apples",
  "Tomatoes were considered poisonous in Europe for over 200 years",
  "Vanilla is the second most expensive spice after saffron — each flower is hand-pollinated",
  "Pineapples took 2 years to grow and were so rare in the 1700s that people rented them for parties",
  "Lobster was considered prison food in colonial America — inmates protested eating too much of it",
  "Ketchup was sold as medicine in the 1830s to treat diarrhea",
  "The oldest known recipe is a 4000-year-old Sumerian beer recipe",
  "Chocolate was used as currency by the Aztecs — 10 beans could buy a rabbit",
  "Corn was originally a grass with kernels smaller than a grain of rice — humans bred it over 9000 years",
  "The Caesar salad was invented in Tijuana, Mexico — not Rome",
  "Coffee was discovered when an Ethiopian goat herder noticed his goats dancing after eating berries",
  // Surprising food facts
  "Almonds are technically seeds, not nuts",
  "Pistachios are technically fruits",
  "Peanuts are legumes, not nuts — they grow underground",
  "A single Brazil nut contains your entire daily selenium requirement",
  "Ginger is more effective than Dramamine for motion sickness",
  "Mushrooms are the only plant source of vitamin D",
  "Eating walnuts before bed can boost melatonin levels",
  "Sweet potatoes and regular potatoes are from completely different plant families",
  "Capsaicin in chili peppers tricks your brain into thinking you're on fire",
  "One egg contains all the nutrients to turn a single cell into a baby chicken",
  "Coconut water can be used as an emergency blood plasma substitute",
  "Bananas are slightly radioactive due to their potassium content",
  "Red wine contains the same antioxidant — resveratrol — found in dark chocolate",
  "Asparagus grows up to 7 inches in a single day",
  "Pomegranates can contain up to 1400 seeds each",
  "Eating an apple is more effective at waking you up than coffee",
  "Celery requires more calories to digest than it contains",
  "Strawberries have more vitamin C per serving than oranges",
  "A single strand of spaghetti is called a spaghetto",
  "Honey is the only food that includes all the substances necessary to sustain life",
  "Nutmeg is a hallucinogen in large doses — just 2 tablespoons can be toxic",
  "Cranberries bounce when ripe — farmers use this to sort them",
  "Figs are technically inverted flowers, not fruits",
  "The world's hottest pepper, Pepper X, measures 2.69 million Scoville units",
  "Ripe cranberries will bounce like rubber balls",
  "Apples float because they're 25% air",
  "Grapes explode when microwaved due to their high water content and sugar concentration",
  "The strings on bananas are called phloem bundles — they distribute nutrients",
  "Potatoes can absorb and reflect Wi-Fi signals similarly to the human body",
  "Cucumbers are 96% water — the highest water content of any solid food",
  "An ear of corn always has an even number of rows",
  // Cooking & prep
  "Adding salt to water raises its boiling point by less than 1°C — it's mainly for flavor",
  "Letting meat rest after cooking allows juices to redistribute, keeping it 20% juicier",
  "Brown eggs and white eggs are nutritionally identical — the color depends on the hen's breed",
  "Wooden cutting boards are more sanitary than plastic — wood has natural antibacterial properties",
  "Cast iron pans can leach iron into food, which actually helps people with iron deficiency",
  "Microwaving vegetables preserves more nutrients than boiling — less water means less nutrient loss",
  "Caramelization begins at 160°C — the sugar molecules break apart and reform into 100+ new compounds",
  "Bread goes stale faster in the fridge than at room temperature due to starch retrogradation",
  "The Maillard reaction that browns your steak creates over 600 different flavor compounds",
  "Salting eggplant before cooking draws out bitter compounds and reduces oil absorption by 50%",
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

// Build exact card order based on what's present — 16 confirmed layouts, never deviate
function getInsightOrder(hasMissing, isWarning, hasQS, hasCondition) {
  const order = [];
  if (hasMissing && !isWarning) {
    // Good + Missing: Missing → [For You] → Interaction → [QS] → Good → Fact
    order.push("missing");
    if (hasCondition) order.push("condition");
    order.push("interaction");
    if (hasQS) order.push("quickswap");
    order.push("good", "fact");
  } else if (hasMissing && isWarning) {
    // Warning + Missing: Missing → Warning → [For You] → [QS] → Interaction → Fact
    order.push("missing", "warning");
    if (hasCondition) order.push("condition");
    if (hasQS) order.push("quickswap");
    order.push("interaction", "fact");
  } else if (!hasMissing && !isWarning) {
    // Good + No Missing: [QS] → Good → [For You] → Interaction → Fact
    if (hasQS) order.push("quickswap");
    order.push("good");
    if (hasCondition) order.push("condition");
    order.push("interaction", "fact");
  } else {
    // Warning + No Missing: [QS] → Warning → [For You] → Interaction → Fact
    if (hasQS) order.push("quickswap");
    order.push("warning");
    if (hasCondition) order.push("condition");
    order.push("interaction", "fact");
  }
  return order;
}

function normalizeInsights(raw, hasUpgrade, analysisData) {
  const score = analysisData?.score ?? 0;
  const ingredients = analysisData?.ingredients || [];
  const ing0 = ingredients[0] || "this food";
  const ing1 = ingredients[1] || "the broth";

  // Parse raw insights from AI
  let parsed = [];
  if (raw && Array.isArray(raw)) {
    parsed = raw.map((item) => {
      if (typeof item === "string") return null;
      const text = item.text || item.description || item.content || item.detail || item.body || "";
      if (!text) return null;
      return {
        type: (item.type || "").toLowerCase(),
        text,
        title: item.title || null,
        suggestions: item.suggestions || null,
      };
    }).filter(Boolean);
  }

  // Merge highlight into good (or warning)
  const hasGoodOrWarning = parsed.some((i) => i.type === "good" || i.type === "warning");
  const merged = hasGoodOrWarning ? parsed.filter((i) => i.type !== "highlight") : parsed.map((i) => i.type === "highlight" ? { ...i, type: "good" } : i);

  // Deduplicate
  const seen = new Set();
  const unique = merged.filter((item) => {
    if (seen.has(item.type)) return false;
    seen.add(item.type);
    return true;
  });

  // GUARANTEE required types always exist — fill from actual meal data if AI missed them
  const types = new Set(unique.map((i) => i.type));

  // Every layout needs either "good" or "warning" (never both)
  if (!types.has("good") && !types.has("warning")) {
    if (score >= 50) {
      unique.push({ type: "good", text: `Good balance with ${ing0.toLowerCase()} providing solid nutritional value.` });
    } else {
      unique.push({ type: "warning", text: `This meal is highly processed with limited nutritional diversity — consider adding whole foods.` });
    }
  }

  // Every layout needs "interaction"
  if (!types.has("interaction")) {
    if (ingredients.length >= 2) {
      unique.push({ type: "interaction", text: `The sodium in ${ing0.toLowerCase()} combined with ${ing1.toLowerCase()} increases overall salt intake — pairing with potassium-rich foods like banana or spinach would help balance electrolytes.` });
    } else {
      unique.push({ type: "interaction", text: `With only one main ingredient, there are no meaningful nutrient interactions — adding a vegetable or protein would create beneficial nutrient pairings.` });
    }
  }

  // Every layout needs "fact"
  if (!types.has("fact")) {
    unique.push({ type: "fact", text: `${ing0} is one of the most consumed foods worldwide — over 100 billion servings are eaten annually across Asia alone.` });
  }

  // Detect what's present (after filling)
  const hasMissing = unique.some((i) => i.type === "missing");
  const isWarning = unique.some((i) => i.type === "warning");
  const hasCondition = unique.some((i) => i.type === "condition");

  // Get the exact order for this combination
  const order = getInsightOrder(hasMissing, isWarning, !!hasUpgrade, hasCondition);

  // Inject quickswap placeholder if needed
  if (hasUpgrade && order.includes("quickswap")) {
    unique.push({ type: "quickswap", text: "" });
  }

  // Sort into the exact confirmed order
  const sorted = unique.sort((a, b) => {
    const ai = order.indexOf(a.type);
    const bi = order.indexOf(b.type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Remove any types not in the order (unknown types)
  return sorted.filter((item) => order.includes(item.type));
}

function IngredientsRow({ items, onAdd, onRemove, onRescore, hasChanges }) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] tracking-[0.25em] font-bold text-[#8a8578] uppercase block px-1">
        Detected Ingredients
      </span>
      <div className="flex flex-wrap gap-2.5 pt-1">
        {items.map((ing, i) => (
          <div
            key={i}
            className="relative inline-block"
          >
            <span className="text-[12px] font-light text-[#d4cfc4] px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] inline-block">
              {ing}
            </span>
            <button
              onClick={() => onRemove(ing)}
              className="absolute -top-1 -right-1 w-[13px] h-[13px] flex items-center justify-center text-white/45 active:text-white/90 active:scale-90 transition-all leading-none"
              aria-label={`Remove ${ing}`}
              style={{ fontSize: "13px" }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onAdd}
          className="flex-1 text-[12px] font-medium text-[#bcccab] py-2 rounded-lg bg-[#6b7a5e]/25 border border-[#bcccab]/20 active:scale-[0.98] transition-all leading-none"
        >
          + Add ingredient
        </button>
        <button
          onClick={hasChanges ? onRescore : undefined}
          disabled={!hasChanges}
          className={`flex-1 text-[12px] font-medium py-2 rounded-lg border transition-all leading-none ${
            hasChanges
              ? "text-[#a8c49e] bg-[#8aab7f]/25 border-[#a8c49e]/30 active:scale-[0.98]"
              : "text-[#a8c49e]/40 bg-[#8aab7f]/[0.08] border-[#a8c49e]/10 cursor-default"
          }`}
        >
          Re-score
        </button>
      </div>
    </div>
  );
}

function AddIngredientModal({ onAdd, onClose, existingIngredients }) {
  const [search, setSearch] = useState("");
  const [db, setDb] = useState([]);
  useEffect(() => {
    import("../../lib/food-database").then((m) => setDb(m.FOOD_DATABASE || []));
  }, []);
  const filtered = search.trim().length >= 2
    ? db.filter((f) =>
        f.toLowerCase().includes(search.toLowerCase()) &&
        !existingIngredients.some((e) => e.toLowerCase() === f.toLowerCase())
      ).slice(0, 8)
    : [];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#1a1a1a] rounded-t-3xl px-6 pt-5 pb-10 border-t border-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <p className="text-[10px] tracking-[0.25em] uppercase text-[#8a8578] font-bold mb-3">Add Ingredient</p>
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 focus-within:border-[#6b7a5e]/40 transition-colors">
          <span className="material-symbols-outlined text-[#8a8578]/40 text-lg">search</span>
          <input
            type="text"
            placeholder="Search foods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-[14px] font-light text-[#d4cfc4] placeholder:text-[#8a8578]/30 outline-none"
          />
        </div>
        {filtered.length > 0 && (
          <div className="mt-2 max-h-64 overflow-y-auto no-scrollbar rounded-xl border border-white/[0.06] bg-[#1c2623]">
            {filtered.map((f) => (
              <button
                key={f}
                onClick={() => { onAdd(f); onClose(); }}
                className="w-full text-left px-4 py-3 text-[13px] font-light text-[#d4cfc4] active:bg-white/[0.04] border-b border-white/[0.03] last:border-0 transition-colors"
              >
                {f}
              </button>
            ))}
          </div>
        )}
        {search.trim().length >= 2 && filtered.length === 0 && (
          <p className="text-[12px] font-light text-[#8a8578]/40 mt-3 text-center">
            No matching food found
          </p>
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fact, setFact] = useState("");
  const [frostAmount, setFrostAmount] = useState(0);
  const [extraIngredients, setExtraIngredients] = useState([]);
  const [removedIngredients, setRemovedIngredients] = useState([]);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [userConditions, setUserConditions] = useState([]);

  useEffect(() => {
    try { setUserConditions(getConditions() || []); } catch {}
  }, []);

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    setFrostAmount(Math.min(scrollTop / 200, 1));
  };

  useEffect(() => {
    setFact(getUnseenFact());
  }, []);

  useEffect(() => {
    // Check if viewing a saved scan from history (no re-analysis needed)
    let savedScan = null;
    try { savedScan = JSON.parse(sessionStorage.getItem("wholefed_saved_scan")); } catch {}
    if (savedScan && new URLSearchParams(window.location.search).get("scan")) {
      setImageUrl(savedScan.image || "/healthymeal1.jpg");
      setAnalysis({
        score: savedScan.score || 0,
        variety: savedScan.variety || 0,
        nutrition: savedScan.nutrition || 0,
        verdict: savedScan.verdict || "",
        ingredients: savedScan.ingredients || [],
        insights: savedScan.insights || [],
        annotations: savedScan.annotations || [],
        upgrade: savedScan.upgrade || null,
        title: savedScan.name || "Meal Scan",
      });
      setLoading(false);
      sessionStorage.removeItem("wholefed_saved_scan");
      return;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Try sessionStorage first, then window global fallback
    const img = sessionStorage.getItem("wholefed_image") || window.__wholefed_image;
    const base64 = sessionStorage.getItem("wholefed_image_base64") || window.__wholefed_base64;
    const textDescription = sessionStorage.getItem("wholefed_text_description");
    // STRICT RULE: text mode is ONLY when there's no actual image. If we have
    // a real data:image base64, this is an image scan, period. Stale
    // text_description from a previous scan cannot make this a text scan.
    const hasRealImage = typeof base64 === "string" && base64.startsWith("data:");
    const isTextScanPreCheck =
      !hasRealImage &&
      (!!textDescription || (typeof base64 === "string" && base64.startsWith("text:")));
    setImageUrl(isTextScanPreCheck ? null : (img || "/healthymeal1.jpg"));
    // Belt and suspenders: if this is an image scan, wipe any stale text
    // description so it doesn't leak into the next scan.
    if (hasRealImage) {
      try { sessionStorage.removeItem("wholefed_text_description"); } catch {}
    }

    // Sample meal short-circuit — onboarding / "Try with a sample meal"
    // stashes a canned analysis so we render an idealized result instantly
    // without spending an API call or risking variability.
    let sampleAnalysis = null;
    try {
      const raw = sessionStorage.getItem("wholefed_sample_analysis");
      if (raw) sampleAnalysis = JSON.parse(raw);
    } catch {}
    if (sampleAnalysis) {
      setAnalysis(sampleAnalysis);
      saveScan({
        id: Date.now(),
        name: sampleAnalysis.title,
        date: new Date().toISOString(),
        score: sampleAnalysis.score,
        variety: sampleAnalysis.variety,
        nutrition: sampleAnalysis.nutrition,
        image: (base64 && base64.startsWith("data:")) ? base64 : (img || "/healthymeal1.jpg"),
        verdict: sampleAnalysis.verdict,
        ingredients: sampleAnalysis.ingredients,
        insights: sampleAnalysis.insights,
        annotations: sampleAnalysis.annotations,
        upgrade: sampleAnalysis.upgrade,
      }, user?.id);
      setLoading(false);
      sessionStorage.removeItem("wholefed_sample_analysis");
      return;
    }

    const analyzeImage = async () => {
      let imageData = base64;
      const isTextScan = isTextScanPreCheck;
      if (isTextScan) {
        // Already set imageUrl to null above
      } else if (!imageData) {
        // No uploaded image — use demo image as last resort
        const res = await fetch("/healthymeal1.jpg");
        if (!res.ok) throw new Error("Sample image not found");
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
        const conditionScoreEnabled = getConditionScoreEnabled();
        let labs = null;
        const labsEnabled = localStorage.getItem("wholefed_labs_enabled") !== "false";
        if (labsEnabled) {
          try { labs = JSON.parse(localStorage.getItem("wholefed_labs")); } catch {}
        }
        const body = isTextScan
          ? { description: textDescription || base64?.replace(/^text:/, ""), conditions, profile, labs, conditionScoreEnabled }
          : { image: imageData, conditions, profile, labs, conditionScoreEnabled };
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.error) {
          console.warn("API error:", data.error);
          setAnalysis({ _error: true });
          setLoading(false);
          return;
        }
        if (data._notFood) {
          setAnalysis({ _notFood: true, detected: data.detected });
          setLoading(false);
          return;
        }
        {
          setAnalysis(data);
          // Save to scan history (localStorage + Supabase if authenticated)
          saveScan({
            id: Date.now(),
            name: data.title || data.verdict?.split("—")[0]?.split("–")[0]?.trim().slice(0, 40) || "Meal Scan",
            date: new Date().toISOString(),
            score: data.score,
            variety: data.variety,
            nutrition: data.nutrition,
            image: isTextScan
              ? "text"
              : (base64 && base64.startsWith("data:")) ? base64 : (img || "/healthymeal1.jpg"),
            verdict: data.verdict,
            ingredients: data.ingredients,
            insights: data.insights,
            annotations: data.annotations,
            upgrade: data.upgrade,
          }, user?.id);
        }
      } catch (err) {
        console.warn("Fetch failed:", err);
        setAnalysis({ _error: true });
      }
      setLoading(false);
      // Haptic feedback on score reveal
      try {
        if (window.Capacitor?.isNativePlatform?.()) {
          import("@capacitor/haptics").then(({ Haptics, NotificationType }) => {
            Haptics.notification({ type: NotificationType.Success });
          });
        }
      } catch {}
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

  if (analysis?._notFood) {
    return (
      <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center gap-5 px-10">
        <span className="material-symbols-outlined text-[48px] text-[#bcccab]/70" style={{ fontVariationSettings: "'wght' 200" }}>
          no_food
        </span>
        <p className="text-[#d4cfc4] text-base font-light text-center">
          That doesn&apos;t look like food
        </p>
        <p className="text-[#8a8578] text-xs font-light text-center max-w-xs">
          Wholefed only analyzes meals. Try scanning food in front of you, uploading a meal photo, or describing your meal in text.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-2 px-8 py-3 rounded-full bg-[#bcccab]/20 text-[#bcccab] text-sm font-medium"
        >
          Try a Different Scan
        </button>
        <BottomNav />
      </div>
    );
  }

  if (analysis?._error) {
    return (
      <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center gap-6 px-10">
        <span className="material-symbols-outlined text-[48px] text-[#8a8578]">cloud_off</span>
        <p className="text-[#d4cfc4] text-base font-light text-center">
          Something went wrong analyzing your meal
        </p>
        <p className="text-[#8a8578] text-xs font-light text-center">
          Please check your connection and try again.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-8 py-3 rounded-full bg-[#bcccab]/20 text-[#bcccab] text-sm font-medium"
        >
          Try Again
        </button>
        <BottomNav />
      </div>
    );
  }

  const { score: rawScore = 0, variety: rawVariety = 0, nutrition: rawNutrition = 0, annotations = [], ingredients = [] } = analysis || {};
  const score = Math.round(rawScore);
  const variety = Math.round(rawVariety);
  const nutrition = Math.round(rawNutrition);

  // Validate upgrade first — needed to determine insight order
  const upgrade = analysis?.upgrade && ingredients?.some(
    ing => ing.toLowerCase().includes(analysis.upgrade.from?.toLowerCase())
  ) ? analysis.upgrade : null;

  // Normalize insights — guaranteed to produce one of 16 valid layouts
  // Required cards (good/warning, interaction, fact) are auto-filled from meal data if AI missed them
  const insights = normalizeInsights(analysis.insights, !!upgrade, analysis);

  return (
    <div
      className="fixed inset-0 bg-surface text-on-surface overflow-y-auto no-scrollbar"
      onScroll={handleScroll}
    >
      {/* Sticky photo at top */}
      <div className="sticky top-0 h-[45vh] w-full z-0 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Your meal"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1c2623] via-[#0f1a16] to-[#131313] px-8">
            <div className="text-center space-y-3 max-w-md">
              <span className="material-symbols-outlined text-[#bcccab] text-4xl" style={{ fontVariationSettings: "'wght' 200" }}>
                edit_note
              </span>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#bcccab]/70">
                Text scan
              </p>
              {(() => {
                let desc = "";
                try { desc = sessionStorage.getItem("wholefed_text_description") || ""; } catch {}
                if (!desc) return null;
                return (
                  <p className="text-[14px] font-light text-[#d4cfc4] italic leading-relaxed">
                    &ldquo;{desc}&rdquo;
                  </p>
                );
              })()}
            </div>
          </div>
        )}
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
        {/* Floating annotation pills — only when we have a real photo. For
            text scans there is no image to overlay on. */}
        <div
          className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-500"
          style={{ opacity: 1 - frostAmount }}
        >
            {imageUrl && annotations?.map((a, i) => {
              // Use AI-provided x/y coordinates, clamped to safe area
              const x = Math.max(3, Math.min(a.x ?? 50, 55));
              const y = Math.max(15, Math.min(a.y ?? 50, 70));
              return (
                <div
                  key={i}
                  className="absolute glass-panel px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-xl z-20"
                  style={{ top: `${y}%`, left: `${x}%` }}
                >
                  <div className="w-1 h-1 rounded-full bg-[#bcccab] shadow-[0_0_6px_rgba(188,204,171,0.8)]" />
                  <span className="text-[8px] tracking-[0.2em] uppercase font-bold text-white whitespace-nowrap">
                    {a.label}
                  </span>
                </div>
              );
            })}
          </div>
      </div>

      {/* Analysis panel — slides up over the photo */}
      <div className="relative z-10 bg-surface rounded-t-3xl -mt-6 min-h-screen pb-44">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <section className="px-8 pt-2 flex flex-col gap-3">
          {/* Score Ring — fancy double ring */}
          <div className="flex justify-center items-center py-1" data-onboarding="score-ring">
            <div className="relative w-36 h-36 flex items-center justify-center">
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
                    <stop offset="0%" stopColor={score >= 70 ? "#a8c49e" : "#8a9e7a"} />
                    <stop offset="50%" stopColor={score >= 70 ? "#6b8a5e" : "#5e7a4e"} />
                    <stop offset="100%" stopColor={score >= 70 ? "#2d5a23" : "#3d5a2d"} />
                  </linearGradient>
                </defs>
              </svg>
              {/* Score number */}
              <div className="flex flex-col items-center score-number">
                <span className="text-[56px] font-extralight text-[#e5e2e1] leading-none tracking-[-0.03em]">
                  {score}
                </span>
                <span className="text-[7.5px] tracking-[0.3em] uppercase text-[#8a8578] mt-1.5 font-medium">
                  Total Score
                </span>
              </div>
            </div>
          </div>

          {/* Verdict — above bars */}
          {analysis?.verdict && (
            <div className="px-2 -mt-2" data-onboarding="verdict">
              <p className="text-[13px] font-light text-[#d4cfc4]/80 leading-relaxed text-center">
                {analysis.verdict}
              </p>
            </div>
          )}

          {/* Variety + Nutrition bars */}
          <div className="space-y-3 px-2" data-onboarding="bars">
            {[
              { label: "Variety", value: variety, icon: "spa" },
              { label: "Nutrition", value: nutrition, icon: "bolt" },
            ].map((bar) => (
              <div key={bar.label} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] tracking-[0.25em] font-bold text-[#8a8578] uppercase">
                    {bar.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-light text-[#d4cfc4]">{bar.value}/10</span>
                    <span className="material-symbols-outlined text-[#6b7a5e] text-sm">{bar.icon}</span>
                  </div>
                </div>
                <div className="relative h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      width: `${(bar.value / 10) * 100}%`,
                      background: "linear-gradient(90deg, #3d4b32 0%, #6b7a5e 50%, #8aab7f 100%)",
                      animation: "barFill 1.5s ease-out forwards",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Detected Ingredients Strip */}
          {ingredients && ingredients.length > 0 && (
            <IngredientsRow
              items={[...ingredients, ...extraIngredients].filter((i) => !removedIngredients.includes(i))}
              onAdd={() => setShowAddIngredient(true)}
              onRemove={(ing) => {
                if (extraIngredients.includes(ing)) {
                  setExtraIngredients((prev) => prev.filter((i) => i !== ing));
                } else {
                  setRemovedIngredients((prev) => [...prev, ing]);
                }
              }}
              hasChanges={extraIngredients.length > 0 || removedIngredients.length > 0}
              onRescore={async () => {
                const finalList = [...ingredients, ...extraIngredients].filter((i) => !removedIngredients.includes(i));
                if (finalList.length === 0) return;
                setLoading(true);
                try {
                  const conditions = getConditions();
                  const profile = getProfile();
                  const conditionScoreEnabled = getConditionScoreEnabled();
                  let labs = null;
                  const labsEnabled = localStorage.getItem("wholefed_labs_enabled") !== "false";
                  if (labsEnabled) {
                    try { labs = JSON.parse(localStorage.getItem("wholefed_labs")); } catch {}
                  }
                  const description = `Meal contains: ${finalList.join(", ")}`;
                  const res = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ description, conditions, profile, labs, conditionScoreEnabled }),
                  });
                  const data = await res.json();
                  if (!data.error) {
                    setAnalysis(data);
                    setExtraIngredients([]);
                    setRemovedIngredients([]);
                  }
                } catch {}
                setLoading(false);
              }}
            />
          )}

          {/* Insight Cards — each type has a visually distinct layout */}
          <div className="space-y-5 pt-2" data-onboarding="insights">
            {insights.map((insight, i) => {
              const type = insight.type?.toLowerCase() || "interaction";

              {/* QUICK SWAP — standalone card (position determined by normalizeInsights) */}
              if (type === "quickswap") return upgrade ? (
                <div key={i} className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  <p className="text-[10px] tracking-[0.25em] font-bold text-[#bcccab] uppercase mb-3">Quick Swap</p>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-light text-[#e5e2e1]">{upgrade.from}</span>
                    <span className="material-symbols-outlined text-[#8a8578] text-xl">east</span>
                    <span className="text-lg font-medium text-white">{upgrade.to}</span>
                  </div>
                </div>
              ) : null;

              {/* GOOD — checkmark icon */}
              if (type === "good") return (
                <div key={i} className="py-3 px-2 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#8aab7f] text-lg flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <p className="text-[14px] font-light text-[#d4cfc4] leading-relaxed">{insight.text}</p>
                </div>
              );

              {/* WARNING — same style as good, warning icon, same green */}
              if (type === "warning") return (
                <div key={i} className="py-3 px-2 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#8aab7f] text-lg flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  <p className="text-[14px] font-light text-[#d4cfc4] leading-relaxed">{insight.text}</p>
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
                  {insight.suggestions && insight.suggestions.length > 0 && (
                    <div className="flex items-center justify-evenly pt-3 mt-3 border-t border-white/[0.04]">
                      {insight.suggestions.map((s, j) => (
                        <div key={j} className="flex items-center">
                          {j > 0 && <span className="text-[#8a8578]/30 mr-4">•</span>}
                          <span className="text-[11px] font-light text-[#bcccab]/50">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );

              {/* NUTRIENT INTERACTION */}
              if (type === "interaction") return (
                <div key={i} className="py-4 px-2">
                  <p className="text-[10px] tracking-[0.25em] font-bold text-[#8a8578] uppercase mb-2">Nutrient Interaction</p>
                  <p className="text-[14px] font-light text-[#acabaa] leading-relaxed">{insight.text}</p>
                </div>
              );

              {/* FOR YOU (condition) — left green border */}
              if (type === "condition") {
                const conditionLabel = userConditions.length > 0
                  ? `Personalized for ${userConditions.slice(0, 2).join(" + ")}${userConditions.length > 2 ? ` +${userConditions.length - 2}` : ""}`
                  : "Personalized for your health";
                return (
                  <div key={i} className="flex gap-4 pl-4 border-l-2 border-[#6b7a5e]/40 py-2">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[#bcccab] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>monitor_heart</span>
                        <p className="text-[10px] tracking-[0.25em] font-bold text-[#bcccab] uppercase">{conditionLabel}</p>
                      </div>
                      {insight.title && <h3 className="text-base font-light text-[#e5e2e1] mb-1">{insight.title}</h3>}
                      <p className="text-[13px] font-light text-[#acabaa] leading-relaxed">{insight.text}</p>
                    </div>
                  </div>
                );
              }

              {/* DID YOU KNOW */}
              if (type === "fact") return (
                <div key={i} className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#bcccab]/60 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                    <p className="text-[10px] tracking-[0.25em] font-bold text-[#8a8578] uppercase">Did You Know</p>
                  </div>
                  <p className="text-[13px] font-light text-[#acabaa] leading-relaxed">{insight.text}</p>
                </div>
              );

              {/* DEFAULT */}
              return (
                <div key={i} className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  <p className="text-[14px] font-light text-[#acabaa] leading-relaxed">{insight.text}</p>
                </div>
              );
            })}

          </div>
        </section>
      </div>

      {/* Sticky Rescan button — always visible above the bottom nav,
          regardless of scroll position. */}
      <div
        className="fixed left-0 right-0 z-40 px-6"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 5.25rem)",
        }}
      >
        <button
          onClick={() => router.push("/")}
          className="w-full py-2.5 rounded-xl bg-[#6b7a5e] text-white text-[13px] font-medium tracking-wide active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/50"
        >
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'wght' 400" }}>
            photo_camera
          </span>
          Scan another meal
        </button>
      </div>

      <BottomNav />

      {showAddIngredient && (
        <AddIngredientModal
          existingIngredients={[...ingredients, ...extraIngredients]}
          onAdd={(food) => setExtraIngredients((prev) => [...prev, food])}
          onClose={() => setShowAddIngredient(false)}
        />
      )}
    </div>
  );
}


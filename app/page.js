"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "./components/BottomNav";
import { canScan, scansRemaining, incrementScanCount, isPro } from "../lib/scans";

// Check if running inside Capacitor native shell
function isNative() {
  return typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.();
}

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [remaining, setRemaining] = useState(3);
  const [pro, setPro] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    setRemaining(scansRemaining());
    setPro(isPro());

    // Request camera permission proactively on launch so the iOS prompt
    // appears immediately rather than the first time the user taps the
    // shutter. No-op on web or if already granted/denied.
    (async () => {
      if (!isNative()) return;
      try {
        const { Camera } = await import("@capacitor/camera");
        const status = await Camera.checkPermissions();
        if (status.camera === "prompt" || status.camera === "prompt-with-rationale") {
          await Camera.requestPermissions({ permissions: ["camera"] });
        }
      } catch {}
    })();
  }, []);

  // Listen for scan tab tap from BottomNav (Apple reviewers tap the labeled
  // "Scan" tab in the nav rather than the unlabeled shutter circle).
  useEffect(() => {
    const onScan = () => handleShutter();
    const onSample = () => handleSampleScan();
    window.addEventListener("wholefed:scan", onScan);
    window.addEventListener("wholefed:trySample", onSample);
    return () => {
      window.removeEventListener("wholefed:scan", onScan);
      window.removeEventListener("wholefed:trySample", onSample);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compress image to max 1200px and JPEG quality 0.7 to fit in sessionStorage
  const compressBase64 = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1200;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = (height / width) * maxSize; width = maxSize; }
          else { width = (width / height) * maxSize; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = src;
    });

  const toBase64FromFile = (file) => compressBase64(URL.createObjectURL(file));

  const storeAndNavigate = async (displayUrl, base64) => {
    // Clear any stale scan-mode state from previous scans so the results
    // page doesn't think we're still in text or sample mode.
    try { sessionStorage.removeItem("wholefed_text_description"); } catch {}
    try { sessionStorage.removeItem("wholefed_saved_scan"); } catch {}
    try { sessionStorage.setItem("wholefed_image", displayUrl); } catch {}
    try { sessionStorage.setItem("wholefed_image_base64", base64); } catch {}
    window.__wholefed_base64 = base64;
    window.__wholefed_image = displayUrl;
    router.push("/results");
  };

  // Check whether the user is allowed to scan (does NOT consume a scan).
  // We only burn a scan after a photo is actually captured.
  const tryScan = () => {
    if (!canScan()) {
      router.push("/subscribe");
      return false;
    }
    return true;
  };

  const consumeScan = () => {
    incrementScanCount();
    setRemaining(scansRemaining());
  };

  const triggerHaptic = async () => {
    try {
      if (isNative()) {
        const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
    } catch {}
  };

  // Use the standard HTML file input for camera on ALL platforms (native +
  // web). The Capacitor Camera plugin has proven unreliable across iOS
  // versions (fails silently on iOS 26, hangs on some devices). The HTML
  // <input type="file" accept="image/*" capture="environment"> always works
  // in WKWebView and opens the exact same system camera UI.
  const handleShutter = () => {
    triggerHaptic();
    setCameraError("");
    if (!tryScan()) return;
    if (fileRef.current) {
      fileRef.current.setAttribute("capture", "environment");
      fileRef.current.click();
    }
  };

  const handleGallery = () => {
    setCameraError("");
    if (!tryScan()) return;
    if (fileRef.current) {
      fileRef.current.removeAttribute("capture");
      fileRef.current.click();
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!tryScan()) return;
    const base64 = await toBase64FromFile(file);
    const url = URL.createObjectURL(file);
    consumeScan();
    await storeAndNavigate(url, base64);
  };

  // Sample meal pool. The FIRST tap always shows the original 88-score
  // avocado-toast-bowl so onboarding has a predictable result. Tap #2 and
  // tap #3 pick randomly (without repeat) from the 40-80 score pool so
  // users see real variety: a decent score, a mediocre one, etc.
  // All canned — no API call, no variability per analysis.
  const FIRST_SAMPLE = {
    image: "/healthymeal1.jpg",
    title: "Avocado Toast Bowl",
    score: 88,
    variety: 8,
    nutrition: 9,
    verdict: "Strong meal. Eggs and avocado cover protein and healthy fats, greens and tomatoes add color and antioxidants. The one gap is a complex carb to round it out.",
    ingredients: ["Eggs", "Avocado", "Cherry Tomatoes", "Baby Spinach", "Olive Oil", "Sea Salt", "Black Pepper"],
    upgrade: null,
    annotations: [
      { label: "Complete Protein", ingredient: "Eggs", x: 30, y: 45 },
      { label: "Healthy Fats", ingredient: "Avocado", x: 60, y: 50 },
      { label: "Lycopene Rich", ingredient: "Cherry Tomatoes", x: 75, y: 65 },
    ],
    insights: [
      { type: "good", text: "Eggs and avocado give you a complete protein and a heavy dose of monounsaturated fats — a great hormone-supporting combination." },
      { type: "missing", title: "Add Complex Carbs", text: "A slice of sourdough or some quinoa would round this out and give sustained energy.", suggestions: [{ emoji: "🍠", name: "Sweet Potato" }, { emoji: "🌾", name: "Quinoa" }] },
      { type: "interaction", text: "The fat in the avocado boosts absorption of the lycopene in the tomatoes by up to 4x compared to eating them dry." },
      { type: "fact", text: "Egg yolks are one of the richest dietary sources of choline, a nutrient most adults don't get enough of and that's critical for brain and liver function." },
    ],
  };

  const RANDOM_POOL = [
    {
      image: "/healthymeal1.jpg",
      title: "Chicken & Rice Bowl",
      score: 67,
      variety: 6,
      nutrition: 7,
      verdict: "Decent lunch. Chicken delivers solid protein and the broccoli helps, but the white rice and soy-heavy sauce drag this down. Switch to brown rice and you're in the 80s.",
      ingredients: ["Grilled Chicken Breast", "White Rice", "Broccoli", "Carrots", "Soy Sauce", "Sesame Seeds", "Scallions"],
      upgrade: { from: "White Rice", to: "Brown Rice" },
      annotations: [
        { label: "Lean Protein", ingredient: "Grilled Chicken Breast", x: 40, y: 45 },
        { label: "Simple Carbs", ingredient: "White Rice", x: 55, y: 60 },
        { label: "Cruciferous", ingredient: "Broccoli", x: 25, y: 70 },
      ],
      insights: [
        { type: "good", text: "Lean protein and at least one cruciferous vegetable — the bones of a real meal." },
        { type: "missing", title: "Better Carb Source", text: "White rice is a fast-burning simple carb. Brown rice or quinoa gives you fiber and slower-release energy.", suggestions: [{ emoji: "🍚", name: "Brown Rice" }, { emoji: "🌾", name: "Quinoa" }] },
        { type: "interaction", text: "Vitamin C from broccoli helps your body absorb the heme iron in chicken about 2x more efficiently." },
        { type: "fact", text: "Chicken breast has roughly the same protein per gram as whey isolate, but with a fraction of the absorption speed — better for sustained satiety." },
      ],
    },
    {
      image: "/healthymeal1.jpg",
      title: "Beef Burrito",
      score: 52,
      variety: 5,
      nutrition: 5,
      verdict: "Mid-tier. Real protein and some vegetables underneath, but the refined-flour tortilla and cheese pile on simple carbs and saturated fat. A bowl version without the wrap would jump 15+ points.",
      ingredients: ["Flour Tortilla", "Ground Beef", "Shredded Cheese", "Iceberg Lettuce", "Sour Cream", "Salsa", "White Rice"],
      upgrade: { from: "Flour Tortilla", to: "Burrito Bowl (no tortilla)" },
      annotations: [
        { label: "Refined Grain", ingredient: "Flour Tortilla", x: 50, y: 40 },
        { label: "Saturated Fat", ingredient: "Shredded Cheese", x: 60, y: 55 },
        { label: "Protein", ingredient: "Ground Beef", x: 40, y: 50 },
      ],
      insights: [
        { type: "good", text: "There's real protein from the beef and at least a bit of fresh produce from the salsa." },
        { type: "missing", title: "Add Fiber & Color", text: "Beans, black beans, or a side of guacamole would massively boost the fiber and healthy-fat profile.", suggestions: [{ emoji: "🥑", name: "Guacamole" }, { emoji: "🫘", name: "Black Beans" }] },
        { type: "interaction", text: "The fat from the cheese and sour cream slows glucose spikes from the white tortilla — a small upside in an otherwise carb-heavy meal." },
        { type: "fact", text: "A 10-inch flour tortilla has roughly the same refined-carb load as 3 slices of white bread." },
      ],
    },
    {
      image: "/healthymeal1.jpg",
      title: "Buddha Bowl",
      score: 76,
      variety: 8,
      nutrition: 8,
      verdict: "Genuinely good meal. Plant protein from the chickpeas, complex carbs from sweet potato, healthy fat from tahini, and four different vegetables. Would have hit 85+ with a stronger protein source.",
      ingredients: ["Roasted Chickpeas", "Sweet Potato", "Kale", "Red Cabbage", "Tahini Dressing", "Pumpkin Seeds", "Lemon"],
      upgrade: null,
      annotations: [
        { label: "Plant Protein", ingredient: "Roasted Chickpeas", x: 35, y: 45 },
        { label: "Beta Carotene", ingredient: "Sweet Potato", x: 55, y: 55 },
        { label: "Iron Rich", ingredient: "Kale", x: 30, y: 65 },
      ],
      insights: [
        { type: "good", text: "Four distinct vegetables, real complex carbs, and plant protein with healthy fats from the tahini. This is what a balanced plant-forward meal looks like." },
        { type: "interaction", text: "The lemon's vitamin C boosts iron absorption from the kale by roughly 5-6x compared to eating greens with no acid present." },
        { type: "fact", text: "Red cabbage has more vitamin C per gram than oranges, and the color comes from anthocyanins — the same antioxidants in blueberries." },
      ],
    },
    {
      image: "/healthymeal1.jpg",
      title: "Sushi Roll Plate",
      score: 61,
      variety: 6,
      nutrition: 6,
      verdict: "Decent on paper but the white rice does most of the work calorically. The fish is excellent and the seaweed contributes minerals you rarely get elsewhere. Sashimi or brown-rice rolls would push this to the 80s.",
      ingredients: ["Tuna", "Salmon", "White Rice", "Nori", "Cucumber", "Avocado", "Soy Sauce", "Pickled Ginger"],
      upgrade: { from: "White Rice", to: "Brown Rice (or sashimi)" },
      annotations: [
        { label: "Omega-3 Rich", ingredient: "Salmon", x: 40, y: 45 },
        { label: "Mineral Rich", ingredient: "Nori", x: 50, y: 35 },
        { label: "Simple Carbs", ingredient: "White Rice", x: 55, y: 60 },
      ],
      insights: [
        { type: "good", text: "Two omega-3 sources and a serving of nori — the iodine and trace minerals from seaweed are hard to get from any other food." },
        { type: "missing", title: "More Veggies", text: "Add a side salad or seaweed salad to bring the variety and fiber up.", suggestions: [{ emoji: "🥗", name: "Seaweed Salad" }, { emoji: "🥒", name: "Edamame" }] },
        { type: "interaction", text: "The acidity of pickled ginger between bites genuinely resets your palate AND helps stimulate digestive enzymes for the protein." },
        { type: "fact", text: "Wild salmon has nearly 10x the omega-3 to omega-6 ratio of farmed salmon, which is why color and source matter more than people think." },
      ],
    },
  ];

  // Text-only flow: user types a meal description (no image). Sends to
  // /api/analyze with description instead of image; results page treats it
  // as a text scan.
  const [showTextEntry, setShowTextEntry] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textSubmitting, setTextSubmitting] = useState(false);

  const submitTextDescription = async () => {
    const desc = textInput.trim();
    if (!desc) return;
    if (!tryScan()) return;
    setTextSubmitting(true);
    try {
      // Stash the description as the "image" payload via a special prefix
      // that /results recognizes and forwards to /api/analyze as text.
      const payload = `text:${desc}`;
      try {
        sessionStorage.removeItem("wholefed_sample_analysis");
        sessionStorage.removeItem("wholefed_saved_scan");
        sessionStorage.setItem("wholefed_image", "");
        sessionStorage.setItem("wholefed_image_base64", payload);
        sessionStorage.setItem("wholefed_text_description", desc);
      } catch {}
      consumeScan();
      router.push("/results");
    } catch (err) {
      console.warn("Text scan error:", err);
    }
    setTextSubmitting(false);
    setShowTextEntry(false);
    setTextInput("");
  };

  const handleSampleScan = async () => {
    triggerHaptic();
    if (!tryScan()) return;
    try {
      const scansAlreadyUsed = 3 - scansRemaining();
      let sample;
      if (scansAlreadyUsed === 0) {
        // First sample tap always shows the original avocado bowl
        sample = FIRST_SAMPLE;
      } else {
        // 2nd / 3rd tap: pick a random non-repeated sample from the 40-80 pool
        const usedRaw = sessionStorage.getItem("wholefed_sample_used") || "[]";
        let used;
        try { used = JSON.parse(usedRaw); } catch { used = []; }
        const availableIdx = RANDOM_POOL.map((_, i) => i).filter((i) => !used.includes(i));
        const pickFrom = availableIdx.length > 0 ? availableIdx : RANDOM_POOL.map((_, i) => i);
        const choiceIdx = pickFrom[Math.floor(Math.random() * pickFrom.length)];
        sample = RANDOM_POOL[choiceIdx];
        try {
          sessionStorage.setItem("wholefed_sample_used", JSON.stringify([...used, choiceIdx]));
        } catch {}
      }

      const res = await fetch(sample.image);
      if (!res.ok) throw new Error("Sample image not found");
      const blob = await res.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      const compressed = await compressBase64(base64);

      const { image, ...analysis } = sample;
      try {
        sessionStorage.removeItem("wholefed_text_description");
        sessionStorage.setItem("wholefed_sample_analysis", JSON.stringify(analysis));
      } catch {}
      consumeScan();
      await storeAndNavigate(compressed, compressed);
    } catch (err) {
      console.warn("Sample scan error:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Camera viewfinder area — pure black until the native camera opens */}
      <div className="absolute inset-0">
        {/* Corner bracket focus frame — sized to fit the available area */}
        <div className="absolute inset-0 flex items-center justify-center pt-32 pb-48">
          <div className="relative w-[min(94vw,546px)] h-[min(60vh,560px)] drop-shadow-[0_0_12px_rgba(188,204,171,0.3)]">
            <div className="absolute top-0 left-0 w-14 h-14 border-t-2 border-l-2 border-[#bcccab]/30 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-14 h-14 border-t-2 border-r-2 border-[#bcccab]/30 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-14 h-14 border-b-2 border-l-2 border-[#bcccab]/30 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-14 h-14 border-b-2 border-r-2 border-[#bcccab]/30 rounded-br-2xl" />
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {/* Top App Bar — frosted glass, edge to edge */}
      <header className="absolute top-0 left-0 w-full z-50 flex items-end justify-center pt-16 pb-3 bg-white/[0.04] backdrop-blur-2xl border-b border-white/[0.06]">
        <h1 className="text-[#d4cfc4] font-thin tracking-[0.3em] text-sm uppercase drop-shadow-sm">
          WHOLEFED
        </h1>
      </header>

      {/* "Try with a sample meal" — visible while free scans remain so new
          users (and App Store reviewers) can test the flow without real food.
          Disappears once all 3 free scans are used. */}
      {remaining > 0 && !pro && (
        <div className="absolute top-28 left-0 w-full z-40 flex flex-col items-center px-6 gap-2">
          <button
            onClick={handleSampleScan}
            data-onboarding="sample-meal"
            className="px-5 py-2.5 rounded-full bg-[#bcccab] text-[#131313] text-[11px] tracking-[0.2em] uppercase font-semibold shadow-lg active:scale-95 transition-transform"
          >
            Try with a sample meal
          </button>
          {cameraError && (
            <p className="max-w-xs text-center text-[11px] text-red-300/90 bg-black/40 backdrop-blur-md rounded-lg px-3 py-2">
              {cameraError}
            </p>
          )}
        </div>
      )}

      {/* Bottom controls — sit just above BottomNav */}
      <div
        className="absolute bottom-0 left-0 w-full z-10 flex flex-col items-center pt-8"
        style={{
          // BottomNav is 5rem tall (+ safe-area). Add 1.5rem of breathing
          // room so the shutter button is never tucked under the nav on
          // iPad (which has no home-indicator safe area).
          paddingBottom: "calc(env(safe-area-inset-bottom) + 6.5rem)",
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
        }}
      >
        {/* Scan counter */}
        {!pro && remaining <= 0 && (
          <button
            onClick={() => router.push("/subscribe")}
            className="text-[10px] tracking-[0.2em] uppercase text-[#bcccab] mb-4"
          >
            Get unlimited scans
          </button>
        )}
        <div className="flex items-center gap-10">
          <button
            onClick={handleGallery}
            data-onboarding="gallery"
            className="w-10 h-10 rounded-lg bg-white/[0.08] border border-white/[0.12] flex items-center justify-center active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-base text-[#d4cfc4]" style={{ fontVariationSettings: "'wght' 300" }}>
              photo_library
            </span>
          </button>

          <button
            onClick={handleShutter}
            data-onboarding="shutter"
            aria-label="Scan meal"
            className="flex flex-col items-center justify-center transition-transform active:scale-90 duration-200"
          >
            <div className="w-[68px] h-[68px] rounded-full border-[3px] border-[#d4cfc4] flex items-center justify-center">
              <div className="w-[56px] h-[56px] rounded-full bg-[#d4cfc4]/10 border border-[#d4cfc4]/30" />
            </div>
            <span className="mt-2 text-[9px] tracking-[0.25em] uppercase text-[#d4cfc4]/70">
              Tap to scan
            </span>
          </button>

          <button
            onClick={() => setShowTextEntry(true)}
            className="w-10 h-10 rounded-lg bg-white/[0.08] border border-white/[0.12] flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Type meal description"
          >
            <span className="material-symbols-outlined text-base text-[#d4cfc4]" style={{ fontVariationSettings: "'wght' 300" }}>
              edit
            </span>
          </button>
        </div>
      </div>

      {/* Text entry modal — type a meal description instead of photographing it */}
      {showTextEntry && (
        <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xl flex items-end sm:items-center justify-center px-4 pb-8">
          <div className="w-full max-w-md bg-[#1c2623] border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-light text-[#e5e2e1] mb-1">Describe Your Meal</h2>
              <p className="text-[12px] font-light text-[#8a8578]">
                Type what you ate. The more specific, the better the analysis.
              </p>
            </div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g. Grilled salmon with quinoa, roasted broccoli, avocado slices, and olive oil"
              autoFocus
              rows={5}
              maxLength={500}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] font-light text-[#d4cfc4] placeholder:text-[#8a8578]/40 outline-none focus:border-[#6b7a5e]/40 transition-colors resize-none"
            />
            <p className="text-[10px] text-right text-[#8a8578]/40">{textInput.length}/500</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowTextEntry(false); setTextInput(""); }}
                className="flex-1 py-3 rounded-xl bg-white/[0.04] text-[#d4cfc4] text-[13px] font-medium tracking-wide active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={submitTextDescription}
                disabled={!textInput.trim() || textSubmitting}
                className="flex-1 py-3 rounded-xl bg-[#6b7a5e] text-white text-[13px] font-medium tracking-wide active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {textSubmitting ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

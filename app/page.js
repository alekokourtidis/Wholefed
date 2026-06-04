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

  // Sample meal pool. Each tap shows a different meal with its own image
  // and canned analysis. The FIRST tap is always the "Macro Power Bowl"
  // so onboarding starts with an aspirational top-tier example. Taps 2/3
  // pick randomly (without repeat) from a pool of varied real meals so
  // users see how scoring works across the range.
  const FIRST_SAMPLE = {
    image: "/samples/homemade5.jpeg",
    title: "Macro Power Bowl",
    score: 92,
    variety: 9,
    nutrition: 9,
    verdict: "This is what a balanced plant-forward meal looks like. Tempeh and edamame cover plant protein, brown rice handles complex carbs, and you've got three different vegetables doing real work. Add a sprinkle of fresh herbs or fermented kimchi for a perfect 100.",
    ingredients: ["Tempeh", "Edamame", "Broccolini", "Green Beans", "Brown Rice", "Sesame Oil"],
    upgrade: null,
    annotations: [
      { label: "Plant Protein", ingredient: "Tempeh", x: 40, y: 70 },
      { label: "Complete Protein", ingredient: "Edamame", x: 65, y: 30 },
      { label: "Cruciferous", ingredient: "Broccolini", x: 25, y: 75 },
    ],
    insights: [
      { type: "good", text: "Two complete plant proteins, complex carbs, three distinct vegetables, and a quality fat source. The kind of meal that hits every macro without feeling restrictive." },
      { type: "interaction", text: "Edamame and brown rice together form a complete amino acid profile, similar to what you'd get from animal protein — they cover each other's missing amino acids." },
      { type: "fact", text: "Tempeh is fermented, which means it contains live cultures that support gut bacteria. Most plant proteins (tofu, seitan) don't have this advantage." },
    ],
  };

  const RANDOM_POOL = [
    {
      image: "/samples/homemade4.jpg",
      title: "Teriyaki Chicken Plate",
      score: 81,
      variety: 7,
      nutrition: 8,
      verdict: "Solid meal. Chicken hits the protein mark, brown rice covers complex carbs, and steamed broccoli adds real cruciferous power. Missing a healthy fat source — add avocado or a drizzle of olive oil to round it out.",
      ingredients: ["Grilled Chicken Breast", "Brown Rice", "Steamed Broccoli", "Teriyaki Sauce", "Sesame Seeds"],
      upgrade: null,
      annotations: [
        { label: "Lean Protein", ingredient: "Grilled Chicken Breast", x: 30, y: 30 },
        { label: "Complex Carbs", ingredient: "Brown Rice", x: 65, y: 45 },
        { label: "Cruciferous", ingredient: "Steamed Broccoli", x: 35, y: 70 },
      ],
      insights: [
        { type: "good", text: "Lean protein and a real whole grain — that's the foundation of a great meal. The broccoli adds sulforaphane, one of the most studied protective compounds in nutrition." },
        { type: "missing", title: "Add Healthy Fat", text: "A few slices of avocado or a tablespoon of olive oil would help you absorb the fat-soluble vitamins from the broccoli.", suggestions: [{ emoji: "🥑", name: "Avocado" }, { emoji: "🫒", name: "Olive Oil" }] },
        { type: "interaction", text: "The vitamin C in the broccoli boosts absorption of the heme iron in the chicken by roughly 2x." },
        { type: "fact", text: "Brown rice retains the bran and germ that white rice strips off — that's where almost all the magnesium, B vitamins, and fiber live." },
      ],
    },
    {
      image: "/samples/meal1.jpg",
      title: "Teriyaki Chicken & White Rice",
      score: 65,
      variety: 6,
      nutrition: 6,
      verdict: "Solid protein from the chicken and the cucumber adds some crunch, but white rice is doing most of the calories and there's no complex carb in sight. Swap to brown rice and add more vegetables for a real jump.",
      ingredients: ["Grilled Chicken Thigh", "White Rice", "Cucumber Slices", "Sesame Seeds", "Teriyaki Glaze", "Lemon Wedge"],
      upgrade: { from: "White Rice", to: "Brown Rice" },
      annotations: [
        { label: "Quality Protein", ingredient: "Grilled Chicken Thigh", x: 45, y: 50 },
        { label: "Simple Carbs", ingredient: "White Rice", x: 30, y: 75 },
        { label: "Hydrating", ingredient: "Cucumber Slices", x: 60, y: 25 },
      ],
      insights: [
        { type: "good", text: "Real protein with the chicken thigh and the sesame seeds add a bit of magnesium and healthy fat." },
        { type: "missing", title: "Better Carb Source", text: "White rice is a fast-burning simple carb. Brown rice or quinoa gives you fiber and slower-release energy.", suggestions: [{ emoji: "🍚", name: "Brown Rice" }, { emoji: "🌾", name: "Quinoa" }] },
        { type: "interaction", text: "The lemon's vitamin C helps your body absorb the iron from the chicken — squeeze it on before eating, not after." },
        { type: "fact", text: "Sesame seeds contain more calcium per gram than most dairy products — a tablespoon has roughly 9% of your daily need." },
      ],
    },
    {
      image: "/samples/spaghetti.jpg",
      title: "Spaghetti & Meatballs",
      score: 58,
      variety: 5,
      nutrition: 5,
      verdict: "Classic comfort food but nutritionally limited. Meatballs cover protein and there's some lycopene from the tomato sauce, but the white pasta is a refined carb and there's no real vegetable component. Swap white pasta for whole wheat or add a side salad to jump 15+ points.",
      ingredients: ["White Spaghetti", "Beef Meatballs", "Marinara Sauce", "Parmesan Cheese", "Fresh Basil"],
      upgrade: { from: "White Spaghetti", to: "Whole Wheat Pasta" },
      annotations: [
        { label: "Refined Carb", ingredient: "White Spaghetti", x: 35, y: 55 },
        { label: "Quality Protein", ingredient: "Beef Meatballs", x: 50, y: 70 },
        { label: "Lycopene Rich", ingredient: "Marinara Sauce", x: 60, y: 45 },
      ],
      insights: [
        { type: "good", text: "Real protein from the meatballs and the cooked tomato sauce concentrates lycopene — one of the few antioxidants that's MORE bioavailable cooked than raw." },
        { type: "missing", title: "Add Vegetables", text: "A side of sauteed spinach or a simple arugula salad would transform the nutritional profile here.", suggestions: [{ emoji: "🥗", name: "Side Salad" }, { emoji: "🥬", name: "Sauteed Greens" }] },
        { type: "interaction", text: "Olive oil in the sauce dramatically boosts lycopene absorption — you actually get 4x more from cooked tomatoes with fat than from raw ones." },
        { type: "fact", text: "Lycopene is the only carotenoid that goes UP when you cook the food — most antioxidants degrade with heat." },
      ],
    },
    {
      image: "/samples/burgerfries.jpg",
      title: "Cheeseburger & Fries",
      score: 38,
      variety: 4,
      nutrition: 3,
      verdict: "Real meat protein and a few vegetables (lettuce, tomato, onion) are working in your favor, but the white sesame bun, melted cheese, and fried potatoes pile on refined carbs and saturated fat. The fries alone drop this 15+ points.",
      ingredients: ["Beef Patty", "White Sesame Bun", "Cheddar Cheese", "Lettuce", "Tomato", "Red Onion", "French Fries", "Burger Sauce"],
      upgrade: { from: "French Fries", to: "Side Salad" },
      annotations: [
        { label: "Refined Carb", ingredient: "White Sesame Bun", x: 25, y: 25 },
        { label: "Saturated Fat", ingredient: "Cheddar Cheese", x: 35, y: 55 },
        { label: "Fried", ingredient: "French Fries", x: 75, y: 50 },
      ],
      insights: [
        { type: "warning", text: "Fried foods + refined bun + processed cheese is the most common combination flagged in nutrition research as a marker of poor diet quality." },
        { type: "missing", title: "Skip the Fries", text: "Swap fries for a side salad and you'd be in the 55-60 range instantly. Same meal, much cleaner profile.", suggestions: [{ emoji: "🥗", name: "Side Salad" }, { emoji: "🥦", name: "Roasted Veggies" }] },
        { type: "interaction", text: "The fiber in the lettuce and tomato actually slows absorption of the refined carbs in the bun — they're doing more than just adding crunch." },
        { type: "fact", text: "A typical fast-food cheeseburger has roughly the same saturated fat as 3 tablespoons of butter, mostly from the cheese and the cooking method." },
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

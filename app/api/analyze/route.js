import { createClient } from "@supabase/supabase-js";

// Allow large image uploads (up to 10MB base64)
export const maxDuration = 60;

// In-memory cache — keyed by image hash + conditions + profile + labs.
// This only lives for one serverless instance, so it just catches rapid repeats.
const analysisCache = new Map();

// Persistent cross-request/user cache in Supabase. Identical scans — especially
// text-mode common foods like "2 eggs and toast" typed by many users — return
// from here instead of spending an OpenAI call. Key already includes the user's
// conditions/profile/labs, so personalized results are never shared across users.
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supa = supaUrl && supaKey ? createClient(supaUrl, supaKey) : null;

async function getCachedAnalysis(key) {
  if (!supa) return null;
  try {
    const { data } = await supa.from("analysis_cache").select("result").eq("cache_key", key).maybeSingle();
    return data?.result ?? null;
  } catch { return null; }
}

async function setCachedAnalysis(key, result) {
  if (!supa) return;
  try {
    // ON CONFLICT DO NOTHING — only needs the insert policy.
    await supa.from("analysis_cache").upsert({ cache_key: key, result }, { onConflict: "cache_key", ignoreDuplicates: true });
  } catch {}
}

async function hashImage(image, conditions, profile, labs) {
  const key = image.slice(0, 200) + image.slice(-200) + image.length + JSON.stringify(conditions || []) + JSON.stringify(profile || {}) + JSON.stringify(labs || {});
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Deterministic score guardrails for junk items. gpt-4o-mini follows the broad
// rubric but won't reliably hit the fine-grained dessert/junk bands, so we clamp
// the final score in code based on the meal's title. Gated on low completeness
// (<=3) so it ONLY fires for single junk items, never a real balanced meal that
// happens to mention one of these words as a side.
function applyJunkScoreGuardrails(analysis) {
  if (!analysis || typeof analysis.score !== "number") return analysis;
  const completeness = analysis.completeness ?? analysis.variety ?? 10;
  if (completeness > 3) return analysis; // a complete/balanced meal — never clamp

  const title = (analysis.title || "").toLowerCase();
  const has = (words) => words.some((w) => title.includes(w));

  // Never clamp a COMPOSED meal even if its title mentions a junk word. "Burger &
  // Fries" or "Fish and Chips" is a real meal with protein — only a STANDALONE
  // junk item (just fries, just a milkshake, just soda) should hit the bands below.
  const REAL_MEAL_WORDS = ["burger", "cheeseburger", "sandwich", "wrap", "taco", "burrito", "steak", "chicken", "salmon", "fish", "shrimp", "tofu", "stir fry", "stir-fry", "curry", "soup", "stew", "omelet", "omelette", "salad", "gyro", "kebab", "quesadilla", "pasta", "rice bowl", "grain bowl", "platter", "with eggs", "and eggs"];
  if (REAL_MEAL_WORDS.some((w) => title.includes(w))) return analysis;

  let lo = null, hi = null;
  if (has(["soda", "cola", "coke", "pepsi", "sprite", "fanta", "mountain dew", "gatorade", "lemonade", "soft drink", "energy drink", "sweet tea", "sweet iced tea", "sweetened tea", "kool-aid", "kool aid", "fruit punch", "frappuccino", "slushie", "slurpee", "sweetened drink", "sugary drink"])) {
    lo = 2; hi = 5; // zero-nutrition sugar water
  } else if (has(["gummy", "gummies", "lollipop", "hard candy", "candy", "skittles", "starburst", "jelly bean", "cotton candy", "chocolate bar", "candy bar"])) {
    lo = 2; hi = 6; // pure candy
  } else if (has(["ice cream", "gelato", "milkshake", "frozen yogurt", "froyo", "sundae", "soft serve"])) {
    lo = 14; hi = 20; // dairy dessert — has real protein/calcium/fat, must beat soda
  } else if (has(["cookie", "cake", "cupcake", "donut", "doughnut", "brownie", "pastry", "croissant", "muffin", "danish", "cinnamon roll", "eclair", "pie"])) {
    lo = 5; hi = 12; // refined-flour baked dessert
  } else if (has(["chips", "fries", "pretzel"])) {
    lo = 3; hi = 10; // packaged/fried junk
  }

  if (lo !== null) {
    // Position WITHIN the band using the model's quality sub-score so different
    // junk items get different scores (a plain cookie vs a nut-studded one vs a
    // milkshake) instead of all pinning to the floor — a range, not one number.
    const q = analysis.quality ?? analysis.nutrition ?? 1; // 1..10
    const frac = Math.max(0, Math.min(1, (q - 1) / 5));    // q=1 -> band floor, q>=6 -> band ceiling
    const positioned = Math.round(lo + (hi - lo) * frac);
    // Blend with the model's own number (also clamped to the band) so its
    // judgment still nudges the result, but it can never escape the range.
    const clamped = Math.max(lo, Math.min(hi, analysis.score));
    analysis.score = Math.max(lo, Math.min(hi, Math.round((positioned + clamped) / 2)));
  }
  return analysis;
}

// Additions that ARE allowed to lower a score (objectively unhealthy).
const JUNK_ADDITION_WORDS = ["soda", "cola", "candy", "chocolate bar", "candy bar", "fries", "chips", "bacon", "sausage", "hot dog", "deep fried", "fried", "syrup", "frosting", "ice cream", "donut", "doughnut", "cookie", "cake", "mayo", "mayonnaise", "ranch", "processed", "deli meat", "pepperoni", "salami", "nutella", "whipped cream", "caramel", "sugar"];
function isJunkAddition(name) {
  const n = (name || "").toLowerCase();
  return JUNK_ADDITION_WORDS.some((w) => n.includes(w));
}

// Enforce the score contract on a RE-SCAN (user edited the ingredient list):
// 1) If the meal previously promised "add X for a perfect 100" and X was added,
//    the score MUST become 100 — the app made a promise, honor it.
// 2) Adding a non-junk (healthy/neutral) ingredient can only RAISE or HOLD the
//    score, never lower it. Only an objectively unhealthy addition may drop it.
function enforceScoreContract(analysis, ctx) {
  if (!analysis || typeof analysis.score !== "number" || !ctx) return analysis;
  const { previousScore, previousBonus100, addedIngredients, removedAny } = ctx;
  const added = Array.isArray(addedIngredients) ? addedIngredients : [];

  // (1) The 100 promise
  if (previousBonus100 && typeof previousBonus100 === "string" && typeof previousScore === "number" && previousScore >= 94) {
    const promised = previousBonus100.toLowerCase().trim();
    const wasAdded = added.some((i) => {
      const a = (i || "").toLowerCase().trim();
      return a && promised && (a.includes(promised) || promised.includes(a));
    });
    if (wasAdded) {
      analysis.score = 100;
      analysis.bonus100 = null;
      return analysis;
    }
  }

  // (2) Monotonic floor — healthy/neutral additions never lower the score
  if (typeof previousScore === "number" && !removedAny && added.length > 0 && !added.some(isJunkAddition)) {
    analysis.score = Math.max(analysis.score, previousScore);
  }
  return analysis;
}

// Code-level consistency net: the model occasionally returns a complete-tier score
// (90+) yet also emits a contradictory "missing complex carb / protein / fat / veg"
// insight (usually because it annotated the carb but flagged it missing). A 90+
// score asserts the meal is complete, so we DROP the contradictory missing-macro
// insight (trust the score). Also strips the word "gap" from missing-insight titles.
function reconcileAnalysis(analysis) {
  if (!analysis) return analysis;

  // (1) Every ANNOTATED food (the labels drawn on the photo) MUST appear in the
  // ingredients list — guaranteed in code, never left to the model. If the photo
  // labels "potatoes" as Complex Carbs, "potatoes" goes into ingredients too.
  if (Array.isArray(analysis.annotations) && Array.isArray(analysis.ingredients)) {
    const lower = analysis.ingredients.map((s) => (s || "").toLowerCase());
    for (const a of analysis.annotations) {
      const food = (a?.ingredient || "").trim();
      if (!food) continue;
      const f = food.toLowerCase();
      const present = lower.some((x) => x && (x.includes(f) || f.includes(x)));
      if (!present) {
        analysis.ingredients.push(food);
        lower.push(f);
      }
    }
  }

  // (1b) The quick-swap "from" food MUST be an exact name from the ingredient list.
  // If "from" is "Toast" but the list says "Sourdough Toast", use the list's name.
  // If it refers to nothing in the list, drop the swap entirely.
  if (analysis.upgrade && analysis.upgrade.from && Array.isArray(analysis.ingredients)) {
    const from = String(analysis.upgrade.from).toLowerCase();
    const match = analysis.ingredients.find((x) => {
      const xl = (x || "").toLowerCase();
      return xl && (xl.includes(from) || from.includes(xl));
    });
    if (match) analysis.upgrade.from = match;
    else analysis.upgrade = null;
  }

  // (1d) CARB CEILING — complex carbs gate the top scores. A meal with no real
  // complex carb cannot reach 95-100: refined-carb-only caps at 94, no-carb caps
  // at 85. Only a genuine complex carb (whole grain, potato, oats, legume, squash)
  // unlocks the top tier.
  if (typeof analysis.score === "number" && Array.isArray(analysis.ingredients)) {
    const ings = " " + analysis.ingredients.map((s) => (s || "").toLowerCase()).join(" | ") + " ";
    const COMPLEX = ["quinoa", "brown rice", "wild rice", "farro", "bulgur", "barley", "millet", "buckwheat", "amaranth", "teff", "freekeh", "sorghum", "spelt", "oat", "whole wheat", "whole grain", "whole-grain", "sprouted", "ezekiel", "sweet potato", "potato", "yam", "butternut", "acorn squash", "kabocha", "delicata", "spaghetti squash", "pumpkin", "parsnip", "taro", "plantain", "cassava", "yuca", "lentil", "chickpea", "garbanzo", "black bean", "kidney bean", "pinto", "navy bean", "white bean", "edamame"];
    const REFINED = ["white bread", "white toast", "toast", "white rice", "pasta", "noodle", "baguette", "ciabatta", "brioche", "croissant", "bagel", "tortilla", "naan", "pita", "sourdough", "bun", "roll", "cracker"];
    const hasComplex = COMPLEX.some((w) => ings.includes(w));
    if (!hasComplex) {
      const hasRefined = REFINED.some((w) => ings.includes(w));
      analysis.score = Math.min(analysis.score, hasRefined ? 94 : 85);
    }
  }

  // (1c) Scores are WHOLE numbers — no decimals anywhere.
  if (typeof analysis.score === "number") analysis.score = Math.round(analysis.score);
  if (typeof analysis.completeness === "number") analysis.completeness = Math.round(analysis.completeness);
  if (typeof analysis.quality === "number") analysis.quality = Math.round(analysis.quality);

  // (2) On a complete-tier meal (90+), drop a contradictory "missing macro" insight.
  if (Array.isArray(analysis.insights)) {
    const macroRe = /(complex carb|whole grain|\bprotein\b|healthy fat|vegetable|veggie|leafy green)/i;
    analysis.insights = analysis.insights.filter((i) => {
      if ((i?.type || "").toLowerCase() !== "missing") return true;
      const txt = `${i.title || ""} ${i.text || ""}`;
      if (typeof analysis.score === "number" && analysis.score >= 90 && macroRe.test(txt)) return false;
      return true;
    });
    // Clean up titles: no "gap" wording.
    for (const i of analysis.insights) {
      if ((i?.type || "").toLowerCase() === "missing" && typeof i.title === "string") {
        i.title = i.title.replace(/\bgap\b/gi, "").replace(/\s{2,}/g, " ").trim();
      }
    }
  }
  return analysis;
}

export async function POST(request) {
  const { image, conditions, profile, labs, conditionScoreEnabled, description,
          previousScore, previousBonus100, addedIngredients, removedAny } = await request.json();
  const isTextMode = !!description && (!image || image.startsWith("text:"));
  // A re-score (user edited ingredients) carries the previous score — its result
  // is contextual (monotonic floor / 100 promise), so it bypasses the shared cache.
  const isRescore = typeof previousScore === "number";
  const scoreCtx = { previousScore, previousBonus100, addedIngredients, removedAny };

  // Check cache — same food + same conditions/profile/labs + same toggle = same result.
  // Text is normalized (lowercase, trimmed, collapsed whitespace) so "2 Eggs " and
  // "2 eggs" share a cache entry and common foods hit far more often.
  const cacheBase = isTextMode
    ? `text:${(description || "").trim().toLowerCase().replace(/\s+/g, " ")}`
    : image;
  const cacheKey = await hashImage(cacheBase, conditions, profile, labs) + (conditionScoreEnabled ? ":cs1" : ":cs0");
  if (!isRescore) {
    if (analysisCache.has(cacheKey)) {
      return Response.json(analysisCache.get(cacheKey));
    }
    const persisted = await getCachedAnalysis(cacheKey);
    if (persisted) {
      analysisCache.set(cacheKey, persisted);
      return Response.json(persisted);
    }
  }

  // Build personalization context
  let personalization = "";
  if (conditions && conditions.length > 0) {
    personalization += `\n\nIMPORTANT — This user has the following health conditions: ${conditions.join(", ")}.
You MUST factor these into your INSIGHTS (not the numeric score unless instructed below):
- Flag any foods in this meal that could worsen their conditions
- Highlight foods that actively help their conditions
- In "missing" insights, suggest additions that specifically benefit their conditions
- In "swap" insights, prioritize swaps that address their conditions
- Include at least one insight that directly references their condition(s)
For example:
- High cholesterol → flag saturated fat, praise omega-3 and fiber
- Diabetes/prediabetes → flag high glycemic foods, praise low GI choices
- High blood pressure → flag sodium, praise potassium-rich foods
- IBS → flag common FODMAP triggers
- Celiac/gluten sensitivity → flag any gluten sources
- Iron-deficiency anemia → highlight iron-rich foods, vitamin C pairing
- GERD → flag acidic, spicy, or fatty triggers
- Gout → flag high-purine foods
- Lactose intolerance → flag dairy
- Kidney disease → flag high potassium/phosphorus/sodium
Be specific to THEIR conditions, not generic health advice.

SCORE ADJUSTMENT FOR CONDITIONS: ${conditionScoreEnabled
  ? "ENABLED. After applying the standard deduction stack, ALSO deduct up to 15 additional points if this meal contains foods that directly conflict with the user's specific conditions (e.g., heavy saturated fat for high cholesterol, high glycemic load for diabetes, high sodium for hypertension). Be proportional: a small conflict = -3 to -5, a major conflict = -10 to -15. Mention this adjustment in the verdict."
  : "DISABLED. The numeric score must be PURELY based on general nutritional quality. DO NOT adjust the score up or down based on the user's health conditions. Conditions only affect the INSIGHT cards, not the score number."}`;
  }

  if (profile) {
    const parts = [];
    if (profile.age) parts.push(`Age: ${profile.age}`);
    if (profile.gender) parts.push(`Gender: ${profile.gender}`);
    if (profile.height) parts.push(`Height: ${profile.height}`);
    if (profile.weight) parts.push(`Weight: ${profile.weight}`);
    if (parts.length > 0) {
      personalization += `\n\nUser profile: ${parts.join(", ")}. Adjust nutrient expectations accordingly (e.g., higher protein needs for larger individuals, different caloric needs by age/gender).`;
    }
  }

  // Inject bloodwork data if available
  if (labs && labs.markers && labs.markers.length > 0) {
    const labLines = labs.markers.map((m) => {
      const flag = m.status === "high" ? " ⬆ HIGH" : m.status === "low" ? " ⬇ LOW" : "";
      return `- ${m.name}: ${m.value} ${m.unit}${flag} (ref: ${m.reference_range})`;
    });
    personalization += `\n\nIMPORTANT — This user has uploaded bloodwork. Their actual lab values:\n${labLines.join("\n")}`;
    if (labs.summary) personalization += `\nLab summary: ${labs.summary}`;
    personalization += `\nUse these REAL lab values to personalize your analysis. Reference their SPECIFIC numbers when relevant (e.g., "With your LDL at 165, the saturated fat here isn't ideal"). The "condition" insight card should reference bloodwork findings.`;
  }

  const prompt = `You are an elite nutritionist ${isTextMode ? "analyzing a meal that the user described in text" : "analyzing a meal photo"}. Be precise, factual, and specific to what you actually ${isTextMode ? "read in the description" : "see in the photo"}. No filler. No motivational fluff.

${isTextMode ? "" : `NOT-FOOD CHECK — Do this FIRST, but ONLY trigger it when there is genuinely zero food visible:
- Trigger ONLY if the image contains NO food whatsoever (e.g. a person with no food in frame, a pet, a landscape with no food, a screenshot of a non-food app, a document, a car, a piece of furniture, a body part, a meme, a blank or solid-color photo).
- If you can see ANY identifiable food item, even one — a piece of fruit, a sandwich, a drink, anything edible — proceed to the full analysis. Do NOT use the not-food path.
- Do NOT trigger for: unusual or international cuisines you don't recognize, slightly blurry food photos, low-light food photos, partial plates, or food photographed from odd angles. Always attempt the analysis if food is present.
- ONLY when there is truly no food at all, return ONLY this JSON and nothing else:
{ "_notFood": true }
`}


INGREDIENT DETECTION — Be exhaustive:
- ${isTextMode ? "Treat every food the user named as PRESENT. Do not add foods they didn't mention. Do not omit foods they did mention." : "Look VERY carefully at every distinct food component on the plate. Most meals have 5-10+ ingredients."}
- Identify specific preparations: "Scrambled Eggs" not just "Eggs", "Smoked Salmon" not just "Fish", "Tabbouleh" not just "Grains".
- ${isTextMode ? "Sauces and condiments the user mentioned count." : "Look for sauces, condiments, dips, and garnishes — they count. Schug, hummus, tahini, pesto, salsa, etc."}
- If you see grains mixed with herbs (like tabbouleh, couscous), identify the dish, not just "grains".
- Return ALL ingredients in the "ingredients" array, not just the top 3-4. Aim for completeness.
- CONSISTENCY: the "ingredients" array MUST list every food your score is based on. If you score the meal as having protein, the protein (chicken, etc.) MUST appear in the list. A high score (90+) with a near-empty ingredient list is FORBIDDEN — the score and the listed ingredients must tell the same story. If you only detect 2 items, the score must reflect a 2-item meal.

${isTextMode ? "" : `HIGH-MISS ITEMS — Pay extra attention to these, they are commonly missed:
- Butternut squash, acorn squash, kabocha squash, delicata squash, pumpkin (orange/yellow flesh, often roasted in cubes or slices) — count as COMPLEX CARBS not vegetables.
- Sweet potato — a COMPLEX CARB in ANY form: roasted cubes/slices, mashed, baked whole, AND fries/wedges. Sweet potato FRIES are commonly missed because they look like regular fries — orange/deeper-colored fries or wedges are sweet potato; count them as a complex carb.
- FORMS VARY — the same food shows up as fries, wedges, mashed, pureed, roasted, raw, sliced, or blended. Identify the UNDERLYING food regardless of preparation (mashed cauliflower is still cauliflower; sweet potato fries are still sweet potato; a blended soup still contains its vegetables). Never miss or misclassify a food just because it's in an unusual shape.
- White/red/gold potato (roasted cubes, wedges, halves, boiled, or mashed — pale beige/golden, often roasted alongside other items or tucked at the plate edge) — a WHOLE potato is a COMPLEX CARB. Look specifically for potato chunks; they are commonly missed and mistaken for other beige items.
- POTATO vs MUSHROOM — golden-brown DICED CUBES with crispy edges and a solid pale/cream interior are almost always ROASTED POTATOES (a complex carb), NOT mushrooms. Mushrooms are softer, darker brown, often show caps/gills/stems, and shrink when cooked. When you see a pile of crispy golden cubes, default to roasted potatoes unless they clearly show mushroom shape.
- Leafy greens (spinach, kale, arugula, baby greens, watercress) — these are often UNDERNEATH other items or piled to the side. Specifically scan for green leaves at the edges of the plate or peeking out from under proteins.
- Fresh herbs (parsley, cilantro, dill, basil, chives, mint) — small flecks of green that add real flavor; don't miss them.
- Microgreens, sprouts, alfalfa — easy to miss; look for thin shoots.
- Berries (blueberries, blackberries, raspberries, strawberries, pomegranate seeds) — small round colorful items.
- Seeds (sesame, pumpkin, sunflower, chia, flax) — tiny but nutritionally significant.
- Cheese crumbles vs sauce — distinguish.
- Whole grains (quinoa, farro, brown rice, wild rice) vs white grains — color and texture matter.

HIDDEN-IN-MIX items — these are very commonly buried inside other foods and missed:
- Ground meat (beef, turkey, pork) in pasta sauces, lasagna, stuffed peppers, tacos, casseroles, baked ziti — if there's a brown/red sauce on pasta, assume ground meat is present unless clearly only tomato sauce. Look for visible meat pieces, granules, or chunks of brown.
- Peas (small round green spheres in pasta, rice, risotto, casseroles, fried rice, pot pies) — count as protein-bearing vegetable.
- Lentils, chickpeas, beans in soups, stews, salads, grain bowls — easily mistaken for grains or sauce.
- Tofu in stir-fries — pale cubes, often blends in.
- Quinoa mixed into salads — small bead-like grains.
- Bacon/pancetta crumbled into salads, pasta — small brown bits.
- Cheese melted into a sauce vs cheese sprinkled on top.

CHEESE / DAIRY AS PROTEIN: cheese contains protein. If the meal contains a substantial amount of cheese (cubes, melted into sauce, on top of dish), it can count as a partial protein contributor — do NOT flag "missing quality protein" if there's also visible meat/poultry/fish/eggs/legumes. Only call "missing quality protein" when NO animal protein, NO eggs, NO legumes, AND no significant cheese amount is present.
`}

FOOD CLASSIFICATION REFERENCE — Use this exhaustive list to categorize every ingredient. If an ingredient fits a category here, it satisfies that macro requirement.

QUALITY PROTEIN SOURCES (presence prevents the -18 protein deduction):
- Animal protein: chicken (breast/thigh/wings/drumstick), turkey, duck, beef (steak/ground/brisket/ribeye/sirloin/chuck), pork (chops/tenderloin/loin), lamb, bison, venison, rabbit, goat
- Fish: salmon, tuna, cod, halibut, tilapia, snapper, sea bass, branzino, mackerel, sardines, anchovies, trout, mahi-mahi, swordfish, herring, sole, flounder
- Shellfish: shrimp, prawns, crab, lobster, mussels, clams, oysters, scallops, calamari, squid, octopus
- Eggs: chicken eggs, duck eggs, quail eggs, egg whites
- Plant protein: tofu (firm, silken, smoked), tempeh, seitan, edamame, soy curls
- Legumes (count as protein AND complex carb): black beans, kidney beans, pinto beans, white beans, navy beans, lima beans, fava beans, chickpeas (garbanzo), lentils (red/green/black/brown), split peas, peas (green peas)
- Dairy protein: Greek yogurt, skyr, plain yogurt, any yogurt (any visible bowl/cup/serving counts — do NOT require a "substantial" portion), cottage cheese, ricotta, paneer, queso fresco, halloumi. IMPORTANT: yogurt is ALWAYS a quality protein source. If you see yogurt of any kind, the protein requirement is satisfied — never flag "missing protein" when yogurt is present.
- Cheese in substantial amount (Parmesan, feta, mozzarella, cheddar, gouda, brie, blue cheese, goat cheese, manchego)
- Nuts/seeds in substantial amount (also fat): almonds, walnuts, peanuts, cashews, pistachios, sunflower seeds, pumpkin seeds, hemp seeds, chia seeds, flax seeds, sesame seeds, tahini

HEALTHY FAT SOURCES (presence prevents the -12 fat deduction):
- Avocado, avocado oil, guacamole
- Olive oil, extra virgin olive oil, olives (kalamata, green, black)
- Fatty fish: salmon, mackerel, sardines, trout, herring
- Nuts: almonds, walnuts, pecans, cashews, pistachios, macadamia, hazelnuts, brazil nuts, pine nuts
- Seeds: chia, flax, hemp, pumpkin, sunflower, sesame
- Nut butters: almond butter, peanut butter, cashew butter, tahini
- Coconut: coconut oil, coconut milk, coconut cream, shredded coconut
- Ghee, grass-fed butter (modest amount)
- Egg yolks (substantial)

COMPLEX CARBS (presence prevents the -12 complex carb deduction):
- Whole grains: quinoa, brown rice, wild rice, farro, bulgur, barley, millet, buckwheat, amaranth, teff, freekeh, sorghum, kamut, spelt
- Oats: rolled oats, steel-cut oats, oat groats, overnight oats, oatmeal
- Whole wheat: whole wheat bread, whole wheat pasta, sprouted bread, Ezekiel bread, whole wheat tortilla, whole wheat pita
- Starchy vegetables: sweet potato, yam, white/red/gold/Yukon potato (baked, boiled, roasted, or mashed — a whole potato IS a complex carb; ONLY fried potato / fries / chips do NOT count), butternut squash, acorn squash, kabocha squash, delicata squash, spaghetti squash, pumpkin, parsnip, taro, plantain, cassava (yuca)
- Legumes: beans (all kinds), lentils, chickpeas, peas, edamame (also count as protein)
- Other: corn (whole/on cob, NOT corn flour), millet bread, popcorn (plain), whole grain crackers

REFINED CARBS (NOT complex carbs — trigger -6 refined grain deduction if present):
- White rice (jasmine, basmati, sushi rice, arborio), instant rice
- White bread, baguette, ciabatta, sandwich bread, brioche, croissant
- Sourdough (unless explicitly WHOLE-GRAIN sourdough): it is still refined white flour, so it is a REFINED carb and does NOT satisfy the complex-carb slot. BUT the fermentation lowers its glycemic load, so it is modestly better than plain white bread — treat it as refined-but-slightly-better, not as junk, and not as a whole grain.
- Regular pasta (white flour), white spaghetti, white penne, white linguine, lasagna noodles (white)
- White flour tortilla, white pita, naan (white)
- Crackers (Ritz, saltines, etc), pretzels, white-flour cereal
- Pancakes, waffles, French toast (white flour)
- Pastries: donuts, danishes, muffins (white flour), cake, cookies

VEGETABLES / PRODUCE (presence prevents the -15 veg deduction):
- Leafy greens: spinach, kale, arugula, romaine, iceberg, butter lettuce, watercress, swiss chard, collard greens, bok choy, mustard greens, baby greens, mesclun, microgreens, escarole, endive, frisée, radicchio
- Cruciferous: broccoli, broccolini, cauliflower, brussels sprouts, cabbage (red/green/napa/savoy), kohlrabi
- Alliums: yellow/red/white onion, sweet onion, garlic, leeks, shallots, scallions, chives, ramps
- Peppers: bell peppers (red/green/yellow/orange), poblano, jalapeño, serrano, habanero, banana peppers, padron, shishito
- Tomatoes: cherry, grape, roma, beefsteak, heirloom, sun-dried (any tomato counts as produce)
- Cucurbits: zucchini, yellow squash, pattypan, cucumber, eggplant (all colors)
- Mushrooms (fungi, count as veg): button, cremini, portobello, shiitake, oyster, enoki, maitake, lion's mane, chanterelle, morel, porcini
- Root vegetables: carrots, beets, radishes, turnips, daikon, rutabaga, jicama, celeriac, ginger root (used as seasoning ok)
- Other: asparagus, artichokes, celery, fennel, okra, hearts of palm, bamboo shoots, water chestnuts, sea vegetables (nori, wakame, kombu, dulse)
- Sprouts: alfalfa, bean sprouts, broccoli sprouts, radish sprouts
- Fresh herbs (also bonus): cilantro, parsley, basil, mint, dill, oregano, rosemary, thyme, sage, tarragon, marjoram, lemongrass, kaffir lime leaf
- Fruits also count toward "produce" for the missing-veg check: berries (strawberry/blueberry/raspberry/blackberry), apple, pear, peach, plum, cherry, citrus (orange/lemon/lime/grapefruit), mango, pineapple, papaya, kiwi, banana, grapes, melon, pomegranate, figs

PROCESSED / WARNING-TRIGGERING ITEMS (use these to fire the -10 processed protein deduction and to use the "warning" insight type):
- Processed meats: bacon, sausage, hot dogs, pepperoni, salami, bologna, mortadella, deli ham, deli turkey, beef jerky, prosciutto (in large amount), pancetta
- Fast food items: chain burger patties, chain fries, nuggets, breaded chicken patties
- Packaged junk: chips (potato/corn), Cheetos, Doritos, Pringles, candy bars, gummies, marshmallows, Pop-Tarts, Toaster Strudel, frosted cereals, instant noodles (ramen), microwave dinners
- Frozen: chicken nuggets, fish sticks, frozen pizza, breakfast burritos (mass-produced)

ADDED SUGAR ITEMS (trigger -10 added sugar deduction):
- Syrups: maple syrup (if heavy), agave, corn syrup, honey (if heavy), table sugar
- Sweetened beverages: soda, juice (most), sweetened iced tea, energy drinks, sweetened coffee drinks, lemonade
- Desserts: ice cream, gelato, cake, cookies, pie, cheesecake, brownies, candy, chocolate bars (milk chocolate)
- Sweetened yogurt, flavored oatmeal packets, breakfast pastries
- DRIZZLE CARVE-OUT (apply strictly): a small DRIZZLE of honey, hot honey, maple syrup, or other natural sweetener used as a flavoring/finish — NOT pooled, NOT a primary component, NOT a dessert — is a minor flavoring, NOT a dessert-level added sugar. Deduct at most -3, the same way capers/olives are treated as garnishes. The full -10 "added sugar" deduction is ONLY for added sugar that is HEAVY, POOLED, or a DEFINING component of the dish (a dessert, a sugar-loaded sauce coating the food, visible syrup pooling on the plate, sweetened drink). A teaspoon of hot honey on an otherwise whole-food meal must NOT crater the score — treat it like the harmless flavoring it is.

HIGH SODIUM TRIGGERS (-5 sodium deduction):
- Soy sauce (heavy), fish sauce, oyster sauce, hoisin (heavy)
- Canned soup, canned beans (if not rinsed)
- Processed cheese (American, Velveeta), processed cheese sauce
- Pickles (heavy), olives (heavy)
- Heavy use of ranch dressing, blue cheese dressing, Caesar dressing
- Pretzels, salted chips, salted nuts (heavy)

PRODUCE / VEGETABLE CLASSIFICATION — Apply this rule strictly:
- Mushrooms (any kind), tomatoes, avocado, olives, peppers (bell, chili), eggplant, zucchini, and cucumber ALL count as vegetables/produce.
- Butternut squash, acorn squash, kabocha squash, delicata squash, pumpkin, and sweet potato count as COMPLEX CARBS (not just vegetables). They satisfy the complex-carb macro requirement.
- Leafy greens (spinach, kale, arugula, romaine, baby greens), cruciferous (broccoli, cauliflower, brussels sprouts), root vegetables (carrots, beets), and onions/garlic count as vegetables.
- Berries and fresh fruit count as produce for the "missing vegetables" check.
- Before generating a "missing vegetables" insight, scan your ingredients list. If ANY of the above are present, do NOT flag missing vegetables.

FRESH FOOD GUARDRAILS — Never get this wrong:
- Fresh raw fruit (berries, pomegranate, apples, citrus, melon, etc.) is NEVER "processed". NEVER flag fresh fruit as high in sodium. Berries have essentially zero sodium.
- Fresh raw vegetables are NEVER "processed". They are the opposite of processed.
- Plain yogurt, eggs, raw nuts, raw seeds, plain dairy, fresh fish/meat, beans, and whole grains are NOT processed.
- "Processed" means: visible packaging, candy, chips, soda, deli meat, sausage, bacon, hot dogs, sugar-laden sauces, fast food, instant noodles, breakfast cereal with added sugar, frosted/breaded items.
- "High sodium" means: cured meats, soy sauce, processed condiments, fast food, canned soup, chips. NOT fresh produce. NOT fresh meat. NOT raw eggs.
- If you cannot point to a SPECIFIC processed or high-sodium item by name in the meal, do NOT claim the meal is processed or high in sodium.

Return a JSON object with exactly this structure:

SCORE STABILITY & ADDITIVITY — critical, do not violate:
- Adding a whole-food, neutral, or healthy ingredient to a meal must NEVER lower the score. More real-food variety is BETTER, not worse. If a meal of "pasta" scores 70, then "pasta + capers" or "pasta + spinach" or "pasta + grilled chicken" must score the SAME or HIGHER — never lower.
- A score only DROPS when a genuinely unhealthy, substantial component is added (e.g. adding deep-fried chicken, bacon, a sugary sauce, or a side of fries). A small flavoring or garnish never drops it.
- BOUNDED ADDITIVITY — additions raise the score only WITHIN the ceiling set by the base dish's OWN problems. They cannot erase what's already wrong. Consider the WHOLE dish: a refined-carb base (white pasta, white rice, white bread), a fatty/oily/creamy/cheese-heavy sauce, added sugar, high sodium, or any processing STILL apply their deductions and ceilings no matter how many healthy items you add. Example: white pasta + oily/creamy sauce scores low-to-mid; adding chicken + spinach improves it but it CANNOT reach the 90s — the refined pasta and the fat-laden sauce cap it (think high-70s/low-80s at best). Only a genuinely clean, whole-food base can reach the 90s. So: adding good food never LOWERS the score, but the base's existing negatives limit how HIGH the additions can push it.
- GARNISHES & SMALL FLAVORINGS are score-neutral-to-positive and NEVER trigger penalties: capers, olives (small amount), pickles (small amount), fresh herbs, spices, lemon/lime, a sprinkle of seeds/nuts/cheese, capers, chili flakes, garlic, scallions. Do NOT apply a sodium penalty for a small amount of a briny garnish like capers or a few olives — the sodium deduction is only for genuinely sodium-LOADED items (soy-sauce-drenched dishes, cured meats, canned soup, chips).
- Capers specifically: a healthy Mediterranean flavoring (antioxidants, very low calorie). Treat as a neutral-to-positive produce/garnish. Never let capers reduce a score.
- Be CONSISTENT: the same meal must produce the same score every time. Compute the deduction stack the same way on every scan.

SCORING — the score is a 0-100 WHOLE number built from two parts that SUM. Quality is the dominant lever. Use the FULL range and pick a PRECISE integer that fits THIS meal — never cluster on multiples of 5/10, no decimals (92, never 91.8). Two DIFFERENT meals must land on different integers; the SAME meal must always get the SAME score (be consistent, never random).

This mirrors the USDA MyPlate / Harvard Healthy Eating Plate consensus: a meal is built from protein + a complex carb + a healthy fat, and VEGETABLES + variety are the half-plate that makes it excellent.

PART A — MACROS + QUALITY (0-80). The foundation.
- A meal of WHOLE, minimally-processed foods covering all three macros (protein, complex carb, healthy fat) earns roughly the full ~80. Land on a precise integer (79, 81, 78...) based on how clean and well-portioned it is.
- MISSING a macro pulls Part A down hard, roughly -12 to -18 each: no protein, no complex carb, OR no healthy fat.
  - A quality PROTEIN = fish, poultry, eggs, lean meat, tofu, tempeh, legumes, OR any yogurt/cottage cheese/significant cheese.
  - A STARCHY vegetable (potato, sweet potato, squash) fills the COMPLEX-CARB slot, NOT the vegetable slot.
  - A refined-ONLY carb (white rice/bread/pasta as the sole carb) is present-but-poor: about -6, NOT "absent". An EXTRA refined item alongside a real complex carb is near-neutral (≤ -1).
- QUALITY drags Part A down and OUTRANKS completeness:
  - DESSERT / PURE JUNK as the main item (candy, soda, cake, cookies, chips, pastry, ice cream): not a meal — TOTAL score 2-20. Within it: zero-nutrition sugar (soda, candy, gummies) 2-6; refined baked goods (cookies, cake, donut, pastry) 6-12; items with real dairy/nut nutrition (ice cream, milkshake, frozen yogurt) 14-20 (hard floor 14).
  - HEAVILY processed (deep-fried main, fast food, processed meat as the main protein, mostly packaged): TOTAL cannot exceed ~30.
  - MODERATELY processed (one fried element, a refined-grain base, OR a sugary/processed sauce that COATS the dish): Part A cannot exceed ~55. CARVE-OUT: a light drizzle or finishing sauce (a teaspoon of hot honey, a light vinaigrette) is at most a -2 note, NOT a processing hit, and never pulls a clean whole-food meal down.
  - Processed / packaged / fried / cured / charred / burnt / processed-meat items drag quality down regardless of macros. Whole, minimally-processed foods are the only ones that earn high scores.

PART B — VEGETABLES + NUTRIENT DENSITY (0-20). The path from ~80 to 100. Only earned when Part A is strong (complete + clean):
- NON-STARCHY vegetables/fruit (greens, broccoli, peppers, tomatoes, mushrooms, berries — NOT potato/sweet potato/squash, those are the carb): up to +12. This is the biggest piece — the half-plate of produce that most meals skip and the authorities prize most.
- Density standouts, +2 to +5 each (cap the total at 20): multiple color groups, leafy greens PLUS another veg, fermented food, an omega-3 source, fresh herbs, a uniquely nutrient-dense item (berries, seeds, microgreens, sea vegetable).
- A clean, complete-MACRO meal with NO non-starchy veg and little variety STAYS ~80-84. Add veg + density and it climbs into the 90s. A flawless, varied, nutrient-dense whole-food plate reaches 100.

HARD CAP 100 — rare. Requires all three macros + clean whole-food quality + real non-starchy vegetables + genuine density.

SUMMARY vs SWAP (important):
- The VERDICT/summary must name ALL missing categories. If protein AND complex carb AND vegetables are all missing, say all three — do NOT focus on just one.
- The SWAP/upgrade names only the SINGLE most impactful change.

CALIBRATION (whole numbers, varied):
- Whole-food, all 3 macros, clean, NO non-starchy veg, low variety (cottage cheese + sweet potato + avocado + ground beef): Part A ~80, Part B ~3 → ~83. Solid; it just lacks vegetables and variety.
- Same plus sautéed kale, cherry tomatoes, herbs: Part A ~80, Part B ~15 → ~95.
- Salmon + quinoa + broccoli + spinach + avocado + herbs: complete + clean + dense → 96-98.
- Grilled chicken + quinoa + broccoli + olive oil (one veg, little color): ~88.
- Eggs + avocado + greens + olive oil, NO carb: missing a macro → ~74.
- Eggs + spinach + plain white toast (refined-only carb): present-but-poor carb → ~80.
- Chicken + white rice + vegetables (refined-only carb): ~73.
- Beef + roasted potato + one egg, monochrome, no greens: complete but shallow → ~84.
- Pizza slice: refined + cheese + no real veg + processed → ~27.
- Fast-food burger + fries: fried + processed meat + refined + no veg → ~19.
- Instant cup noodles: ~6. Soda / candy: ~4. Ice cream scoop: dairy floor → ~16.

{
  "title": "<string — 2-4 word meal name based on what you see, e.g. 'Shin Ramen', 'Grilled Salmon Bowl', 'Eggs & Avocado Toast'. Be specific to the actual food, not generic like 'Meal Scan'.>",
  "score": <number 0-100>,
  "completeness": <number 1-10 — does this work as a FULL, balanced meal: protein + complex carb + healthy fat + vegetables. 10 = all four groups clearly present; deduct roughly 2-3 per missing group. This is PURELY about whether the meal is complete/balanced, NOT about how healthy the ingredients are. A fried-but-present carb (e.g. fried sweet potato) still counts toward completeness — its frying is penalized under quality, not here.>,
  "quality": <number 1-10 — how good the actual ingredients are: whole, unprocessed, nutrient-dense = high; processed, refined, fried, packaged, sugary, additive-heavy, or processed-meat = low. Fold ALL processing judgment into THIS number. This is the more important of the two sub-scores.>,
  "verdict": "<string>",
  "upgrade": {"from": "<string>", "to": "<string>"} or null,
  "annotations": [{"label": "<string>", "ingredient": "<string>", "x": <number 0-100>, "y": <number 0-100>}],
  "insights": [<insight objects>],
  "ingredients": ["<string>", ...],
  "bonus100": "<string OR null — if the score is 94-99, the SINGLE food that would bring this meal to a perfect 100 (the exact same food you named in the verdict's path-to-100 sentence, e.g. 'sauerkraut' or 'fresh herbs'). Use a simple lowercase food name. null if the score is 100 or below 94.>"
}

ANNOTATIONS — Be scientifically precise:
- Only label what you can actually see and identify with certainty
- Each annotation tags ONE specific food with its PRIMARY nutritional property
- Examples of CORRECT labels: Salmon → "Omega-3 Rich", Avocado → "Healthy Fats", Broccoli → "Cruciferous", Eggs → "Complete Protein", Sweet Potato → "Beta Carotene", Brown Rice → "Complex Carbs", Tomatoes → "Lycopene Rich", Spinach → "Iron Rich", Chicken → "Lean Protein", Nori → "Mineral Rich", Tuna → "Omega-3 Rich"
- White rice is "Simple Carbs" NOT "Complex Carbs". Only whole grains (brown rice, quinoa, oats) are complex carbs.
- NEVER assign a property that food doesn't primarily have. Lettuce is NOT "High Fiber". Salmon is NOT "High Fiber". A lemon wedge is NOT "Antioxidant" (it's a garnish). White rice is NOT "Complex Carbs".
- Only annotate foods that are a significant part of the meal, not garnishes
- 2-4 annotations max, each a DIFFERENT food
- Each annotation MUST include "x" and "y" — the percentage coordinates (0-100) of where that food is in the image. Example: food in the top-left corner → x: 20, y: 25. Food in center-right → x: 75, y: 50. Be accurate to where the food actually sits in the photo.

VERDICT — Be a smart friend, not a motivational poster:
- One specific observation about this exact meal. No exclamation marks. No "looks delicious". No "packed with nutrients".
- BAD: "This meal is packed with nutrients and looks delicious! Consider adding a whole grain."
- GOOD: "Solid protein from the salmon and good fats from the avocado — you're just missing a complex carb to round it out."
- Reference actual foods you see. Be specific about what's good and what's lacking.
- REQUIRED: if the meal is missing any of the macro/produce categories (protein, healthy fat, complex carb, vegetables), the verdict MUST explicitly name what's missing using "missing", "needs", or "lacks". If MULTIPLE categories are missing, name ALL of them, not just one. Example (one): "Solid protein and fat, but missing a complex carb — add quinoa." Example (multiple): "Good protein here, but it's missing both a complex carb and any vegetables — add a sweet potato and some greens."
- If the meal hits all four macro requirements, the verdict can celebrate that without mentioning what's missing.
- REFINED CARB CALLOUT: If the meal contains a refined carb (white pasta, white rice, white bread, regular pasta) but no complex carb, the verdict MUST say so explicitly. Example: "The pasta is white-flour based — a whole grain option like brown rice or whole wheat pasta would replace the refined carb here." Don't just say "missing complex carb" when there's clearly a refined carb in the dish; name the swap.
- PATH TO 100: If the score is 94-99 (any score in the 90s but not 100), the verdict MUST end with one short sentence naming a specific bonus element that would push it to a perfect 100. Examples: "Add a fermented element like sauerkraut for a perfect 100." OR "A sprinkle of fresh herbs would round this out to 100." Only one bonus suggestion, the most impactful one. Skip this line if the score is already 100 or below 94. The "bonus100" field MUST name the EXACT same food (simple lowercase), so adding it is a real promise the app will honor.
- DENSITY NOTE (for complete, clean meals scoring 86-93): if the meal is genuinely balanced and clean but LOW on micronutrient variety, the verdict MUST acknowledge that honestly AND constructively. Example: "A genuinely balanced, clean plate — protein, carb, fat and veg are all here. It's just light on micronutrient variety; a handful of leafy greens or some berries would add real density." Praise what's complete, THEN name the density gap. Do not pretend a bland meal is exceptional.
- MISSING-NUTRIENT NOTE: if the meal is otherwise great but clearly lacks a specific beneficial nutrient (e.g. no omega-3, no vitamin C source, no leafy-green folate/iron), you may note it: "Great overall — the one thing missing is an omega-3 source; a few walnuts or some salmon would complete the micronutrient picture."

UPGRADE — Only suggest swaps that meaningfully improve nutrition:
- ABSOLUTE RULE: "from" MUST be a food you can ACTUALLY SEE in the image and that you listed in "ingredients". If the food is not in your ingredients list, you CANNOT use it in a swap. NEVER EVER invent or assume foods that aren't visible.
- Before writing the upgrade, check: "Is this food in my ingredients list?" If NO → set upgrade to null.
- The swap must make HEALTH sense. Don't swap salmon for chicken (both are great). Don't swap healthy foods for equally healthy ones.
- LIKE-FOR-LIKE ONLY: a swap replaces a food with a better version of the SAME thing in the SAME role — white rice → brown rice, white bread → whole-grain bread, regular pasta → whole-wheat pasta, iceberg → spinach, sour cream → Greek yogurt. The "from" and "to" must be interchangeable in the dish.
- NEVER swap across categories. Swapping a condiment/sweetener for a vegetable (e.g. hot honey → cherry tomatoes), or any two unrelated foods, makes NO sense and is wrong. If the real improvement is ADDING a missing category (a vegetable, a complex carb, etc.), do NOT use a swap — set upgrade to null and let the "missing" / "Add X" card handle it.
- Default to null. Only include a swap if the "from" food is genuinely LOWER-QUALITY (refined, processed, fried, sugary, or junk) and the "to" is clearly healthier.
- HARD RULE: NEVER swap one healthy whole food for another healthy whole food. Cottage cheese ↔ Greek yogurt, salmon ↔ chicken, sweet potato ↔ quinoa, avocado ↔ olive oil are all POINTLESS — never suggest them.
- HARD RULE — SAME FOOD / VISUALLY INDISTINGUISHABLE: NEVER suggest a swap between two foods you cannot tell apart from the photo, or that are really the same food in different forms. Plain Yogurt ↔ Greek Yogurt, regular milk ↔ low-fat milk, white sugar ↔ raw sugar, table salt ↔ sea salt are all FORBIDDEN. If you cannot visually confirm the "from" food is the lower-quality version, you do NOT have grounds for the swap — set upgrade to null.
- PRIORITY — REFINED CARB WINS: if the meal contains a refined carb (white bread, white rice, white pasta, regular pasta, tortilla) AND no whole-grain version, the swap MUST be that refined-carb upgrade (White Bread → Whole Wheat Bread, White Rice → Brown Rice, etc.). Do NOT spend the single swap on a marginal protein/dairy tweak when an obvious refined→whole-grain upgrade is sitting on the plate. The swap must address the SAME gap the verdict and "missing" insight name — they have to tell one story.
- HARD RULE: if the meal is COMPLETE (all macros present) and CLEAN (no refined/processed/fried/sugary item), there is NOTHING to swap — set upgrade to null. No quick-swap card on a clean, complete meal.
- "from" and "to" must be Capitalized (e.g. "White Rice" not "white rice")

INSIGHTS — Each type renders differently in the UI. Include each insight's "type" field.
- Every insight MUST have "type" and "text" fields.
- Return insights including ONLY the types that genuinely apply:
  1. EITHER "good" OR "warning" (REQUIRED, NEVER BOTH):
     - "good" — if the meal has any genuine positive qualities (which is true for any meal made of real whole foods, even if incomplete). One positive observation. Just "text", no title. One sentence.
     - "warning" — ONLY when the meal contains genuinely harmful items: fast food, deep-fried items, heavy added sugar, processed/cured meats (bacon/sausage/deli), packaged junk (chips, instant noodles, soda, candy), or sodium-loaded sauces. NEVER use "warning" for fresh fruit, fresh vegetables, eggs, raw nuts, plain yogurt, or whole grains, even if the meal is nutritionally incomplete. Incomplete ≠ unhealthy.
     - Decision rule: use "good" UNLESS you can name a specific harmful processed item in the ingredients. A bowl of just berries is "good" (and the verdict can note it's small/snack-sized). Cheese fries is "warning".
  2. "missing" (ONLY if something is genuinely lacking) — include "title" (2-4 words, Capitalized), "text", AND "suggestions" array with 2-3 foods: [{"emoji": "🍠", "name": "Sweet Potato"}, ...]. If the meal is well-rounded, SKIP this entirely. Do NOT invent a deficiency. If MULTIPLE categories are missing, the "text" should name all of them (and suggestions can cover the most important gap). TITLE must be a positive ACTION phrase like "Add Whole Grains" or "Add Leafy Greens" — NEVER use the word "gap". NEVER include a "missing" insight for a category that is actually present (don't say "missing protein" when protein is there).
  3. "interaction" (REQUIRED) — a real nutrient interaction between two foods in this meal. Just "text". Must mention TWO specific foods. This can be POSITIVE (one food boosts another's absorption, e.g. vitamin C + iron, fat + fat-soluble vitamins) OR a CAUTION about poor combining/absorption or digestion (e.g. calcium-rich dairy blunting iron absorption from greens, a very high-fat load slowing digestion, tannins in tea limiting iron uptake). If a genuine negative interaction or digestion concern exists in THIS meal, prefer flagging it constructively over a generic positive one.
  4. "fact" (REQUIRED) — a genuinely surprising fact about a specific ingredient. Not common knowledge. Just "text".
- IF (and only if) health conditions are listed in the USER CONTEXT section at the very end of this prompt, you MUST also include a "condition" type insight with "title" (the condition name) and "text" about how this meal affects those conditions. If no conditions are listed, omit the condition insight.
- NEVER return two insights of the same type.
- Each "text" is 1-2 sentences. Specific to THIS meal, not generic.
- NO generic advice. Reference actual ingredients you identified.

INTERNAL CONSISTENCY — the score, ingredients, annotations, and insights MUST tell ONE story. Before finalizing:
- Every food you put in an ANNOTATION must also appear in the "ingredients" list. If you annotate something as "Complex Carbs", that food (e.g. potatoes) MUST be in ingredients — and then the meal HAS its complex carb, so do NOT also flag it missing.
- If you flag a missing macro group (complex carb/protein/fat/vegetable), the score MUST be 85 or below AND you must NOT annotate that macro as present. If instead the macro IS present, score it as complete (86+) and do NOT flag it missing. Never do both.
- A 90+ score asserts the meal is complete and clean — it cannot carry a "missing macro" insight.

Return ONLY valid JSON. No markdown. No explanation.
${personalization ? `\n--- USER CONTEXT (apply to insights as instructed above) ---${personalization}` : ""}`;

  const messageContent = isTextMode
    ? [
        { type: "text", text: `${prompt}\n\nUSER'S MEAL DESCRIPTION:\n"${description}"\n\nAnalyze the meal exactly as described. Do not invent ingredients the user didn't name. Treat the description as ground truth for what's in the meal.` },
      ]
    : [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: image, detail: "high" } },
      ];

  // Model by mode: photos use gpt-5.4-mini (newer mini — detects ingredients
  // BETTER than gpt-4o in testing, fast, cheap tier). Text uses gpt-4o-mini
  // (no vision needed, deterministic at temp 0). GPT-5 models only accept the
  // default temperature and use max_completion_tokens instead of max_tokens.
  // gpt-5.4-mini for both modes: it follows the nuanced scoring rubric far more
  // reliably than gpt-4o-mini (which under-credited complex carbs when a refined
  // item was also present). Determinism for identical scans comes from the cache.
  // Photos use the FULL gpt-5.4 (not mini): the mini tier misidentifies
  // look-alike whole foods (e.g. roasted sweet potato read as white bread).
  // Full vision is markedly more accurate at ingredient ID and is worth the
  // cost since scans are infrequent and cached. Text mode has no image to
  // identify, so it stays on the cheaper mini.
  const model = isTextMode ? "gpt-5.4-mini" : "gpt-5.4";
  const isGpt5 = model.startsWith("gpt-5");
  const openaiBody = {
    model,
    messages: [{ role: "user", content: messageContent }],
    response_format: { type: "json_object" },
  };
  if (isGpt5) {
    openaiBody.max_completion_tokens = 3000; // headroom for reasoning + full JSON
  } else {
    openaiBody.max_tokens = 2000;
    openaiBody.temperature = 0;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(openaiBody),
  });

  if (!res.ok) {
    const err = await res.text();
    return Response.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    return Response.json({ error: "No response from AI" }, { status: 502 });
  }

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = reconcileAnalysis(enforceScoreContract(applyJunkScoreGuardrails(JSON.parse(cleaned)), scoreCtx));
    // Cache the result — same scan won't hit the OpenAI API again (memory + Supabase).
    // Rescores are contextual (depend on previous score), so they are NOT cached.
    if (!isRescore) {
      analysisCache.set(cacheKey, analysis);
      await setCachedAnalysis(cacheKey, analysis);
    }
    return Response.json(analysis);
  } catch {
    return Response.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
  }
}

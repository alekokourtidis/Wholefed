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
  if (completeness > 3) return analysis; // real meal — leave the model's score alone

  const title = (analysis.title || "").toLowerCase();
  const has = (words) => words.some((w) => title.includes(w));

  let lo = null, hi = null;
  if (has(["soda", "cola", "coke", "pepsi", "sprite", "fanta", "mountain dew", "gatorade", "lemonade", "soft drink", "energy drink"])) {
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

export async function POST(request) {
  const { image, conditions, profile, labs, conditionScoreEnabled, description } = await request.json();
  const isTextMode = !!description && (!image || image.startsWith("text:"));

  // Check cache — same food + same conditions/profile/labs + same toggle = same result.
  // Text is normalized (lowercase, trimmed, collapsed whitespace) so "2 Eggs " and
  // "2 eggs" share a cache entry and common foods hit far more often.
  const cacheBase = isTextMode
    ? `text:${(description || "").trim().toLowerCase().replace(/\s+/g, " ")}`
    : image;
  const cacheKey = await hashImage(cacheBase, conditions, profile, labs) + (conditionScoreEnabled ? ":cs1" : ":cs0");
  if (analysisCache.has(cacheKey)) {
    return Response.json(analysisCache.get(cacheKey));
  }
  const persisted = await getCachedAnalysis(cacheKey);
  if (persisted) {
    analysisCache.set(cacheKey, persisted);
    return Response.json(persisted);
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
- Sweet potato (orange/yellow flesh, often roasted) — complex carb.
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
- Starchy vegetables: sweet potato, yam, butternut squash, acorn squash, kabocha squash, delicata squash, spaghetti squash, pumpkin, parsnip, taro, plantain, cassava (yuca)
- Legumes: beans (all kinds), lentils, chickpeas, peas, edamame (also count as protein)
- Other: corn (whole/on cob, NOT corn flour), millet bread, popcorn (plain), whole grain crackers

REFINED CARBS (NOT complex carbs — trigger -6 refined grain deduction if present):
- White rice (jasmine, basmati, sushi rice, arborio), instant rice
- White bread, baguette, ciabatta, sandwich bread, brioche, croissant
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
${personalization}

Return a JSON object with exactly this structure:

SCORE STABILITY & ADDITIVITY — critical, do not violate:
- Adding a whole-food, neutral, or healthy ingredient to a meal must NEVER lower the score. More real-food variety is BETTER, not worse. If a meal of "pasta" scores 70, then "pasta + capers" or "pasta + spinach" or "pasta + grilled chicken" must score the SAME or HIGHER — never lower.
- A score only DROPS when a genuinely unhealthy, substantial component is added (e.g. adding deep-fried chicken, bacon, a sugary sauce, or a side of fries). A small flavoring or garnish never drops it.
- BOUNDED ADDITIVITY — additions raise the score only WITHIN the ceiling set by the base dish's OWN problems. They cannot erase what's already wrong. Consider the WHOLE dish: a refined-carb base (white pasta, white rice, white bread), a fatty/oily/creamy/cheese-heavy sauce, added sugar, high sodium, or any processing STILL apply their deductions and ceilings no matter how many healthy items you add. Example: white pasta + oily/creamy sauce scores low-to-mid; adding chicken + spinach improves it but it CANNOT reach the 90s — the refined pasta and the fat-laden sauce cap it (think high-70s/low-80s at best). Only a genuinely clean, whole-food base can reach the 90s. So: adding good food never LOWERS the score, but the base's existing negatives limit how HIGH the additions can push it.
- GARNISHES & SMALL FLAVORINGS are score-neutral-to-positive and NEVER trigger penalties: capers, olives (small amount), pickles (small amount), fresh herbs, spices, lemon/lime, a sprinkle of seeds/nuts/cheese, capers, chili flakes, garlic, scallions. Do NOT apply a sodium penalty for a small amount of a briny garnish like capers or a few olives — the sodium deduction is only for genuinely sodium-LOADED items (soy-sauce-drenched dishes, cured meats, canned soup, chips).
- Capers specifically: a healthy Mediterranean flavoring (antioxidants, very low calorie). Treat as a neutral-to-positive produce/garnish. Never let capers reduce a score.
- Be CONSISTENT: the same meal must produce the same score every time. Compute the deduction stack the same way on every scan.

SCORING — Build the score from explicit components. Two different meals should NEVER end at the exact same score unless they are nutritionally identical.
Do NOT round to multiples of 5 or 10. Use precise numbers.

METHOD — Start at 94 and DEDUCT (or ADD bonuses up to 100). This makes 90s easily achievable for complete clean meals, and 100 a rare ceiling that requires exceptional elements.

BASE: Every meal starts at 94. A complete clean meal with no quality issues lands at 94. Bonuses push the very best meals to 100. Most realistic top-tier meals score 94-97.

REQUIRED MACRO COMPONENTS (deduct if missing):
- Quality protein source absent (-18): a "quality protein source" includes ANY of the following — fish, poultry, eggs, lean red meat, tofu, tempeh, legumes (beans, lentils, chickpeas, edamame), Greek yogurt, skyr, plain yogurt, ANY yogurt (any visible serving — portion size does NOT matter), cottage cheese, ricotta, paneer, OR a significant amount of cheese. Only deduct if NONE of these are present. NEVER apply this deduction or call protein "missing" when yogurt is visible in the image.
- Healthy fat source absent (no avocado/olive oil/nuts/seeds/fatty fish/olives): -12
- Complex carb absent (no whole grains/sweet potato/butternut squash/winter squash/quinoa/oats/legumes; white rice/white bread does NOT count): -12
- Vegetable/produce absent (no veg, including mushrooms/tomatoes/avocado/peppers): -15
  (avocado can count for BOTH healthy fat AND veg in deductions)
  (Greek yogurt and cottage cheese can count as both protein AND a calcium source)

HARD CEILING — non-negotiable. There are TWO independent ceilings; ALWAYS apply the LOWER one.

WEIGHTING PRINCIPLE: ingredient quality / processing matters MORE than completeness — weight it roughly 60% quality, 40% completeness. Hitting all the macro boxes does NOT rescue a processed meal.

(1) COMPLETENESS CEILING:
- If ANY of the four macro requirements above is missing, the final score CANNOT exceed 89.
- 90+ requires every macro requirement to be satisfied. 94 base is for COMPLETE meals only.

(2) QUALITY CEILING (this is the dominant lever — a complete meal that is processed must NOT score well):
- DESSERT / PURE JUNK as the dominant item (cake, cookies, brownies, donut, pastry, croissant, muffin, candy, chocolate bar, ice cream, sugary cereal, chips, soda): CANNOT exceed 20. These are not meals. Score them within a 2-20 band, BUT calibrate by how much genuine nutrition is actually present — do not flatten everything to the same low number:
  - ZERO-nutrition pure sugar (soda, gummies, lollipops, hard candy, cotton candy): 2-6. There is nothing redeeming here.
  - Refined-flour baked goods with little else (plain cookies, cake, cupcakes, donuts, croissants, plain pastries): 6-12. Mostly sugar + refined flour, trace nutrition.
  - Desserts with a REAL nutritional component (ice cream / milkshake / frozen yogurt = dairy, so some protein + calcium + fat; nut-based or dark-chocolate items = some healthy fat/antioxidants; a muffin with nuts/oats/fruit): score 14-20. This is a HARD FLOOR — ice cream, milkshakes, and frozen yogurt MUST score at least 14 and must NOT drop into single digits, because dairy provides genuine protein, calcium, and fat. A scoop of ice cream scoring 8 is WRONG — it should be ~16. Ice cream is junk, but it is NOT as empty as soda or candy, and the score must reflect that difference clearly.
  When in doubt for a refined/sugary item with no redeeming component, score LOWER not higher. A lone plain pastry scoring 24 is WRONG — it should be ~9.
- PROCESSED / PACKAGED AUTO-PENALTY: any item that is clearly processed or packaged (has a wrapper, an ingredients label, is fried, cured, or factory-made rather than a whole food) MUST score low regardless of whether it technically hits macros. Processing alone drags the quality sub-score down and pulls the final score into the lower bands. Whole, minimally-processed foods are the only ones that earn high scores.
- HEAVILY processed (deep-fried main, fast food, mostly packaged/refined, OR processed meat as the main protein): CANNOT exceed 55, even if every macro is present.
- MODERATELY processed (one fried element, OR a refined-grain base, OR a sugary/processed sauce as a notable component): CANNOT exceed 78, even if every macro is present.
- Only a genuinely clean, whole-food meal can reach 90-100.
- If you find yourself wanting to score a processed-but-complete meal in the 80s-90s because "it technically hits all the macros," resist. Quality outranks completeness.

AMBIGUOUS GRAINS — assume refined unless told otherwise: if bread, toast, a bun, a roll, a wrap, a tortilla, rice, pasta, or noodles appears WITHOUT a clear whole-grain signal (the words "whole wheat", "whole grain", "sprouted", "Ezekiel", "brown", "quinoa", "multigrain", etc.), treat it as a REFINED carb. Plain "toast" or "bread" = refined. It does NOT satisfy the complex-carb requirement.

REFINED-BUT-OTHERWISE-COMPLETE RULE: when a meal has protein + healthy fat + vegetables and its ONLY shortfall is that its carb is refined rather than whole-grain (e.g. eggs + spinach + plain white toast), do NOT crater it. Apply the -6 refined-grain deduction but recognize the meal is otherwise complete — land it in the HIGH 80s (about 86-89), NOT in the 70s. Reserve the larger -12 "no complex carb" hit for meals with NO carb of any kind. Example: scrambled eggs + spinach + plain toast = ~88. The same meal with WHOLE WHEAT toast = ~94 (complex carb satisfied).

EXPLICIT MACRO CHECK — do this BEFORE choosing a score:
1. Is there a quality protein source? (yes/no — yogurt of ANY kind or portion = yes)
2. Is there a healthy fat source? (yes/no)
3. Is there a complex carb? (yes/no — fruit alone does NOT count; must be whole grain/legume/starchy vegetable like sweet potato or butternut squash)
4. Is there a vegetable/produce item? (yes/no)
If ANY answer is "no", apply the deduction AND cap at 89.

QUALITY DEDUCTIONS (stack if multiple apply):
- Refined grain present (white rice, white bread, regular pasta): -6
- Fried element present (anything fried, even partially): -10
- Processed protein present (deli meat, sausage, bacon, chicken nuggets): -10
- Heavy sugary sauce/dressing (BBQ, ketchup with sugar, honey mustard, sweet glaze): -8
- High sodium sauce (soy sauce loaded, ranch, processed dressing): -5
- Added sugar visible (syrup, sweetener, dessert component): -10
- Cheese as primary protein or in large amount: -6
- Single vegetable variety only (one type of veg, no diversity): -3
- Portion clearly oversized or undersized: -4
- Mostly beige (no color variety, no green): -5

QUALITY BONUSES (add ON TOP of base 94, max +6 total to reach 100):
- Fermented food included (kimchi, sauerkraut, yogurt, kefir, miso): +2
- Omega-3 source (fatty fish, flax, chia, walnuts): +2
- 3+ distinct color groups on plate: +2
- Visible fresh herbs (cilantro, basil, dill, parsley, mint, chives): +2
- Raw + cooked vegetables both present: +1
- Includes a uniquely nutrient-dense ingredient (sea vegetable, fermented vegetable, raw fish, microgreens, organ meat): +2

WHAT 100 LOOKS LIKE — a meal that hits ALL macro requirements AND has at least 3 of the bonus elements above. Example: grilled wild salmon + roasted butternut squash + sauteed kale + avocado + fresh dill + sauerkraut. Hits all macros (94), gains omega-3 (+2), fresh herbs (+2), fermented (+2) → 100. This should be RARE.

WHAT 94-97 LOOKS LIKE — a complete clean meal with at most 1-2 bonus elements. Example: grilled chicken + quinoa + roasted broccoli + olive oil → 94 (no bonus). Add lemon + parsley → 96 (+2 herbs).

Show your work mentally before answering. Two different meals SHOULD produce different scores because the deduction stack is different.

RANGES:
- 94-100: Complete clean meals (94 base). 100 is exceptional and rare.
- 80-93: Complete or near-complete, but one macro gap OR one mild quality issue.
- 65-79: Decent foundation but multiple gaps OR one moderate junk element OR low nutrient density (technically complete macros but boring/limited ingredients).
- 45-64: Average. Mix of whole and processed, clear gaps.
- 30-44: Poor. Mostly processed or very limited variety.
- 15-29: Bad. Fast food, heavy processed.
- 5-14: Very bad. Pure junk.
- 1-4: Rock bottom.

NUTRIENT DENSITY SANITY CHECK — if a meal technically hits all macros but is nutritionally bland (e.g., bread + plain yogurt + olive oil = covers carb/protein/fat but has no vegetables and minimal variety), the missing-vegetable deduction already applies. Don't over-deduct beyond the stated rules.

CALIBRATION EXAMPLES (sanity checks against the deduction method + ceiling):
- Grilled salmon + quinoa + broccoli + avocado + olive oil + fresh herbs: 94 base + bonuses (herbs+omega3) = 98. COMPLETE, no ceiling.
- Eggs + smoked salmon + spinach + tomato + avocado + butternut squash: 94, all macros covered + bonuses (omega-3 from salmon, 3+ colors, leafy greens) = up to 100. COMPLETE.
- Eggs + avocado + tomatoes + greens + olive oil (NO complex carb): 94 - 12 = 82, capped at 89. Bonuses can lift to 86-88 max.
- Eggs + smoked salmon + spinach + tomato + avocado (NO complex carb): 94 - 12 = 82 + bonuses (omega-3, colors, greens) = ~87. Capped at 89.
- Bread + plain yogurt + olive oil (NO vegetables): 94 - 15 - 6 (refined grain) = 73. Capped at 89 because of missing veg.
- Chicken stir-fry with white rice + vegetables: 94 - 12 (no complex carb, white rice doesn't count) - 6 (refined grain) - 5 (soy sauce) = 71. Capped at 89.
- Tuna sushi roll (white rice + fish + nori + cucumber): 94 - 12 (no complex carb) - 6 (white rice) - 5 (sodium) - 3 (limited veg) = 68.
- Beef sandwich with lettuce + tomato + cheese on white bread: 94 - 12 (no complex carb) - 6 (cheese) - 6 (refined bread) - 3 (limited veg) = 67.
- Pasta with meat sauce, no greens: 94 - 15 (no veg) - 12 (no complex carb, regular pasta) - 6 (refined grain) = 61.
- Chicken breast + white rice only: 94 - 15 - 12 (no fat) - 12 (no complex carb) - 6 (refined) = 49.
- Pizza slice: 94 - 12 (no complex carb) - 6 (refined grain) - 6 (cheese) - 15 (no real veg) - 10 (processed) = 45.
- Fast food burger + fries: 94 - 12 - 10 (fried) - 10 (processed protein) - 6 (refined grain) - 15 (no real veg) = 41.
- Just blueberries + pomegranate (snack, not full meal): 94 - 18 (no protein) - 12 (no fat) - 12 (no complex carb) = 52. Verdict should note this is "more of a snack than a meal" not call it processed.
- COMPLETE but MODERATELY processed (grilled chicken + sweet potato FRIES + side salad + olive oil): protein/carb/fat/veg ALL present, so completeness is satisfied — but the carb is fried, so the QUALITY CEILING of 78 applies. 94 - 10 (fried) = 84, then capped at 78. Completeness alone does not lift it back up.
- COMPLETE but HEAVILY processed (fried chicken sandwich on white bun + fries + soda): macros arguably present, but deep-fried main + refined bun + fried side = heavily processed → QUALITY CEILING of 55. Lands ~45-50 regardless of completeness.
- Bag of chips alone: 94 - 18 - 12 - 12 - 15 - 10 (processed) = 17
- Instant cup noodles: 94 - 18 - 12 - 15 - 6 (refined) - 5 (sodium) = 38
- Chocolate chip cookies: no protein, no complex carb, no veg, added sugar, refined flour → DESSERT CEILING → ~8.
- Slice of cake / cupcake: pure sugar + refined flour, no real nutrition → DESSERT CEILING → ~7.
- Croissant or plain pastry alone: refined-flour, buttery, no real nutrition → ~11.
- Donut: refined flour + fried + added sugar → ~6. Plain muffin: ~12.
- Ice cream scoop: dessert ceiling, BUT dairy gives real protein/calcium/fat → ~17 (higher end of the junk band — NOT as low as candy).
- Milkshake: dairy + sugar → ~16. Candy bar: some, but mostly sugar → ~6. Soda: zero nutrition → ~3. Gummy candy: ~3.
- Pizza slice: ~27 (refined grain -6, cheese -6, no real veg -15, processed -10)
- Fast food burger + fries: ~19 (fried -10, processed protein -10, refined grain -6, no real veg -15)
- Bag of chips alone: ~6
- Instant cup noodles: ~3

If a meal is ALL processed with no whole foods, quality MUST be 1/10 (completeness still reflects only whether the macro groups are present).

{
  "title": "<string — 2-4 word meal name based on what you see, e.g. 'Shin Ramen', 'Grilled Salmon Bowl', 'Eggs & Avocado Toast'. Be specific to the actual food, not generic like 'Meal Scan'.>",
  "score": <number 0-100>,
  "completeness": <number 1-10 — does this work as a FULL, balanced meal: protein + complex carb + healthy fat + vegetables. 10 = all four groups clearly present; deduct roughly 2-3 per missing group. This is PURELY about whether the meal is complete/balanced, NOT about how healthy the ingredients are. A fried-but-present carb (e.g. fried sweet potato) still counts toward completeness — its frying is penalized under quality, not here.>,
  "quality": <number 1-10 — how good the actual ingredients are: whole, unprocessed, nutrient-dense = high; processed, refined, fried, packaged, sugary, additive-heavy, or processed-meat = low. Fold ALL processing judgment into THIS number. This is the more important of the two sub-scores.>,
  "verdict": "<string>",
  "upgrade": {"from": "<string>", "to": "<string>"} or null,
  "annotations": [{"label": "<string>", "ingredient": "<string>", "x": <number 0-100>, "y": <number 0-100>}],
  "insights": [<insight objects>],
  "ingredients": ["<string>", ...]
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
- REQUIRED: if the meal is missing any of the four macro requirements (protein, healthy fat, complex carb, vegetables), the verdict MUST explicitly name what's missing using the words "missing", "needs", or "lacks". Example: "Solid protein and fat from the eggs and avocado, but missing a complex carb — add quinoa or sweet potato next time."
- If the meal hits all four macro requirements, the verdict can celebrate that without mentioning what's missing.
- REFINED CARB CALLOUT: If the meal contains a refined carb (white pasta, white rice, white bread, regular pasta) but no complex carb, the verdict MUST say so explicitly. Example: "The pasta is white-flour based — a whole grain option like brown rice or whole wheat pasta would replace the refined carb here." Don't just say "missing complex carb" when there's clearly a refined carb in the dish; name the swap.
- PATH TO 100: If the score is 94-99 (any score in the 90s but not 100), the verdict MUST end with one short sentence naming a specific bonus element that would push it to a perfect 100. Examples: "Add a fermented element like sauerkraut for a perfect 100." OR "A sprinkle of fresh herbs would round this out to 100." Only one bonus suggestion, the most impactful one. Skip this line if the score is already 100 or below 94.

UPGRADE — Only suggest swaps that meaningfully improve nutrition:
- ABSOLUTE RULE: "from" MUST be a food you can ACTUALLY SEE in the image and that you listed in "ingredients". If the food is not in your ingredients list, you CANNOT use it in a swap. NEVER EVER invent or assume foods that aren't visible.
- Before writing the upgrade, check: "Is this food in my ingredients list?" If NO → set upgrade to null.
- The swap must make HEALTH sense. Don't swap salmon for chicken (both are great). Don't swap healthy foods for equally healthy ones.
- GOOD swaps: white rice → brown rice (ONLY if white rice is in ingredients), iceberg lettuce → spinach, sour cream → Greek yogurt
- Default to null. Only include a swap if it's genuinely obvious and the "from" food is clearly unhealthy.
- "from" and "to" must be Capitalized (e.g. "White Rice" not "white rice")

INSIGHTS — Each type renders differently in the UI. Include each insight's "type" field.
- Every insight MUST have "type" and "text" fields.
- Return insights including ONLY the types that genuinely apply:
  1. EITHER "good" OR "warning" (REQUIRED, NEVER BOTH):
     - "good" — if the meal has any genuine positive qualities (which is true for any meal made of real whole foods, even if incomplete). One positive observation. Just "text", no title. One sentence.
     - "warning" — ONLY when the meal contains genuinely harmful items: fast food, deep-fried items, heavy added sugar, processed/cured meats (bacon/sausage/deli), packaged junk (chips, instant noodles, soda, candy), or sodium-loaded sauces. NEVER use "warning" for fresh fruit, fresh vegetables, eggs, raw nuts, plain yogurt, or whole grains, even if the meal is nutritionally incomplete. Incomplete ≠ unhealthy.
     - Decision rule: use "good" UNLESS you can name a specific harmful processed item in the ingredients. A bowl of just berries is "good" (and the verdict can note it's small/snack-sized). Cheese fries is "warning".
  2. "missing" (ONLY if something is genuinely lacking) — include "title" (2-4 words, Capitalized), "text", AND "suggestions" array with 2-3 foods: [{"emoji": "🍠", "name": "Sweet Potato"}, ...]. If the meal is well-rounded, SKIP this entirely. Do NOT invent a deficiency.
  3. "interaction" (REQUIRED) — a real nutrient interaction between two foods in this meal. Just "text". Must mention TWO specific foods.
  4. "fact" (REQUIRED) — a genuinely surprising fact about a specific ingredient. Not common knowledge. Just "text".
${conditions && conditions.length > 0 ? '- You MUST also include a "condition" type insight. Include "title" (the condition name) and "text" about how this meal affects: ' + conditions.join(", ") + '.' : ""}
- NEVER return two insights of the same type.
- Each "text" is 1-2 sentences. Specific to THIS meal, not generic.
- NO generic advice. Reference actual ingredients you identified.

Return ONLY valid JSON. No markdown. No explanation.`;

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
  const model = isTextMode ? "gpt-4o-mini" : "gpt-5.4-mini";
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
    const analysis = applyJunkScoreGuardrails(JSON.parse(cleaned));
    // Cache the result — same scan won't hit the OpenAI API again (memory + Supabase)
    analysisCache.set(cacheKey, analysis);
    await setCachedAnalysis(cacheKey, analysis);
    return Response.json(analysis);
  } catch {
    return Response.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
  }
}

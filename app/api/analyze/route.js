// Allow large image uploads (up to 10MB base64)
export const maxDuration = 60;

// In-memory cache — keyed by image hash + conditions + profile
const analysisCache = new Map();

async function hashImage(image, conditions, profile) {
  const key = image.slice(0, 200) + image.slice(-200) + image.length + JSON.stringify(conditions || []) + JSON.stringify(profile || {});
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request) {
  const { image, conditions, profile, labs, conditionScoreEnabled, description } = await request.json();
  const isTextMode = !!description && (!image || image.startsWith("text:"));

  // Check cache — same image/text + same conditions + same toggle = same result
  const cacheBase = isTextMode ? `text:${description}` : image;
  const cacheKey = await hashImage(cacheBase, conditions, profile) + (conditionScoreEnabled ? ":cs1" : ":cs0");
  if (analysisCache.has(cacheKey)) {
    return Response.json(analysisCache.get(cacheKey));
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

INGREDIENT DETECTION — Be exhaustive:
- ${isTextMode ? "Treat every food the user named as PRESENT. Do not add foods they didn't mention. Do not omit foods they did mention." : "Look VERY carefully at every distinct food component on the plate. Most meals have 5-10+ ingredients."}
- Identify specific preparations: "Scrambled Eggs" not just "Eggs", "Smoked Salmon" not just "Fish", "Tabbouleh" not just "Grains".
- ${isTextMode ? "Sauces and condiments the user mentioned count." : "Look for sauces, condiments, dips, and garnishes — they count. Schug, hummus, tahini, pesto, salsa, etc."}
- If you see grains mixed with herbs (like tabbouleh, couscous), identify the dish, not just "grains".
- Return ALL ingredients in the "ingredients" array, not just the top 3-4. Aim for completeness.

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
`}

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

SCORING — Build the score from explicit components. Two different meals should NEVER end at the exact same score unless they are nutritionally identical.
Do NOT round to multiples of 5 or 10. Use precise numbers.

METHOD — Start at 94 and DEDUCT (or ADD bonuses up to 100). This makes 90s easily achievable for complete clean meals, and 100 a rare ceiling that requires exceptional elements.

BASE: Every meal starts at 94. A complete clean meal with no quality issues lands at 94. Bonuses push the very best meals to 100. Most realistic top-tier meals score 94-97.

REQUIRED MACRO COMPONENTS (deduct if missing):
- Quality protein source absent (no fish/poultry/eggs/tofu/legumes/lean meat): -18
- Healthy fat source absent (no avocado/olive oil/nuts/seeds/fatty fish/olives): -12
- Complex carb absent (no whole grains/sweet potato/butternut squash/winter squash/quinoa/oats/legumes; white rice/white bread does NOT count): -12
- Vegetable/produce absent (no veg, including mushrooms/tomatoes/avocado/peppers): -15
  (avocado can count for BOTH healthy fat AND veg in deductions)

HARD CEILING — non-negotiable:
- If ANY of the four macro requirements above is missing, the final score CANNOT exceed 89. Period. Cap at 89 regardless of how many bonuses apply.
- 90+ requires every macro requirement to be satisfied.
- 94 base is for COMPLETE meals only.
- If you find yourself wanting to score an incomplete meal in the 90s because "the foods present are really good," resist. The hard ceiling exists because completeness matters more than ingredient quality alone.

EXPLICIT MACRO CHECK — do this BEFORE choosing a score:
1. Is there a quality protein source? (yes/no)
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
- Bag of chips alone: 94 - 18 - 12 - 12 - 15 - 10 (processed) = 17
- Instant cup noodles: 94 - 18 - 12 - 15 - 6 (refined) - 5 (sodium) = 38
- Pizza slice: ~27 (refined grain -6, cheese -6, no real veg -15, processed -10)
- Fast food burger + fries: ~19 (fried -10, processed protein -10, refined grain -6, no real veg -15)
- Bag of chips alone: ~6
- Instant cup noodles: ~3

If a meal is ALL processed with no whole foods, variety MUST be 1/10 and nutrition MUST be 1/10.

{
  "title": "<string — 2-4 word meal name based on what you see, e.g. 'Shin Ramen', 'Grilled Salmon Bowl', 'Eggs & Avocado Toast'. Be specific to the actual food, not generic like 'Meal Scan'.>",
  "score": <number 0-100>,
  "variety": <number 1-10>,
  "nutrition": <number 1-10>,
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

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
      max_tokens: 2000,
      temperature: 0.55,
    }),
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
    const analysis = JSON.parse(cleaned);
    // Cache the result — same image won't hit the API again
    analysisCache.set(cacheKey, analysis);
    return Response.json(analysis);
  } catch {
    return Response.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
  }
}

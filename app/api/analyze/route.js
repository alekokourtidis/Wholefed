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
  const { image, conditions, profile, labs } = await request.json();

  // Check cache — same image + same conditions = same result
  const cacheKey = await hashImage(image, conditions, profile);
  if (analysisCache.has(cacheKey)) {
    return Response.json(analysisCache.get(cacheKey));
  }

  // Build personalization context
  let personalization = "";
  if (conditions && conditions.length > 0) {
    personalization += `\n\nIMPORTANT — This user has the following health conditions: ${conditions.join(", ")}.
You MUST factor these into your analysis:
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
Be specific to THEIR conditions, not generic health advice.`;
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

  const prompt = `You are an elite nutritionist analyzing a meal photo. Be precise, factual, and specific to what you actually see. No filler. No motivational fluff.

INGREDIENT DETECTION — Be exhaustive:
- Look VERY carefully at every distinct food component on the plate. Most meals have 5-10+ ingredients.
- Identify specific preparations: "Scrambled Eggs" not just "Eggs", "Smoked Salmon" not just "Fish", "Tabbouleh" not just "Grains".
- Look for sauces, condiments, dips, and garnishes — they count. Schug, hummus, tahini, pesto, salsa, etc.
- If you see grains mixed with herbs (like tabbouleh, couscous), identify the dish, not just "grains".
- If something could be multiple things, list the most likely identification.
- Return ALL ingredients in the "ingredients" array, not just the top 3-4. Aim for completeness.
${personalization}

Return a JSON object with exactly this structure:

SCORING — Be brutally honest. Every meal is unique — give a UNIQUE score.
Consider: how many food groups, nutrient density, processing level, macro balance, and portion quality.
Do NOT round to multiples of 5 or 10. Use precise numbers.

CRITICAL ANTI-CLUSTERING RULE: Look at each meal's specific details. A tuna sushi roll (72) is NOT the same as a chicken salad (68) or a beef stir-fry (64). Small differences matter:
- White rice = simple carb, scores LOWER than brown rice or quinoa
- Raw vegetables score higher than cooked
- Fried food scores lower than grilled
- More distinct ingredients = higher variety score
- Sauces with sugar/sodium reduce score

RANGES:
- 90-100: Exceptional — 5+ whole food groups, no processed items. Almost never.
- 75-89: Good — solid whole foods, maybe one gap.
- 60-74: Decent — mostly good but some processed elements or missing groups.
- 45-59: Average — mix of whole and processed, clear gaps.
- 30-44: Poor — mostly processed or very limited variety.
- 15-29: Bad — fast food, heavy processed.
- 5-14: Very bad — pure junk.
- 1-4: Rock bottom — zero nutritional value.

CALIBRATION (follow these, scores spread across the full range):
- Instant cup noodles: score 3, variety 1, nutrition 1
- Bag of chips alone: score 6, variety 1, nutrition 1
- Fast food burger + fries: score 19, variety 3, nutrition 2
- Pizza slice: score 27, variety 3, nutrition 3
- Chicken breast + white rice only: score 38, variety 3, nutrition 5
- Pasta with meat sauce: score 44, variety 4, nutrition 4
- Beef sandwich with lettuce/tomato: score 49, variety 5, nutrition 5
- Tuna sushi roll (white rice): score 57, variety 5, nutrition 6
- Chicken stir-fry with vegetables: score 64, variety 6, nutrition 7
- Eggs + avocado + tomatoes + greens: score 76, variety 7, nutrition 8
- Grilled salmon + salad + quinoa: score 83, variety 8, nutrition 9
- Diverse bowl: salmon, avocado, greens, sweet potato, seeds: score 91, variety 9, nutrition 9

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
     - "good" — if the meal has genuine positive qualities. One positive observation. Just "text", no title. One sentence.
     - "warning" — if the meal is unhealthy/harmful. One negative observation about health risk. Just "text", no title. One sentence.
     - Use "good" for scores >= 50, "warning" for scores < 50. NEVER return both.
  2. "missing" (ONLY if something is genuinely lacking) — include "title" (2-4 words, Capitalized), "text", AND "suggestions" array with 2-3 foods: [{"emoji": "🍠", "name": "Sweet Potato"}, ...]. If the meal is well-rounded, SKIP this entirely. Do NOT invent a deficiency.
  3. "interaction" (REQUIRED) — a real nutrient interaction between two foods in this meal. Just "text". Must mention TWO specific foods.
  4. "fact" (REQUIRED) — a genuinely surprising fact about a specific ingredient. Not common knowledge. Just "text".
${conditions && conditions.length > 0 ? '- You MUST also include a "condition" type insight. Include "title" (the condition name) and "text" about how this meal affects: ' + conditions.join(", ") + '.' : ""}
- NEVER return two insights of the same type.
- Each "text" is 1-2 sentences. Specific to THIS meal, not generic.
- NO generic advice. Reference actual ingredients you identified.

Return ONLY valid JSON. No markdown. No explanation.`;

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
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image, detail: "high" } },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return Response.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const text = data.choices[0].message.content;

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = JSON.parse(cleaned);
    // Log insight count for debugging
    console.log(`[analyze] title="${analysis.title}", score=${analysis.score}, insights=${analysis.insights?.length || 0}, ingredients=${analysis.ingredients?.length || 0}`);
    // Cache the result — same image won't hit the API again
    analysisCache.set(cacheKey, analysis);
    return Response.json(analysis);
  } catch {
    console.error("[analyze] Failed to parse:", text.slice(-200));
    return Response.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
  }
}

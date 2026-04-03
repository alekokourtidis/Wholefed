export async function POST(request) {
  const { image, conditions, profile } = await request.json();

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

  const prompt = `You are an elite nutritionist analyzing a meal photo. Be precise, factual, and specific to what you actually see. No filler. No motivational fluff.
${personalization}

Return a JSON object with exactly this structure:

{
  "score": <number 0-100>,
  "variety": <number 0-100>,
  "nutrition": <number 0-100>,
  "verdict": "<string>",
  "upgrade": {"from": "<string>", "to": "<string>"} or null,
  "annotations": [{"label": "<string>", "ingredient": "<string>", "position": "<string>"}],
  "insights": [<insight objects>],
  "ingredients": ["<string>", ...]
}

ANNOTATIONS — Be scientifically precise:
- Only label what you can actually see and identify with certainty
- Each annotation tags ONE specific food with its PRIMARY nutritional property
- Examples of CORRECT labels: Salmon → "Omega-3 Rich", Avocado → "Healthy Fats", Broccoli → "Cruciferous", Eggs → "Complete Protein", Sweet Potato → "Beta Carotene", Rice → "Complex Carbs", Tomatoes → "Lycopene Rich", Spinach → "Iron Rich", Chicken → "Lean Protein"
- NEVER assign a property that food doesn't primarily have. Lettuce is NOT "High Fiber". Salmon is NOT "High Fiber". A lemon wedge is NOT "Antioxidant" (it's a garnish).
- Only annotate foods that are a significant part of the meal, not garnishes
- 2-4 annotations max, each a DIFFERENT food in a different quadrant (top-left, top-right, bottom-left, bottom-right)
- Position must match where the food actually is in the image

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

INSIGHTS — Mix visual and text content:
- Return 3-4 insights. Each one must teach something specific about THIS meal.
- Types and when to use them:
  - "missing" — only if something is genuinely missing (not just "could be better"). Include "title" (2-4 words, Capitalized) and "text". Icon: "eco"
  - "interaction" — a real nutrient interaction happening between foods in this meal. These are the most valuable insights. Icon: "link". No title needed.
  - "fact" — a genuinely surprising, specific fact about an ingredient in this meal. Not common knowledge. Not "salmon has omega-3s" (everyone knows that). Icon: "lightbulb". No title needed.
  - "condition" — ONLY if user has health conditions. How this specific meal affects their condition. Icon: "monitor_heart". Include "title" (the condition name) and "text".
- NO generic advice like "eating greens is good for you". Every insight must be specific to THIS meal.
- Keep each insight text to 1-2 sentences max.
${conditions && conditions.length > 0 ? "- You MUST include at least one 'condition' type insight referencing: " + conditions.join(", ") : ""}

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
            { type: "image_url", image_url: { url: image, detail: "low" } },
          ],
        },
      ],
      max_tokens: 1500,
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
    return Response.json(analysis);
  } catch {
    return Response.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
  }
}

// Extract bloodwork data from an uploaded image/PDF using GPT-4o Vision

export const maxDuration = 60;

export async function POST(request) {
  const { image } = await request.json();

  if (!image) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  const prompt = `You are a medical data extraction specialist. Analyze this bloodwork/lab results image and extract ALL biomarker values you can identify.

Return a JSON object with this exact structure:
{
  "markers": [
    {
      "name": "<biomarker name, standardized — e.g. 'Total Cholesterol', 'LDL Cholesterol', 'Fasting Glucose', 'HbA1c', 'Vitamin D', 'Iron', 'Ferritin', 'TSH', 'Triglycerides', etc.>",
      "value": <number>,
      "unit": "<unit — e.g. 'mg/dL', 'ng/mL', 'mIU/L', '%', etc.>",
      "status": "<'normal', 'low', 'high', or 'critical' — based on standard reference ranges>",
      "reference_range": "<string — e.g. '100-199 mg/dL'>"
    }
  ],
  "lab_date": "<date of the test if visible, ISO format, or null>",
  "lab_name": "<name of the lab/provider if visible, or null>",
  "summary": "<1-2 sentence summary of notable findings — what's out of range and what it means>"
}

RULES:
- Extract EVERY biomarker you can read from the image. Be thorough.
- Use standardized biomarker names (not abbreviations unless that's the standard — e.g. "HbA1c" is fine, "TC" should be "Total Cholesterol")
- If a value is flagged as high (H) or low (L) on the report, reflect that in "status"
- If you can't read a value clearly, skip it — don't guess
- If this is NOT a bloodwork/lab report, return {"error": "This doesn't appear to be a lab report", "markers": []}

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
      max_tokens: 3000,
      temperature: 0,
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
    const labs = JSON.parse(cleaned);
    return Response.json(labs);
  } catch {
    return Response.json({ error: "Failed to parse lab results", raw: text }, { status: 500 });
  }
}

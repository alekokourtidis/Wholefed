// Lab results storage — localStorage + Supabase sync

const LAB_KEY = "wholefed_labs";

export function getLabResults() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(LAB_KEY));
  } catch {
    return null;
  }
}

export function setLabResults(labs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAB_KEY, JSON.stringify(labs));
}

export function clearLabResults() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LAB_KEY);
}

// Format lab data into a string for the AI prompt
export function formatLabsForPrompt(labs) {
  if (!labs || !labs.markers || labs.markers.length === 0) return "";

  const lines = labs.markers.map((m) => {
    const flag = m.status === "high" ? " ⬆ HIGH" : m.status === "low" ? " ⬇ LOW" : "";
    return `- ${m.name}: ${m.value} ${m.unit}${flag} (ref: ${m.reference_range})`;
  });

  let text = `\n\nIMPORTANT — This user has uploaded bloodwork. Their actual lab values:\n${lines.join("\n")}`;

  if (labs.summary) {
    text += `\nLab summary: ${labs.summary}`;
  }
  if (labs.lab_date) {
    text += `\nTest date: ${labs.lab_date}`;
  }

  text += `\n\nUse these REAL lab values to personalize your analysis:
- If their cholesterol is high, flag saturated fat and praise omega-3 sources
- If their iron/ferritin is low, highlight iron-rich foods and vitamin C pairing
- If their blood sugar or HbA1c is elevated, flag high glycemic foods
- If their vitamin D is low, note foods with vitamin D
- If their triglycerides are high, flag refined carbs and sugar
- Reference their SPECIFIC numbers when relevant (e.g., "With your LDL at 165, the saturated fat in this meal isn't ideal")
- The "condition" insight card should reference bloodwork findings`;

  return text;
}

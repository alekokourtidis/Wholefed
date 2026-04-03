// Validated health conditions — only these can be added
// Grouped for search, but stored flat
export const CONDITIONS = [
  // Metabolic
  "Type 1 diabetes", "Type 2 diabetes", "Prediabetes", "Insulin resistance",
  "Metabolic syndrome", "Hypothyroidism", "Hyperthyroidism", "Hashimoto's thyroiditis",
  "PCOS", "Hemochromatosis",
  // Cardiovascular
  "High blood pressure", "High cholesterol", "High triglycerides",
  "Coronary artery disease", "Heart failure", "Atrial fibrillation",
  "History of stroke", "Familial hypercholesterolemia",
  // Digestive
  "Celiac disease", "Gluten sensitivity", "Crohn's disease", "Ulcerative colitis",
  "IBS", "GERD", "Gastroparesis", "Diverticulitis", "Chronic pancreatitis",
  "Lactose intolerance", "Fructose malabsorption", "Histamine intolerance",
  "SIBO", "Fatty liver disease", "Gallstones", "Barrett's esophagus",
  // Kidney
  "Chronic kidney disease", "Kidney stones", "Gout", "Nephrotic syndrome",
  // Allergies
  "Peanut allergy", "Tree nut allergy", "Dairy allergy", "Egg allergy",
  "Wheat allergy", "Soy allergy", "Fish allergy", "Shellfish allergy",
  "Sesame allergy", "Alpha-gal syndrome",
  // Autoimmune & Inflammatory
  "Rheumatoid arthritis", "Lupus", "Multiple sclerosis", "Psoriasis",
  "Ankylosing spondylitis", "Sjogren's syndrome", "Eczema",
  // Bone & Joint
  "Osteoporosis", "Osteopenia", "Osteoarthritis", "Fibromyalgia",
  // Blood
  "Iron-deficiency anemia", "B12 deficiency", "Folate deficiency",
  "Sickle cell disease", "G6PD deficiency",
  // Neurological
  "Epilepsy", "Migraine", "ADHD",
  // Reproductive
  "Pregnancy", "Breastfeeding", "Endometriosis", "Menopause",
  // Other
  "Acne", "Rosacea", "Chronic fatigue syndrome", "Long COVID",
  "Mast cell activation syndrome", "Obesity",
];

// Search conditions — returns matches sorted by relevance
export function searchConditions(query) {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const exact = [];
  const startsWith = [];
  const contains = [];

  for (const c of CONDITIONS) {
    const lower = c.toLowerCase();
    if (lower === q) exact.push(c);
    else if (lower.startsWith(q)) startsWith.push(c);
    else if (lower.includes(q)) contains.push(c);
  }

  return [...exact, ...startsWith, ...contains];
}

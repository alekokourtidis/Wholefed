# Wholefed 📱🥗

**AI-Powered Food Intelligence Platform**

Wholefed revolutionizes nutrition analysis by using computer vision and AI to provide instant, intelligent feedback on meal quality. Simply scan your plate and receive personalized health insights that go far beyond calories.

![Wholefed Demo](https://via.placeholder.com/600x400/2c3e50/ecf0f1?text=Wholefed+Scan+Demo)

## ✨ Key Features

- **AI Vision Analysis** - Instant meal recognition using GPT-4o Vision
- **Smart Health Scoring** - Dual-axis evaluation (Variety + Nutrition)  
- **Nutrient Interaction Engine** - Identifies how foods work together
- **Personalized Recommendations** - Based on health conditions and patterns
- **Educational Insights** - Rotating "Did You Know" facts for each scan
- **Pattern Recognition** - Tracks eating habits over time

## What It Is

**Cal AI simplicity + Yuka health philosophy + health intelligence nobody else has.**

- Cal AI's UX: dead simple, camera-first, two taps and you're done
- Yuka's mission: help people understand what they're eating and make better choices
- New layer: nutrient interactions, what's missing, personalized health flags, rotating education — things no app currently does

## Core Philosophy

- **Not about weight.** Not about calories, macros, bulking, cutting, or dieting
- **About eating clean.** Is this food actually good for you? Plain English, no spreadsheets
- **No numbers.** No gram counts, no percentages, no macro breakdowns. Just natural language
- **Simple as possible.** Open, scan, done. The result screen IS the product
- **Erewhon energy.** Premium, clean, health-oriented. Not a gym app

## Scoring: Two Gradient Bars (Variety + Nutrition)

No single number. No letter grades. Two horizontal gradient bars — red (left) to green (right) — with a dot marker showing where this meal lands on each.

**Bar 1: Variety** — how diverse are the ingredients? Multiple food groups and sources, or one-dimensional?
**Bar 2: Nutrition** — how nutrient-dense are these ingredients? Rich in vitamins/minerals, or empty calories?

No numbers anywhere. The color position tells the story instantly. Both dots in the green = great meal. One in the red = you know exactly what to improve.

These two categories don't overlap:
- Salmon, kale, sweet potato, avocado = high Variety, high Nutrition
- Only brown rice and lentils = low Variety, decent Nutrition
- White bread, fries, soda = low Variety, low Nutrition
- 10 different fruits = high Variety, moderate Nutrition (missing protein/fat)

## App Structure (3 tabs)

### Tab 1: Scan (center, primary)
- Full-screen camera viewfinder
- Tap to scan
- This IS the app — everything else is secondary

### Tab 2: History (left)
- Vertical scroll of past scans
- Each entry: photo thumbnail + two small colored dots (green/amber/red for each bar) + date
- Tap to revisit full result
- Feels like a premium photo journal of your meals

### Tab 3: Profile (right)
- Health conditions toggles (high BP, diabetes, gluten, etc.)
- Subscription status
- Settings

### Future: Trends (NOT MVP)
- Day-by-day score history
- Trends over time (eating cleaner this week vs last?)
- Streaks
- Pattern insights surfaced here too

## Scan Result Screen (the product)

### Score
- 0-100 number at the top, calculated from all factors below
- Big, prominent, color-coded (forest green = high, amber = mid, red = low)
- Perfect meals exist — 100 is achievable. Don't always find problems

### Variety + Nutrition bars
- Two horizontal gradient bars (dark grey → forest green)
- Dot marker shows where this meal lands on each
- No numbers on the bars

### On the photo (floating annotations)
- 3-5 ingredient pointers max — short pill labels on the food
- Dark frosted glass style (NOT white backgrounds)
- If the app already told you about this ingredient recently, it skips it
- Looks like a luxury X-ray of your plate

### Below the photo (dynamic cards)

Cards are NOT fixed — the AI picks 4-5 most relevant from the pool below.
Good meals show more positive cards. Basic meals show more suggestion cards.
Total cards stays roughly the same so the screen always feels balanced.
Order alternates between visual and text cards for rhythm.

**ALWAYS PRESENT:**

1. **One-liner verdict** (floating text, no card)
   - Leads with something positive, then honest assessment
   - "Salmon is a great protein choice. This plate leans carb-heavy though — a leafy green would round it out"
   - For great meals: "Well-balanced meal — good variety, nothing major missing"
   - Can incorporate "rate this ingredient" praise inline
   - NO numbers, NO grams, NO macros

2. **Did You Know** (small card, leaf icon)
   - ONE rotating fact per scan, tied to the meal
   - "Eating greens before starch reduces glucose spikes"
   - Never repeats same fact to same user

**SUGGESTION CARDS (show when meal needs work):**

3. **Quick Upgrade** (visual swap card)
   - Clean arrow format: "White Rice → Black Rice"
   - One swap per card. Visual, minimal
   - Only shows if something can be upgraded

4. **Interaction + Fix** (combined card — the unique feature)
   - Problem + solution together: "Your cheese is blocking iron from the spinach"
   - Then 3 fix options in a row: "Add: lemon, bell pepper, or orange"
   - Small food icons next to each suggestion
   - Only shows when real interactions exist

5. **Missing source** (alert style)
   - "No fiber source on this plate" or "Missing healthy fats"
   - Simple, one line, subtle alert styling

**POSITIVE CARDS (show when meal is good):**

6. **Good combo** (card with chain link icon)
   - "The olive oil is helping you absorb vitamins A, D, E, K from the salad"
   - Celebrates smart food pairings

7. **Rate this ingredient** (highlight card)
   - "Salmon: omega-3s, anti-inflammatory, great protein source"
   - Makes you feel good about what you ate

**OCCASIONAL (not every scan):**

8. **Pattern Alert** (alternates with Personal Flag)
   - "Rice in 4 of your last 5 meals — try quinoa or sweet potato"
   - "You've been eating well for 7 days straight"
   - Only when a real pattern exists

9. **Personal Flag** (only if user set health conditions OR uploaded lab results)
   - "High sodium — flagged for your blood pressure"
   - "Your last bloodwork showed low iron — this meal has no iron sources"
   - Only when genuinely relevant

### Health Document Upload (in Profile)
- Users can upload bloodwork, lab results, doctor reports as PDF or photo
- AI extracts health conditions and nutrient levels automatically
- Feeds into Personal Flag cards and Interaction + Fix suggestions
- Disclaimer: "For educational purposes only. Not medical advice."

## Anti-Repetition Logic

When the same ingredient appears in multiple scans:
- 1st scan: full annotation + interaction + educational fact
- 2nd scan (same day): skip ingredient annotation, focus on meal composition and interactions with NEW ingredients
- 3rd+ scan: only mention if new interaction or cumulative pattern ("High-glycemic carbs in 3 of your last 4 meals")

## Design Direction

- Ultra-clean, minimal, premium
- Dark mode primary (deep matte charcoal, not pure black)
- Accent: muted sage green or warm off-white
- Typography: thin modern sans-serif, generous letter-spacing, all caps headers
- Frosted glass cards on dark background
- No cartoons, illustrations, or emojis
- Photography-forward with subtle grain texture
- Rounded but not bubbly
- Vibe: Oura Ring app, Erewhon, Aesop packaging, Apple Health dark mode

## Competitive Positioning

| Feature | Yuka | Cal AI | SnackShot | Wholefed |
|---------|------|--------|-----------|----------|
| Scan cooked meals | No (barcode only) | Yes | Yes | Yes |
| Health grade/score | Yes (barcode only) | No | Yes (0-100) | Yes (letter grades) |
| Beyond calories | Yes (barcode only) | No | Surface-level | Yes |
| Nutrient interactions | No | No | No | Yes |
| What's missing | No | No | Basic | Yes |
| Personal health flags | No | No | No | Yes |
| Rotating education | No | No | No | Yes |
| Not a calorie counter | Yes | No | Yes | Yes |

## Tech Stack (Planned)

- Frontend: Next.js, React, Tailwind CSS
- Native: Capacitor (iOS)
- AI: GPT-4o Vision API (image -> structured health analysis)
- Backend: Supabase (auth, database, storage)
- Payments: RevenueCat + Apple IAP

## Monetization

- Free: 3 scans per day
- Pro: Unlimited scans, history, trends — $4.99/month

## Viral Strategy

- Letter grades are inherently shareable ("My lunch got an A-")
- "Did you know" facts are screenshot-worthy
- Nutrient interaction insights are "I had no idea" content
- "Can you get an A+ on your fast food order?" = TikTok challenge
- The scan result screen is designed to be screenshotted and shared

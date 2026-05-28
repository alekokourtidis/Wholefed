# The Wholefed Growth Masterclass
### Everything, from first principles. Written to teach, not to skim.

This is the long version. Eight essays. Read it like a course. Each part explains the *why* underneath the tactic, because tactics expire and principles do not. Everything here traces to real sources (Cal AI teardowns, the leaked TikTok algorithm doc, RevenueCat's subscription data, FTC rules, marketplace rate data). Where something is folklore rather than confirmed fact, it says so. That distinction is itself a skill: most "growth gurus" sell you folklore as law.

A note for you specifically, Aleko: you learn fastest when you understand the mechanism, so I have written this to give you the mechanism first and the move second. The hooks in here are real examples pulled from videos that actually performed. Do not copy them word for word. They are there to show you the shape. Write your own in your voice.

---

# PART 1 — How Cal AI actually grew (and why the story you heard is half myth)

Cal AI is the most important case study for you because it is almost your exact app: an AI photo-calorie scanner, built by two 17-year-olds (Zach Yadegari and Henry Langmack), launched May 2024, and sold to MyFitnessPal in a deal announced March 2026 after crossing roughly $40 to $50M in annual revenue. They did it in about 18 months with around 30 employees. So the path is real and recent, not ancient startup lore.

Here is the arc with real numbers:
- Launched May 2024.
- Roughly 100,000 downloads and $1M in revenue in the first four months.
- Around $8M ARR by end of 2024.
- About 8.3M downloads by July 2025, around 15M by exit.
- $30M revenue across 2025, then $5.7M in January 2026 alone, which annualizes past $50M.
- Pricing: free to download, then $2.49/month or $29.99/year.

**The myth.** The story that reached you was "they posted on twelve different accounts." That is partly true and mostly misleading. Cal AI did run around a dozen branded TikTok accounts (@getcalai, @cal_ai_, @try.cal.ai, and so on). But that was a small piece, not the engine. Nobody got rich because one person sprayed clips across twelve logins.

**The real engine had three stacked parts:**

1. **The founder ground it out daily for about a year before the money was real.** This is the unglamorous part everyone edits out. The discovery and the daily posting came first, for a long time, with little reward.

2. **A direct-relationship influencer roster, not a marketplace.** They built up to 150+ fitness creators posting regularly, roughly four videos a month each. Crucially, these were direct relationships. On the record, the team said they do not use influencer marketplaces or databases. They DM'd creators themselves (later via assistants) and built real relationships so creators would introduce them to other creators. Creators were paid anywhere from $100 to $100,000 per roughly two-month cycle depending on size, often with a referral code so they had skin in the game. This roster was their single most profitable channel, by their own statement.

3. **Paid ads layered on top, late.** Only after the organic creator videos proved themselves did they pour money into TikTok and Meta ads (reported around $7,000/day at one point). And the ad creative was mostly the winning creator videos recycled. They did not guess at ads. They amplified what already worked organically.

**How they found the creators (this is the genius move, and it costs nothing).** Zach made a brand-new TikTok account and trained its For You Page by only engaging with health and fitness content. Within a day or two his feed became an endless ranked list of exactly the creators he wanted, surfaced by the algorithm based on who was performing *right now*. He turned TikTok's recommendation engine into a free creator-sourcing tool. Then he DM'd them. Part 7 covers how to do this yourself.

**The content was deliberately not salesy.** The format was "what I eat in a day" where the creator photographs each meal and the app shows the result. No hard sell. The product demonstrated itself. They gave creators a couple of example videos but let them keep creative freedom so it looked native to their normal content. This matters enormously and Part 4 explains why.

**What this means for you.** The replicable parts are: (a) the niche-trained discovery account, (b) seeding with a tiny cheap test before spending real money, (c) native creator-format integration instead of hard-sell, and (d) systematically testing hooks and recycling the winners. The non-replicable-while-solo part is the 150-creator roster. That is a people operation. You get there by validating a format yourself first, then paying and recruiting others to scale it.

A fairness note: most of Cal AI's internal numbers come from the founders themselves and from teardown writers reconstructing it from interviews. TechCrunch openly said it could not verify the download and revenue claims. Treat the exact figures as well-corroborated but founder-sourced, not audited.

---

# PART 2 — How the algorithms actually work (the real reason things go viral)

If you understand this part, every format decision later becomes obvious instead of arbitrary. The honesty rule first: no platform publishes its full ranking code. What we have is (a) platform-confirmed statements, (b) one genuinely leaked internal TikTok document verified by the New York Times, and (c) practitioner folklore. I will label which is which, because knowing the difference is the actual skill.

## The single most important thing: the leaked TikTok formula

TikTok's internal "Algo 101" document, leaked to and verified by the NYT in 2021, reduced the core scoring to roughly this:

```
score = Plike x Vlike + Pcomment x Vcomment + Eplaytime x Vplaytime + Pplay x Vplay
```

Read it slowly because it explains everything:
- **P** is the model's *predicted probability* that *you specifically* will like or comment.
- **E** is *estimated* playtime, how long it predicts you will watch.
- **V** is the *value weight* TikTok assigns to each action, meaning how much the company wants that action to happen.

Two giant lessons fall out of this:

1. **The algorithm is predicting your behavior, not judging your video in the abstract.** "Going viral" just means the model keeps betting you will engage and keeps being right. Your video is a means to the platform's real goal.

2. **Each term has a tunable weight (V).** That is why "what matters most this year" keeps changing. The company turns the dials. The document itself says the real equation is far more complex but the logic is identical.

The same doc states the system optimizes for user value, long-term user value, creator value, and platform value, all serving two north-star metrics: **retention** (do you come back tomorrow) and **time spent**. Burn this in: the algorithm does not care about your video. It cares about keeping the viewer on the app. Every weight exists to serve that.

## The three-stage pipeline (confirmed architecture)

Every one of these platforms runs the same shape of recommender:
1. **Candidate generation:** from hundreds of millions of videos, narrow to a few hundred that might fit you (using "people like you watched these" plus content features).
2. **Ranking:** score each candidate with the heavy ML model (the formula above).
3. **Delivery:** send the ranked list to your phone.

## Traffic pools / the seed-test (folklore, but directionally real)

The widely-taught model: a new video is first shown to a small seed pool (commonly cited as 200 to 500 viewers). The algorithm watches how that pool reacts. Strong response means promotion to a bigger pool (a few thousand), then bigger again (tens of thousands), escalating in tiers. TikTok has never officially confirmed the "500-viewer batch" numbers, so treat the exact sizes as folklore. But the *behavior* (escalating exposure based on early response) is real, because that is how any explore/exploit recommender works. This also explains why a video can suddenly "reawaken" days later: the system keeps re-testing it against fresh pools.

## Signal weighting, strongest to weakest

The reliable ordering (the magnitudes are estimates, the order is well-agreed):
1. **Watch time / completion rate.** The dominant signal, estimated around 40 to 50% of the effective weight.
2. **Shares, especially DM sends** (sending to a specific person inside the app). Treated as the strongest endorsement.
3. **Saves / favorites.** High effort, signals lasting value.
4. **Comments.** High weight, and uniquely valuable for dwell time (explained below).
5. **Follows triggered by the video.** Strong but rarer.
6. **Likes.** The *weakest* meaningful signal. One tap, lowest effort.

That last point surprises people. Likes barely matter. Stop chasing them.

## The three platforms differ

- **TikTok:** completion plus DM shares. Aggressively interest-based, weakest tie to follower count, fastest stranger reach. Best place for a no-follower account to break out.
- **Instagram Reels:** Adam Mosseri (head of Instagram) confirmed on record the top signals are watch time, then likes-per-reach, then **sends-per-reach** (DM shares), which is the number one driver of reaching strangers. He stresses *ratios* not raw totals: 500 likes from 1,000 viewers beats 5,000 likes from 500,000 viewers. Instagram also suppresses videos with a visible TikTok watermark (confirmed by Mosseri) and suppresses reposted content, so do not cross-post with the watermark on.
- **YouTube Shorts:** separate engine from long-form (decoupled in late 2025, so a flopping Short no longer hurts your long videos). There is no click-through rate because Shorts are swiped, not clicked. The front-door signal is swipe-away vs stay. As of March 2025, *every loop counts as another view*, so looping content literally multiplies your view count. YouTube optimizes Shorts for "satisfaction per swipe," not total minutes.

## Watch time and completion, the mechanical heart

Two quantities compete:
- **Completion rate** = percentage of the video watched. A 10-second video watched fully is 100%.
- **Absolute watch time** = raw seconds held.

Here is the cheat code: a 10-second video watched 1.5 times (a loop) produces **150% completion**, a number a long video physically cannot reach. High completion tells the algorithm "this perfectly matched the viewer." That is why short, loopable content has a structural advantage. It can score above 100% and it stacks more "satisfied viewer" events per minute of feed, which is exactly what the platform's retention goal wants.

But absolute seconds still count, which is why a 30-second video holding 90% can beat a 7-second video at 100%: it delivered more total held attention. The practical target is to maximize completion times length without letting completion collapse. That is why the sweet spot for new-audience reach tends to land around 7 to 30 seconds.

## Why the first 3 seconds are everything (the math)

Retention is a decay curve, and the steepest drop is at the very start. Around 70%+ of viewers decide to stay or scroll within the first 3 seconds. Average attention on a single screen has fallen to roughly 47 seconds.

Here is the part that compounds and that most people miss. The seed-pool test happens first, and the main thing it measures is early retention. If 60% of your seed pool swipes away in 2 seconds, your average completion is mathematically capped low no matter how good the back half is, and you never get promoted to the next pool. **The first 3 seconds do not just lose those viewers. They cap the ceiling of every pool you will ever reach.** This is why the hook is not a nicety. It is the gate.

---

# PART 3 — The psychology of hooks (why specific openings beat others)

A hook's only job is to win the scroll-away decision from Part 2. These are the levers, each with the actual mechanism, so you can invent your own instead of copying.

**Curiosity gap (information-gap theory).** George Loewenstein (1994) defined curiosity as the discomfort from a gap between what you know and what you want to know. The brain treats that gap as an itch it must scratch. A hook like "most people get this completely wrong" opens a gap ("am I one of them?") that you resolve by watching.

**Open loops (the Zeigarnik effect).** Bluma Zeigarnik found in the 1920s that people remember unfinished tasks far better than finished ones. Waiters recalled open orders and forgot them the instant they were delivered. An unresolved thread sits in your working memory until it closes. A hook that *starts* a story or asks a question opens a loop your brain wants to close, so you keep watching. This is why "wait for it" works.

**Pattern interrupt (the orienting response).** Any sudden change in the environment triggers an automatic spike of attention to process the new thing. In a feed of similar clips, an unexpected visual, sound, or framing captures attention involuntarily, before the conscious scroll decision fires. Novelty raises dopamine and biases attention for up to about 20 seconds, then habituates. That habituation is exactly why the *same* hook stops working after a while and you must keep varying it.

**Specificity and numbers.** "I cut my grocery bill by $217" beats "I saved money" because specificity reads as credible and processable. It implies a real, knowable answer exists, which sharpens the curiosity gap. Videos with a concrete number in the hook show meaningfully higher completion.

**Controversy and "you're gonna be wrong."** A mild claim that you are incorrect provokes reactance, the urge to defend your self-image by proving you are the exception. You watch to win. It also bait disagreement, which drives comments.

**"Guess X."** This is the best one for your app because it stacks three levers at once: it opens a loop (you cannot close it without the answer), creates an information gap, *and* converts passive viewers into active participants who comment their guess. That last part feeds the comment signal, which is uniquely powerful, explained next.

A teaching caveat: the underlying psychology (curiosity gap, Zeigarnik, orienting response, novelty-dopamine) is solid lab science about attention in general. The leap to "this exact hook gets +37% views" is practitioner extrapolation. The mechanisms are real. The precise percentages attached to them are marketing.

## Why comments are worth more than they look

Comments punch above their weight because **they manufacture dwell time, and dwell time is the platform's actual goal.**

- On TikTok the video keeps looping while you read and write comments. That time is logged as engagement on top of watch time. A good comment thread can park a viewer on one video for minutes.
- Comment *velocity* matters. Several comments in the first 30 to 60 minutes is one of the strongest early signals to promote a video.
- Depth beats count. Multi-sentence comments, questions, and reply threads outweigh one-word emoji comments.
- Creator replies restart the loop: each reply pulls the commenter back and adds a fresh thread the algorithm reads as sustained discussion.

This is the whole reason comment-bait formats ("comment yours," "guess the answer," a deliberately debatable claim) get pushed harder. They convert passive watch time into active, looping, dwell-heavy engagement, hitting two of the formula's four terms at once. For your app, the move is obvious: end videos with "scan your lunch and comment what it said is missing."

## Shares, saves, and loops

- **Shares (DM sends)** are the highest-trust signal a viewer can give because they attach their reputation to your video by sending it to a specific person. It is also literally a new impression (the recipient watches). Design a reason to send: "send this to someone who eats this every day."
- **Saves** signal durable value ("I'll come back to this"), worth roughly 3x a like by practitioner estimates. Lists, tips, and reference content get saved.
- **Loops** are the only lever that pushes completion past 100%. Creators engineer seamless loops (last frame flows into the first) and delayed payoffs (the answer lands so fast at the end that people loop back to catch it). On YouTube Shorts each loop is literally another view.

## New accounts, consistency, and the "shadowban" truth

- **New accounts are not penalized, they are data-starved.** The model has no history to predict with, so it leans on the only strong signal available: how the seed pool reacts to your content. Because the system is interest-first, not follower-first, a zero-follower account can hit the same seed pool as a big one. This is genuinely good news for you.
- **Posting consistency** gives the algorithm more at-bats (each post is an independent lottery ticket) and more data to learn your niche. There is no confirmed "post N times a day" rule, but consistency is rewarded and quality still gates promotion.
- **Niche consistency** lets the model build a clean profile of what your account is about, so it knows which pool to test you in. Erratic topics make every video start colder.
- **Shadowban, the honest version.** TikTok denies "shadowbanning" as a secret account penalty, and that version is largely myth. What is real and confirmed is **content-distribution prioritization**: borderline, low-quality, watermarked, or reposted content gets made "ineligible for the For You feed." It stays on your profile but the algorithm will not promote it, so views crater. Same felt experience, different cause. The fix is to avoid the triggers (banned hashtags, watermarks, reposts, bot-like mass-following), not to perform superstition rituals.

---

# PART 4 — The content formats, in depth (where the app IS the content)

The core principle, confirmed across every winning app: these apps are not advertised, they are *demonstrated*, and the app's on-screen output is the payoff the viewer already wanted. Cal AI's own framework calls it a "3-second demo rule": the core value must be visible fast, and AI apps have a structural advantage because the output is surprising or satisfying to watch. Your photo-to-analysis is a built-in before/after unit. Use it.

Your differentiator vs Cal AI: they only do calories. You do "what is missing and what to add." That is a more interesting reveal and it is uniquely yours. Build every format around it.

Hooks below are real templates from videos that performed. Write your own version.

### Format A: Guess it, then scan it (start here, strongest fit)
- **Why it wins:** it forces a comment before the reveal, which is the single strongest engagement signal, and your app is the answer key. Proven on YAZIO and many food accounts.
- **Real template hook:** "Guess how many calories this is, you're gonna be wrong."
- **Structure:** show the food, prompt the guess on screen, give your guess, scan, reveal, react to the gap. 10 to 25 seconds.
- **Your twist:** "Guess what this 'healthy' bowl is missing." Reveal: no protein, no fiber, basically sugar.
- **Repeatability: 10/10.** Every food is a new round. Infinite.

### Format B: What I eat in a day, but I scan everything
- **Why it wins:** WIEIAD is a massive evergreen format that already exists. The scan slots in as the mechanism, not an interruption. This is the exact format Cal AI's 150 creators used.
- **Real template hook:** "What I eat in a day to hit my protein, watch me scan everything."
- **Structure:** each meal, scan, on-screen reveal, running tally. 20 to 45 seconds.
- **Your twist:** a running "what's missing" tally. Each meal the app tells you what to add next. This is also the one to run occasionally on your personal account.
- **Repeatability: 10/10.**

### Format C: Scanning fast food / viral foods
- **Why it wins:** recognizable branded food gives instant relatability and search traffic. Rides the existing "trying viral foods" genre.
- **Real template hook:** "Scanning everything at McDonald's so you don't have to."
- **Structure:** fast montage, each item scanned, quick verdict. 15 to 40 seconds.
- **Your twist:** the "what's missing" verdict roasts the food naturally. **Repeatability 9/10.**

### Format D: Reaction-bait with a debatable grade ("comment yours")
- **Why it wins:** this is the Umax loop. Give your output one punchy, debatable headline (a completeness grade or blunt one-liner). People argue with the *app's* verdict, not you, which multiplies comments, and "scan yours and comment what it said" turns viewers into creators for you. Umax creators (Dillon Latham, around 1B views) end with "comment what rating y'all got."
- **Your twist:** end every video with "scan your lunch and comment what it said is missing."
- **Safety note:** lean "what to ADD," never "this food is bad." Dietitians flag good/bad framing as moralizing, and it draws disordered-eating criticism. "Add this" is positive, on-brand, and dodges that.

### Format E: Accuracy / honesty test
- **Why it wins:** skepticism is engagement. "Is this app actually right?" reads as journalism, not promotion, which builds trust. Fitness creators post these side-by-side.
- **Real template hook:** "AI to track all your food? Let's test it out." (real, @the_riptor)
- **Caveat:** lower repeatability (6/10), and it cuts both ways since critics make "it got everything wrong" videos too. Use sparingly, and lean into your real differentiator (insight, not just calories) so the test is about something you actually win at.

### On your tier-list idea
Tier lists get reach (proven meme format, countdown holds watch time) but the app's role is weak: most tier-list videos just state numbers with no app at all, so the scanner becomes decoration and converts worse. If you do them, make the *scan* the thing that places each item ("I'm ranking these by what they're missing, and the app decides"). Otherwise lead with A and B, where the app is essential.

### Make the on-screen reveal satisfying (this is product work that is actually marketing)
The payoff is the cut from messy real food to clean data in about 3 seconds. To make that pop on video:
- A 1 to 2 second scan/processing animation acts as the drumroll before the reveal.
- One hero verdict fills the screen first (a grade, a completeness score, or "Missing: protein, fiber"), details second. Editors cut on that moment.
- Numbers that count up and bars that fill animate well and read as "live."
- Color-coded: green checks for what's good, amber "add this" list. Legible with sound off, which is how most people watch.
- Make the result card screenshot-clean and branded so people reshare it. That reshare is the Umax loop and it is free distribution.

---

# PART 5 — The business math (why spending on marketing is rational, or not)

This is the part that separates people who burn money from people who compound it. The one idea everything hangs on: a subscription app spends money to acquire a user, then earns it back slowly over months. You are always front-loading a cost against a future stream of small payments. Every concept here answers one of two questions: how much does one paying customer cost me (CAC), and how much do they eventually give me (LTV). If LTV is comfortably bigger than CAC and you get the money back fast, spending is rational. If not, every ad dollar is on fire.

Most numbers below come from RevenueCat's *State of Subscription Apps*, which aggregates real data from tens of thousands of apps. Tagged confirmed vs estimate.

## The funnel multiplies (why the top number is huge and the bottom is tiny)

```
Impression -> page view -> install -> open -> activation -> trial -> paid -> retained
```

Each arrow is a conversion rate, and they multiply. Real benchmarks:
- Paid social click-through: roughly 0.5 to 2%.
- App store page view to install: 25 to 40% organic, 2 to 5% from paid traffic.
- Install to trial start (Health & Fitness): around 6.7% median, up to 13.3% for top apps.
- Trial to paid (Health & Fitness): around 44.5% (one of the best categories). 82% of trials start on day 0, so people decide fast.

Worked example, 1,000,000 impressions: x1% = 10,000 page views, x30% = 3,000 installs, x90% open = 2,700, x7% trial = ~189 trials, x44% paid = ~83 payers, x70% survive first renewal = ~58 retained subscribers. One million impressions, 58 paying customers who stick. That collapse is normal, and it is exactly why you must know your LTV before deciding what an impression is worth.

## CAC, and the beginner trap

```
CAC = total acquisition spend / number of new PAYING customers
```

The trap: confusing CPI (cost per install) with CAC (cost per paying customer). Example: spend $10,000 at a $4 CPI = 2,500 installs, x7% trial = 175, x44% paid = 77 payers. **CAC = $10,000 / 77 = $130**, even though CPI was $4. That ~30x gap is the most important thing to internalize. CPI for subscription apps runs $3 to $8 on iOS, $2 to $5 on Android. Paying-customer CAC for consumer subscription apps commonly lands $30 to $150. CAC has risen about 60% over five years because Apple's privacy changes (ATT) killed precise tracking.

**Organic vs paid is the whole lever.** Paid CAC is what you pay per customer from ads, always rising. Organic CAC (App Store search, word of mouth, viral content) is near zero in media cost. Blended CAC = total spend / total customers (paid + organic). The more organic you have, the lower your blended CAC, which is the entire reason Cal AI's influencer/organic engine beat competitors.

## LTV

```
LTV = (monthly revenue per user x gross margin) / monthly churn rate
average customer lifetime in months = 1 / monthly churn
```

Why 1/churn is the lifetime: if 5% cancel each month, the average subscriber stays 1/0.05 = 20 months. This inverse relationship is why churn is the master enemy. Worked example: $29.99/year, minus Apple's 15% small-business cut = ~$25.50 net, with ~33% annual renewal (so lifetime ~1.5 years) gives LTV ~$38. Confirmed data point: **AI apps carry a 41% higher year-one LTV than non-AI apps ($30.16 vs $21.37 median).** Your app is an AI app, so that premium is yours. Also: iOS LTV is roughly 5x Android.

## LTV:CAC and payback

- LTV:CAC below 1 means you lose money on every customer. 3:1 is the classic healthy target. Above 4 or 5:1 often means you are *underspending* and could grow faster.
- Why 3:1? It comes from David Skok's 2010 SaaS framework. Of every $3 of LTV, about $1 covers acquisition and the other $2 must cover product, salaries, support, the time-cost of waiting, and finally profit.
- Payback period = CAC / monthly gross profit per customer. Target under 12 months, because if a customer churns before you recoup CAC, you lost money on them. Shorter payback means your cash recycles faster and growth compounds.

## Retention is the master variable

It lives inside both LTV and growth. Health-app retention is brutal: Day 1 around 27% (fitness apps 30 to 35%), Day 7 around 13%, Day 30 around 3%. Roughly 97% of people who install a health app are gone within a month, which is why onboarding and activation are life or death. For paying users, the first renewal is the cliff: 30 to 50% churn on weekly plans, 15 to 40% on monthly. Yearly plans retain ~44% at 12 months vs ~17% for monthly. **Push annual plans.** They retain about 2.5x better, which mechanically multiplies LTV. This is why Cal AI prices annual at basically 12x monthly: it nudges everyone onto the better-retaining plan.

## Paywall: hard vs free trial

RevenueCat's data is unusually clear: hard paywalls convert about 5.5x better at day 35 (around 12% vs 2%) and generate about 8x higher revenue per install at day 60 ($3.09 vs $0.38). Trial length matters too: 3 to 7 day trials convert ~27%, 17 to 32 day trials ~46%. Cal AI uses a hard paywall hit almost immediately. The data says that is the higher-revenue choice *if* the product is compelling enough that people commit before fully trying. The trade-off is a scarier-looking top of funnel.

## Virality and why organic is gold (k-factor)

```
k = i x c    (i = invites each user sends, c = conversion rate of those invites)
```

k below 1: referral growth decays but still helps. k = 1: each user replaces themselves. k above 1: self-sustaining exponential growth (rare and brief). The money point: every viral user has near-zero acquisition cost, pulling blended CAC down. Example: spend $10,000 for 100 paid customers ($100 paid CAC), word of mouth brings 100 more free, blended CAC = $50. You just doubled your LTV:CAC without earning a dollar more in LTV. This is structurally why a content-driven app can sustain ad spend that bankrupts a non-viral competitor.

## The single worked model for your app

iOS, hard paywall, $29.99/year, on the 15% cut:
1. Net per annual sub: ~$25.49.
2. Retention ~36%/year, so lifetime ~1.56 years.
3. LTV ~$40.
4. For 3:1, target CAC ~$13 per paying customer.
5. If 10% of installs pay (hard-paywall benchmark), you can afford ~$1.30 per install in loaded cost. That is achievable with cheap influencer/organic content (Cal AI targeted ~$5 CPM) but very hard with paid ads at $4 to $8 CPI. *That is exactly why the organic engine is not optional. It is the thing that makes the math close.*
6. Annual plan pays the full amount upfront, so at $13 CAC payback is immediate. That is why annual + hard-paywall apps can reinvest cash so aggressively.

The lesson: product (retention, paywall, price) and acquisition (organic vs paid) are not separate decisions. Together they decide whether you have a business. Cal AI won by stacking every favorable variable at once.

---

# PART 6 — What to actually pay people (real 2025-2026 numbers)

Every figure here is from a rate marketplace or salary aggregator. The strongest data is Collabstr (live marketplace transactions) and Glassdoor/ZipRecruiter/Upwork.

**Influencer post rates (their own following):**
- Nano (1k to 10k): IG $10 to $100, TikTok $5 to $50.
- Micro (10k to 100k): $150 to $800.
- Mid (100k to 500k): $500 to $5,000.
- **Fitness is cheaper than average.** Average fitness sponsored post is about $175 (real marketplace data). The all-niche average post is about $215.

**UGC (content made for you, you post it on your own account):**
- Beginner creator: $50 to $100/video. Intermediate: $100 to $250. Experienced: $250 to $500.
- You *own* the asset and can reuse it as an ad. Usage rights for ads are charged on top (a 12-month exclusive can add 75 to 150%), but if you only post organically you can often skip that.

**Hiring a friend monthly:**
- Part-time content person is realistically ~$1,000/month (around 10 hours/week at ~$25/hour). Freelance social manager retainers run $750 to $1,500/month basic.

**Affiliate / performance (pay only on results):**
- App promo codes plus 10 to 20% commission. Zero upfront. SaaS affiliate commissions typically run 15 to 25%, sometimes a cut of recurring revenue. This is Cal AI's referral model and you already have the `ak48`-style promo system to do it.

**Is "$100 one-and-done" real?** Only as: one beginner UGC video you own, or one nano post (low reach, gone in 24 hours). Do not pay $100 for one disposable nano post. Spend it on a UGC video you keep forever and can re-run as an ad. Better asset, same money.

**The phased spend plan (cheapest first, because your app costs ~$0 to comp):**
1. **Phase 1, now, ~$0:** you post daily on the Wholefed account.
2. **Phase 2, validate, ~$0 upfront:** once a format clearly hits, gift free Wholefed Pro to 20 to 50 nano fitness creators plus an affiliate code (10 to 20% commission). You pay nothing unless they convert. Highest-ROI lever you have, and exactly what Cal AI did.
3. **Phase 3, scale with money, when revenue justifies:** buy UGC at $50 to $100/video that you own, and put 3 to 5 micro fitness creators on a small base ($50 to $150) plus commission. Budget ~$500 to $2,000/month here.

**On hiring a friend:** do not put someone on $1,000/month before a format is validated. Pay per-video first ($50 to $100 each). Move to a retainer only once the videos are landing, and only if the friend is genuinely into fitness AND genuinely good at posting.

---

# PART 7 — How to actually run creator operations (the step-by-step machine)

The thing nobody tells you: influencer marketing is not a marketing job, it is an operations and sales job. You are running a tiny supply chain (sourcing, qualifying, negotiating, briefing, paying, measuring). Winners do not have better taste in creators. They have a better machine for processing many creators cheaply and consistently. Keep that framing the whole way.

## Step 1: Find creators

- **The Cal AI move (free, highest leverage):** make a fresh TikTok, then for the first few sessions only engage with your niche (fitness, "what I eat in a day," calorie tracking). Watch to completion, rewatch, like, follow, read comments. Skip everything else fast. Within a day or two your For You Page becomes a ranked feed of exactly the creators you want, surfaced because they are performing now. You are mining, not guessing.
- **Hashtag and sound search:** check niche tags (#whatieatinaday, #highprotein) every few hours, not weekly, because the top turns over fast. Find trending sounds and tap the sound page to see everyone using it. Being early to a sound is a huge ranking advantage.
- **Tools:** Collabstr (marketplace, escrow-protected, good for buying your first UGC fast), Favikon (discovery plus contact details). Start 90% with the free FYP method and a Google Sheet. Tools pay off once you manage dozens.

## Step 2: Vet creators (about 90 seconds each)

A study of 100,000 accounts found 37% of influencer followers show signs of being fake, worst in the 100k to 500k tier. So vet.
- **View-to-follower ratio (your #1 filter):** average views 10 to 30% of followers is healthy, 50%+ is excellent, consistently below 5% is a warning, below 1% suggests bought followers. A 6k creator pulling 40k views beats a 300k creator pulling 20k.
- **Engagement rate:** micro should be 5%+ on TikTok, nano can hit 9 to 15%.
- **Comment quality (most predictive):** real audiences leave specific comments ("what protein is that?"). Fake or pod audiences leave generic "🔥🔥" within a minute of every post. Open the comments and look.
- **View consistency:** want a steady floor over a profile with one fluke and everything else dead.
- **Audience fit:** match who watches them to who pays you (geography, language). The most expensive skipped step.

## Step 3: Outreach (a funnel, not a conversation)

The Cal AI rule of thumb: message 500, around 50 reply, around 10 post. That is normal. DMs get 20 to 35% response for nano/micro; email 8 to 15%.

A template that scales:
> Hey [name], been seeing your [specific video] on my FYP, the [specific thing] one was great. I run [App], an AI [one-line what it does]. We pay creators to make short native videos showing it in their normal routine, not scripted ads. Open to a paid collab? Happy to send details plus free access. [Your name]

Why each line: the specific reference proves you are human (kills the spam reflex), "native not scripted" is what creators want to hear (less work, protects their feed), "paid" filters time-wasters, "free access plus details" is a low-commitment yes. Follow up once, 3 to 4 days later. Never more than twice. To scale, a VA (~$4 to $8/hour) sends from the template filling in name plus the specific reference. Do not let them send identical copy-paste with no reference, that tanks reply rates and gets accounts flagged. Never use bulk DM bots, they get you banned.

## Step 4: The brief (where native vs ad-like is decided)

The principle Cal AI got right: give example videos and hard boundaries, then hand over creative freedom. A video fails the moment it *feels* like an ad, because that is when people swipe. Over-scripting kills it. One page:
1. The why (150 to 200 words): what the app does, who it's for.
2. The hook approach, not exact words: give 2 to 3 example hooks, let them write their own.
3. Loose storyboard beats, not dialogue: cold open (0 to 2s visual hook), problem (2 to 5s), demo/result (5 to 12s), CTA (12 to 15s).
4. Authentic integration: where in their normal day the app appears.
5. Non-negotiables: must show the app, say the name once, include #ad, no medical claims, tag your handle.
6. 2 to 3 reference videos framed as "the vibe," never "copy this."
7. Deliverables, format (9:16 vertical), timeline, one revision round.

Use a tight script only for videos destined to become paid ads (more consistent, less native). Loose briefs for organic creator posts.

## Step 5: Deal structures (pick by risk and what you get)

1. **Flat fee per post** (they post to their audience): predictable, you pay regardless of performance. Use for buying cheap nano/micro reach.
2. **Per-video UGC** (you own it): the workhorse for ad creative. Buy 5 to 10 on Collabstr to start. Price usage rights separately.
3. **Monthly retainer** (e.g. 4 posts/month): the Cal AI engine. Graduate your best one-off creators here.
4. **Affiliate / referral code:** pure performance, zero upfront, scales infinitely, but only catches ~30 to 40% of installs and skews toward hungrier smaller creators. Bolt it onto *every* deal as upside.
5. **Base plus performance bonus:** the safest, aligns incentives. Use for mid-tier creators who won't do pure affiliate.
6. **Product gifting:** free access, good for seeding many tiny creators. Still must disclose per FTC.

Your default stack: flat-fee post or per-video UGC plus a referral code on top for nanos/micros, promote winners to retainer, base-plus-bonus for mid-tier. Always attach a code so you get some performance signal even on flat deals. Run the codes through software like Rewardful, Tapfiliate, or GoMarketMe (built for apps, gives each affiliate a QR code plus link plus code).

## Step 6: Whitelisting / Spark Ads (the multiplier)

This is how a few winning creator videos become millions of installs. The creator gives you an authorization code to run paid ads *through their handle* using their video (TikTok calls it Spark Ads, the permission step is whitelisting). The ad looks like the creator's organic post, so it does not trigger the "this is an ad" swipe. TikTok reports Spark Ads get 142% higher engagement and 43% higher conversion than normal brand ads. Paid views stack onto the original post's count too. The loop: run 50 cheap creator posts, 3 pop organically, whitelist those 3 and pour ad budget behind them. You only pay to amplify proven winners. This is exactly Cal AI's sequence. **Put the whitelisting grant in the contract up front**, because asking after a video pops is how you lose the winner or pay a premium. Instagram's version is Partnership Ads.

## Step 7: Tracking and attribution (it is always messy)

The honest truth: codes and links capture only about 30 to 40% of the installs a campaign drives, because people see a video and go search the App Store directly. So measure in layers:
1. Promo/referral codes per creator (catch the no-click conversions).
2. Unique tracked links per creator via an MMP (AppsFlyer, Adjust, Branch).
3. Unique landing pages.
4. A "how did you hear about us?" onboarding survey (recovers the untracked majority).
5. Time-overlap: watch installs spike against when creators posted.

Judge creators on cost per *paying* acquisition and retention, not views. A creator who drives 5,000 installs that all churn is worth less than one who drives 300 who subscribe.

## Step 8: Contracts and the law (one page is enough)

Cover: deliverables and timeline; payment amount, structure, and when; **usage rights** (where, how long, which markets, priced as separate line items); whitelisting/Spark grant; exclusivity only if you need it (it raises price); and the FTC disclosure obligation in writing. The FTC holds *brands* liable, with fines up to ~$50,000 per violation. Disclosure must be clear and at the start of the caption (not buried under "more"), and "#ad" or "Paid partnership with [Brand]" qualifies. Any material connection triggers it, including free product. Sample contract clause:
> Creator agrees to comply with all applicable FTC guidelines, including clear and conspicuous disclosure of any material connection with Brand in every content format, and to correct or remove non-compliant content within 24 hours of Brand's request. Brand may withhold payment for content that fails to meet FTC disclosure requirements.

## Step 9: Scale from few to many

- **Stage 1 (1 to 15 creators):** a Google Sheet is your CRM (handle, followers, avg views, ratio, contact status, deal, code, post date, conversions). This is literally how Cal AI started. Do not skip it for software; the sheet teaches you what the machine must do.
- **Stage 2 (15 to 100+):** an ambassador program, standing roster on retainers and/or codes, tiers and milestones (drive X conversions, graduate to higher commission).
- **Stage 3:** an influencer CRM (GRIN, Roster, CreatorIQ), VAs for outreach and logging, and a split between organic distribution and performance marketing. Cal AI grew to 30+ people this way.

Every step converts one-off, you-dependent work into recurring, templated, delegate-able work. The four levers are templates, VAs, software, and retainers.

## Step 10: The mistakes that kill founders here

1. Shopping by follower count instead of view/follower ratio and audience fit.
2. Running with no tracking, so you cannot tell what worked.
3. Measuring views instead of cost per paying customer and retention.
4. Over-scripting so it looks like an ad.
5. Betting big on one creator instead of spreading across many cheap ones and amplifying winners.
6. Forgetting usage rights and whitelisting up front.
7. Skipping FTC disclosure (you are liable).
8. Treating it as a one-off campaign instead of a continuous machine.

---

# PART 8 — The multi-account / faceless reality (and what is honest vs hype)

This is where most of the survivorship bias lives, so here is the truth.

**The real mechanic is NOT one person posting the same clip to 50 accounts.** That is the myth. The actual operations are distributed: many real people each run an account.
- **Airbuds** (hit #2 on the App Store) ran 50+ accounts and ~300 videos a day, but each account was a different hired student posting their own lo-fi variation.
- **Cal AI** ran ~12 brand accounts but the engine was 150 paid creators plus ads.
- **Blake Anderson** (Rizz, Umax, Cal AI) seeded launches by paying 2 cheap creators ~$50 each, then scaled to paid rosters.

**Does it still work in 2025-2026? With nuance.** Posting the *literal same file* across accounts gets throttled: TikTok uses hashes, metadata, and audio fingerprints, and explicitly limits reach on reposts. Its rules even forbid "creating multiple accounts to amplify the same content." Instagram suppresses TikTok-watermarked videos (confirmed by Mosseri). The reason the farm model still works for those who do it is precisely that they do NOT duplicate. They produce unique variations of one format. Identical-file spraying is increasingly dead. "Many accounts each making fresh takes on one winning format" still works.

**Account warming (real practice):** first 24 hours post nothing, just follow ~15 niche accounts and engage. Days 2 to 7, max 3 videos/day with 30-minute gaps. Full warm-up takes a few weeks. If you see 6 videos in a row under ~20 views, you are throttled: stop posting for 40 to 48 hours, then resume. At scale, operators use anti-detect browsers / cloud phones (GoLogin, AdsPower, GeeLark) with separate fingerprints and proxies so one ban does not cascade.

**Tools:** Shortimize (track many faceless accounts), Postiz (multi-account scheduling), Repurpose.io (auto-resize and strip watermarks, which fixes the Instagram suppression problem).

**The honest downside.** Every case study is a survivor. None report how many accounts produced zero virality, got banned, or churned. Airbuds *explicitly culls* creators who never went viral, so a large unreported share fail. Even the best accounts only convert ~8% of videos to viral. The model assumes most posts flop and works through brute volume. It builds no brand equity and is easily copied. It is a pump, not a moat.

**For you, solo, who finds content hard:** the full 50-account model is not a solo play, it is a people operation, and every documented winner scaled via hired ambassadors or paid creators. The realistic solo version is: run 1 to 2 of your own warmed accounts, post 2 to 4 lo-fi variations a day of ONE proven format, track what hits with Shortimize, and only then recruit/pay creators (via gifting plus codes) to carry the volume. The format is deliberately low-production *because* content is hard for you. That is the entire point of lo-fi.

---

# THE WHOLEFED PLAN (putting all eight parts to work)

**Strategy in one line:** keep your personal account for your health identity, run ONE dedicated Wholefed account where the scan is the payoff of every video, validate the guess-then-scan format yourself, then scale it for near-zero cost by gifting Pro plus affiliate codes to nano fitness creators, and only spend real money amplifying what already works.

**Week 1:**
- Build the satisfying reveal screen in the app (scan animation, one big "what's missing" verdict, green/amber, screenshot-clean card). This is marketing infrastructure.
- Open `@wholefed`. Warm it: 24 hours of no posting, just follow ~15 fitness/food accounts and engage.

**Weeks 2 to 4:**
- Post Format A (guess-then-scan) daily, your own hooks, lo-fi, under 25 seconds, app as the payoff.
- Drop one Format B on your personal account each week.
- Track which hooks hit. Double down on the winners.

**End of Week 4:**
- Take whatever hook/format is hitting, write it into a one-page brief, and start gifting Wholefed Pro plus affiliate codes to nano fitness creators to post that same format. That is when "many accounts" begins, legitimately, at near-zero cost.

**When revenue justifies (Phase 3):**
- Buy UGC at $50 to $100/video that you own, put 3 to 5 micro fitness creators on small base plus commission, and whitelist the videos that pop so you can amplify proven winners with paid ads. Budget ~$500 to $2,000/month.

**The metric that matters:** cost per paying subscriber and retention, never views. And always push the annual plan, because it retains ~2.5x better and that is what actually multiplies your money.

---

*Sources are listed at the end of the companion file `MARKETING_PLAYBOOK.md` and throughout the research this was built from: Cal AI teardowns (growwithplutus, growthcurve, stormy.ai, shortimize, moneymakingstory, whatastartup, CNBC, Inc., TechCrunch), the NYT-verified TikTok "Algo 101" leak, Mosseri's on-record Reels statements, RevenueCat State of Subscription Apps 2024/2025, Collabstr and UGCJobs rate data, AppsFlyer retention benchmarks, FTC influencer disclosure guidance, and TikTok Spark Ads documentation.*

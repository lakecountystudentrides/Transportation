# Pricing Strategy & Business Model — Evidence-Based Update

Supersedes the pricing formula in `03-pricing.md` with a fuller model built against the research in `13-market-competitive-research.md`. Same underlying philosophy (cost-based, not a race to the bottom) but now with the explicit distance-tier matrix, subscription math, and unit economics you asked for.

## Why cost-based, not competitor-matched
Every identifiable competitor (`13-market-competitive-research.md`) hides its pricing — there is no public per-ride number to benchmark against, only an informal-market anchor (~$17–20/hr nanny-style transport in Central FL, and a wide $8–50/trip national range where the low end is not a real business price). **Publishing a real, calculator-driven price is itself your biggest differentiator**, so the pricing has to be built from your actual costs and margin target, not reverse-engineered from competitors who won't show theirs.

## Cost basis (what a trip actually costs you)
Rough per-mile and per-minute cost inputs for a single owner-operator vehicle, Lake County FL, 2026:
- **Fuel:** ~$0.14–0.18/mile (assuming a minivan/SUV at ~24 mpg, FL gas prices)
- **Vehicle wear/maintenance reserve:** ~$0.10–0.15/mile
- **Commercial insurance, amortized:** ~$300–500/month ÷ estimated monthly miles → roughly $0.08–0.15/mile depending on volume
- **Driver time (your own labor, valued at a real hourly rate you'd want to pay a hired driver later — don't discount your own time to zero):** ~$18–22/hour equivalent, which is where the **per-minute** component of pricing earns its keep — a short-mileage but slow/traffic-heavy or multi-stop trip needs to be priced on time, not just distance
- **Payment processing:** ~3% of revenue (Stripe)
- **Overhead (background checks, phone, software, marketing), amortized:** a few dollars per trip at low volume, shrinking per-trip as volume grows

All-in, a trip's true cost is roughly **$0.35–0.45/mile plus $0.30–0.40/minute plus a fixed per-trip overhead allocation of $4–6** at low monthly volume. Pricing below this floor doesn't just reduce margin — it actively loses money once your own labor is valued honestly, which is the trap "just be the cheapest" leads into (per your own instruction not to default there).

## Distance-tier pricing matrix — one-way, single child

| Distance | One-way price | Round trip price | Round-trip savings vs. 2x one-way |
|---|---|---|---|
| 0–5 miles | $20 | $36 | Save $4 (10%) |
| 5–10 miles | $28 | $50 | Save $6 (11%) |
| 10–15 miles | $37 | $66 | Save $8 (11%) |
| 15–20 miles | $46 | $82 | Save $10 (11%) |
| 20–25 miles | $55 | $98 | Save $12 (11%) |
| 25+ miles | $55 + $1.80/mi over 25 | Round trip = 1.8x one-way | ~10% |

Formula behind the table (matches and refines `03-pricing.md`):
```
One-way price = MAX($12 minimum fare, $6 base + $2.25 x miles + $0.35 x estimated minutes)
Round trip     = One-way price x 1.80   (not 2x — driver is already routed/positioned, real savings passed to parent)
```
This keeps every tier at roughly 25–35% gross margin over the cost basis above once you're running consistent recurring volume (margin is thinner on true one-off, low-volume trips — expected, and fine, because one-off rides aren't the core business, recurring is).

## Additional-child and additional-stop pricing
| Scenario | Adjustment |
|---|---|
| 2nd child, same pickup/drop-off, same trip | +50% of base one-way/round-trip price |
| 3rd+ child, same trip | +35% of base price each |
| Additional stop (different address than the primary route) | +$5 flat, or +actual extra mileage/time if it's a significant detour — disclosed before booking, never after |
| Weekend / after-hours (before 6:30 AM or after 8:00 PM) | +$3 flat surcharge |
| Wait time beyond 5 free minutes | +$1/minute, capped and disclosed at booking |

## Weekly and monthly recurring pricing
This is where the real business lives — one-off rides are a nice-to-have, recurring is the revenue base.

**Weekly round-trip package (5-day school week, one child, ≤6 miles each way):**
```
Individual round trips: 5 x $36 = $180/week
Weekly package price:   $153/week (15% recurring discount)
Effective cost/ride:    $15.30 (vs. $18/ride buying individually)
```

**Monthly subscription (round trip, ~21.7 school days/month average):**
| Plan | Price/month | Effective cost/ride | Notes |
|---|---|---|---|
| 1 child, round trip, ≤6 mi | $700 | ~$32/day (2 legs) | Core plan |
| 1 child, round trip, 7–12 mi | $850 | ~$39/day | Core plan, longer commute |
| 2 children (same schedule, same route) | $1,050 | ~$26/child/day | 25% combined discount vs. 2 separate plans |
| 3+ children (same schedule, same route) | $1,050 + $280/additional child | Declining per-child cost | Rewards multi-child families without ever going "unlimited" |
| School-only (one leg AM, one leg PM to daycare/after-care — different destinations) | Priced as two separate recurring legs, each getting the 15% recurring discount independently | | Matches real family routines (school→daycare is extremely common) |
| Custom recurring (irregular days, e.g., 3x/week) | Per-ride price at the recurring discount tier (10% for <5 days/week), billed weekly | | No flat monthly rate below 5 days/week — irregular schedules cost you the same per-trip overhead without the routing efficiency of a fixed daily route |

**Explicitly rejected: unlimited-ride subscriptions.** You flagged this risk yourself, correctly. At this vehicle/driver capacity, "unlimited" has no ceiling on your actual cost exposure — a single vehicle has a hard daily trip ceiling regardless of what a subscription promises, so an unlimited plan either quietly caps itself (misleading to the customer) or genuinely loses money on above-average users. Fixed-schedule recurring plans (above) capture the same "predictable monthly bill" value proposition for the parent without that exposure.

## Family/multi-route discount logic (single, unified rule)
```
Discount = 15% recurring-schedule discount (any 5x/week standing route)
         + 10% additional per child beyond the first, same schedule/route
         + 5% additional per additional standing route for the same family (e.g., school run + activity run)
```
Capped at a combined 35% max discount off the sum of individually-priced components — protects margin on large multi-child, multi-route families while still making them your stickiest, highest-LTV customers.

## Pricing calculator logic (for the website)
Inputs: pickup address, drop-off address, number of children + ages, one-way/round-trip, recurring? (days/week), start date.

```
1. Call mapping API (Google Maps Distance Matrix) with pickup/drop-off → get miles + estimated minutes
2. base_price = MAX(12, 6 + 2.25*miles + 0.35*minutes)
3. if round_trip: base_price *= 1.80
4. if additional children: apply +50%/+35% stacking rule
5. if recurring: apply 15% discount to the per-trip rate, then multiply by (days/week * ~4.33 weeks/month) for the displayed monthly estimate
6. if multiple children/routes on the same family account: apply the family discount logic above
7. Display: per-trip price, weekly price (if recurring), monthly estimate (if recurring), and a plain-language savings line: "You save $X/month vs. booking these as individual rides"
```
Always show the full breakdown, not just a final number — per the research finding that every competitor hides pricing entirely, transparency here is a conversion feature, not just an ethics one.

## Unit economics (illustrative, one vehicle)
| Metric | Estimate |
|---|---|
| Customer acquisition cost (CAC) — early stage, local/organic + small paid | $30–$80 per recurring family signed (driven mostly by time, not ad spend, at this stage) |
| Average recurring monthly revenue per family | $700–$1,050 |
| Direct cost per family/month (fuel, wear, insurance allocation, processing) | ~$180–$260 |
| Gross margin per recurring family | ~65–75% before your own labor is counted as a cost — since you ARE the labor at launch, real owner take-home is materially lower until you hire; see `08-startup-budget.md` monthly overhead numbers |
| Customer lifetime value (LTV), assuming ~1 school year retention (9 months) average at launch, improving with reliability/reputation | $6,300–$9,450 per family before churn/discounts |
| LTV:CAC ratio | Roughly 100:1 to 300:1 at these early estimates — extremely favorable, meaning **the constraint on growth is fleet/driver capacity, not marketing spend or acquisition cost** |

**The real business constraint is capacity, not demand-generation cost** — which reinforces the CEO-level pushback: don't overbuild marketing/SEO reach beyond what one vehicle (soon two) can actually serve reliably.

## Route profitability — time AND distance, not distance alone
Your own instinct here was correct. A 5-mile trip through a school pickup line with 15 minutes of dead time is worse economics than a 10-mile trip on an open road covered in 12 minutes. The formula already prices minutes explicitly (`$0.35/min`) precisely to capture this — but operationally, also track:
- **Route density**: multiple same-direction pickups/drop-offs on one recurring run (e.g., two siblings at different schools 3 minutes apart) are far more profitable per mile than isolated one-off trips — prioritize signing up families whose schedules cluster geographically and by time window.
- **Driver utilization**: a driver sitting idle between a 7:30 AM school run and a 3:00 PM pickup is a real cost (their time, even if unpaid as the owner) — the ideal early customer mix fills that midday gap (daycare transfers, half-day preschool, tutoring runs) rather than leaving it empty.

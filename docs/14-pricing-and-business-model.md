# Pricing Strategy & Business Model — Locked

Full cost-basis and profitability reasoning behind the locked rate card in `03-pricing.md`. Two flat-rate distance tiers (0–5 miles and 5–9 miles), not one flat price across the whole radius — built against the research in `13-market-competitive-research.md`.

## Why two tiers, not one flat price
Every identifiable competitor (`13-market-competitive-research.md`) hides its pricing — there is no public per-ride number to benchmark against, only an informal-market anchor (~$17–20/hr nanny-style transport in Central FL). A single flat price across a wide radius either overprices the common short trips or underprices the rarer longer ones within the same band. Splitting into a 0–5 mile tier and a 5–9 mile tier lets each band price close to its own true cost. Beyond 9 miles, the upper tier price plus a modest per-mile add-on applies, so pricing stays honest on the rare long trip instead of quietly losing money on it.

## Cost basis — true cost, not retail price
Important distinction: the numbers below are what a trip **actually costs to deliver** (fuel, wear, insurance allocation, driver time, per-trip overhead) — not the price charged. An earlier pass through this pricing conflated the two and overstated costs by using a marked-up per-mile rate as if it were the raw cost; corrected here.

- **Fuel + vehicle wear:** ~$0.40/mile (minivan/SUV, FL gas prices, maintenance reserve included)
- **Driver time:** ~$0.35/minute (~$21/hour equivalent) — covers both drive time and pickup/drop-off loading time
- **Fixed per-trip overhead:** ~$4 (background-check amortization, phone, software, admin, spread across trips)
- **Payment processing:** ~3% of revenue (Stripe)

Example true costs at this basis:
| Trip | True cost |
|---|---|
| Short local (~3 mi, ~12 min total) | ~$9.40 |
| Longest Tier 1 trip (5 mi cap, ~16 min total) | ~$11.60 |
| Typical Tier 2 trip (~7 mi, ~20 min total) | ~$13.80 |
| Longest Tier 2 trip (9 mi cap, ~23 min total) | ~$15.47 |
| Rare outlier (40 mi corner-to-corner, ~55 min total) | ~$39.25 |

## Locked rate card

| Category | Tier 1 (0–5 mi) | Tier 2 (5–9 mi) |
|---|---|---|
| One-way | **$15** | **$20** |
| Round trip | **$24** — save $6 vs. $30 | **$34** — save $6 vs. $40 |
| Weekly, one-way only (5 days) | **$63/week** | **$84/week** |
| Weekly, round trip (5 days) | **$99/week** | **$140/week** |
| Monthly, 1 route/day | **$259/month** | **$345/month** |
| Monthly, 2 routes/day | **$409/month** | **$580/month** |
| 2nd child, same schedule | **+$205/month** | **+$290/month** |
| 3rd+ child, same schedule | **+$143/month each** | **+$205/month each** |
| Wait time | First 5 min free, then $1/min | (same) |
| Beyond 9 miles one-way | — | Tier 2 price + $1.20/mile past mile 9 |

No weekend/after-hours surcharge, no additional-stop fee — deliberately dropped to keep the rate card simple.

**Margin at each tier's worst-case distance:**
- Tier 1: true cost at 5 mi ≈ $11.60 → $15 price leaves ≈ **$3.40/trip** margin
- Tier 2: true cost at 9 mi ≈ $15.47 → $20 price leaves ≈ **$4.53/trip** margin

Both tiers carry positive margin across their full range, with the biggest margin on the shortest trips in each band (a 1-mile Tier 1 trip costs far less than $15 to deliver).

**Explicitly rejected: unlimited-ride subscriptions.** A single vehicle has a hard daily trip ceiling regardless of what a subscription promises — an unlimited plan either quietly caps itself (misleading) or loses money on above-average users. The fixed-schedule plans above give parents the same "predictable monthly bill" without that exposure.

## Pricing calculator logic (for the website)
```
1. Call mapping API (Google Maps Distance Matrix) with pickup address → get miles from the dispatch origin
2. If miles <= 5: use Tier 1 pricing
3. If 5 < miles <= 9: use Tier 2 pricing
4. If miles > 9: use Tier 2 pricing + $1.20 x (miles - 9), shown as a separate line item, never silently folded in
5. If additional children: apply the tier's +$/child stacking rule (monthly plans) or the one-off per-trip percentage equivalent (50% for 2nd child, 35% for 3rd+)
6. Display the full price before payment — tier used, any over-9-mile add-on, and any multi-child total — never a "call for final price" step
```
Implemented in `functions/api/price.js`.

## Unit economics — per tier

**Tier 1** ($409/month, round trip, ~3 mi/leg typical):
| Line item | Monthly amount |
|---|---|
| Revenue | $409 |
| Fuel + wear (~3 mi/leg × 2 × 21.7 days × $0.40/mi) | –$52 |
| Payment processing (~3%) | –$12 |
| Per-customer overhead | –$50 |
| **Contribution margin per child** | **≈ $295/month** |

**Tier 2** ($580/month, round trip, ~7 mi/leg typical):
| Line item | Monthly amount |
|---|---|
| Revenue | $580 |
| Fuel + wear (~7 mi/leg × 2 × 21.7 days × $0.40/mi) | –$122 |
| Payment processing (~3%) | –$17 |
| Per-customer overhead | –$50 |
| **Contribution margin per child** | **≈ $391/month** |

Neither figure yet subtracts the business's fixed monthly costs (insurance, phone, marketing — see `08-startup-budget.md`, roughly $450–830/month). Real customers will land in both tiers depending on where they live relative to the dispatch origin — treat $295–$391/month per child as the realistic range rather than a single number until real booking data shows the actual mix.

**At realistic customer counts, assuming a roughly even Tier 1 / Tier 2 mix (~$343/month average margin per child):**
| Recurring round-trip children | Owner pay + profit, before self-employment tax |
|---|---|
| 5 (breakeven zone) | ~$1,115/month |
| 8 (conservative launch target, `07-business-plan.md`) | ~$2,144/month |
| 12 | ~$3,516/month |
| 15 (optimistic — needs sibling/route overlap to be physically driveable solo) | ~$4,545/month |

**The real constraint is fleet/driver capacity, not demand-generation cost or pricing headroom** — CAC for a recurring family is low (mostly time, not ad spend, at this stage per `09-marketing-plan.md`), so growth is capped by how many households one vehicle can actually serve reliably, not by how many you could theoretically sign up. This reinforces the phased service-area approach in `15-service-area-and-seo-strategy.md`.

## What could make this wrong — track and revisit
1. **Trip-time assumption.** Tier 1 assumes ~3 mi/leg (~11 min total), Tier 2 ~7 mi/leg (~20 min total). A real Florida school car line can eat 10–15 minutes of that in queue alone. If real trip time runs long, margin shrinks in either tier — track actual time-per-trip in the first 60–90 days (`17-growth-plan-and-kpis.md`) and revisit price if it's consistently higher than assumed.
2. **One-off rides alone don't build this business.** They clear cost decently in both tiers but the real profit is recurring — see the tables above.
3. **15+ solo-served children is optimistic** unless several share a school/route — treat "waitlist forming" as the real signal for vehicle #2 (`10-growth-plan.md`), not a specific customer count.
4. **Tier mix is unverified.** The blended customer-count table above assumes a 50/50 Tier 1/Tier 2 split — revisit once real bookings show the actual distribution.

## Route profitability — time AND distance, not distance alone
A 5-mile trip through a school pickup line with 15 minutes of dead time is worse economics than a 9-mile trip on an open road covered in 12 minutes — this is why driver time, not just mileage, sits inside the cost basis above. Operationally:
- **Route density**: multiple same-direction pickups/drop-offs on one recurring run (e.g., two siblings at different schools a few minutes apart) are far more profitable than isolated one-off trips — prioritize signing up families whose schedules cluster geographically and by time window.
- **Driver utilization**: idle time between a 7:30 AM school run and a 3:00 PM pickup is a real cost even if unpaid as the owner — the ideal early customer mix fills that midday gap (daycare transfers, half-day preschool, tutoring runs) rather than leaving it empty.

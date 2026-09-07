# Pricing Strategy & Business Model — Locked

Full cost-basis and profitability reasoning behind the locked rate card in `03-pricing.md`. Flat pricing (one price per category, same anywhere in the service area), not distance-tiered — built against the research in `13-market-competitive-research.md`.

## Why flat, not distance-tiered
Every identifiable competitor (`13-market-competitive-research.md`) hides its pricing — there is no public per-ride number to benchmark against, only an informal-market anchor (~$17–20/hr nanny-style transport in Central FL). Publishing one simple, honest flat price per category is itself the biggest differentiator available in this market. The only guardrail: trips beyond 5 miles one-way get a modest per-mile add-on, so the flat rate stays honest on the rare long trip instead of quietly losing money on it.

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
| Longest flat-rate trip (5 mi cap, ~16 min total) | ~$11.60 |
| Typical outside-radius trip (~7 mi, ~20 min total) | ~$13.80 |
| Rare outlier (40 mi corner-to-corner, ~55 min total) | ~$39.25 |

## Locked rate card

| Category | Price |
|---|---|
| One-way (up to 5 miles) | **$20** |
| Round trip | **$34** — save $6 vs. two one-ways ($40) |
| Weekly, one-way only (5 days) | **$84/week** — vs. $100 individually, save $16 (16%) |
| Weekly, round trip (5 days) | **$140/week** — vs. $170 individually, save $30 (18%) |
| Monthly, 1 route/day | **$345/month** |
| Monthly, 2 routes/day (round trip) | **$580/month**, 1 child |
| 2nd child, same schedule | **+$290/month** (combined $870/mo, ~$435/child) |
| 3rd+ child, same schedule | **+$205/month each** (3 kids = $1,075/mo, ~$358/child) |
| Wait time | First 5 min free, then $1/min |
| Beyond 5 miles one-way | Flat rate + $1.20/mile past mile 5 |

**Margin at $20 one-way, 5-mile band:** true cost for the longest trip still covered (5 miles) is ~$11.60 — after payment processing (~$0.60), that's roughly **$7.80/trip in real margin at the farthest distance the flat rate covers**, and even more on every shorter trip within the band. Tightening the radius further (15 → 10 → 5 miles) has only strengthened the margin cushion each time, since a smaller worst-case distance means a smaller worst-case cost.

No weekend/after-hours surcharge, no additional-stop fee — deliberately dropped to keep the rate card as simple as the flat-price promise implies.

**Explicitly rejected: unlimited-ride subscriptions.** A single vehicle has a hard daily trip ceiling regardless of what a subscription promises — an unlimited plan either quietly caps itself (misleading) or loses money on above-average users. The fixed-schedule plans above give parents the same "predictable monthly bill" without that exposure.

## Pricing calculator logic (for the website)
Since pricing is flat, the calculator's job is simpler than a per-mile formula, but distance still matters for one thing: confirming the trip qualifies for the flat rate.

```
1. Call mapping API (Google Maps Distance Matrix) with pickup/drop-off → get one-way miles
2. If miles <= 5: price = flat rate for the selected category (one-way/round trip/weekly/monthly)
3. If miles > 5: price = flat rate + $1.20 x (miles - 5), shown as a separate line item, never silently folded in
4. If additional children: apply the +$290 / +$205-per-child stacking rule (monthly plans) or the one-off per-trip equivalent
5. Display the full price before payment — category, any over-5-mile add-on, and any multi-child total — never a "call for final price" step
```

## Unit economics — updated for the $20/$34/$580 rate card

Per recurring round-trip child, at $580/month, now using a ~4 mi/leg typical trip (realistic for the tighter 5-mile flat-rate radius, down from the earlier 7 mi/leg assumption used with the wider radius):
| Line item | Monthly amount |
|---|---|
| Revenue | $580 |
| Fuel + wear (~4 mi/leg × 2 legs/day × 21.7 days × $0.40/mi) | –$69 |
| Payment processing (~3%) | –$17 |
| Per-customer overhead | –$50 |
| **Contribution margin per child** | **≈ $444/month** |

Up from ~$391/month under the 10-mile-radius/7-mile-trip assumption — tightening the flat-rate radius doesn't just protect against a rare long trip, it also lowers the realistic average trip distance, which directly improves margin on every recurring customer. This margin covers your own driving time (already partly priced into the $0.35/min assumption used to build the base rates) plus real profit — it does not yet subtract the business's fixed monthly costs (insurance, phone, marketing — see `08-startup-budget.md`, roughly $450–830/month).

**At realistic customer counts** (revenue − direct costs above − ~$600/month fixed overhead):
| Recurring round-trip children | Owner pay + profit, before self-employment tax |
|---|---|
| 5 (breakeven zone) | ~$1,620/month |
| 8 (conservative launch target, `07-business-plan.md`) | ~$2,952/month |
| 12 | ~$4,728/month |
| 15 (optimistic — needs sibling/route overlap to be physically driveable solo) | ~$6,060/month |

Still thinner than the original $725/one-way-$25 draft, but healthier than the 10-mile-radius version at the same $580 price — the tighter radius is a net win on margin, not just a safety guardrail. Worth revisiting once 60–90 days of real cost data (per `17-growth-plan-and-kpis.md`) confirms whether the $0.40/mile, $0.35/min, and 4 mi/leg assumptions hold up in practice.

**The real constraint is fleet/driver capacity, not demand-generation cost or pricing headroom** — CAC for a recurring family is low (mostly time, not ad spend, at this stage per `09-marketing-plan.md`), so growth is capped by how many households one vehicle can actually serve reliably, not by how many you could theoretically sign up. This reinforces the phased service-area approach in `15-service-area-and-seo-strategy.md`.

## What could make this wrong — track and revisit
1. **Trip-time assumption.** The math now assumes ~14 minutes of total driving/loading per leg (down from ~20 under the old 7-mile assumption, since the flat radius shrank to 5 miles). A real Florida school car line can still eat 10–15 minutes of that in queue alone, so this is tighter than before — track actual time-per-trip in the first 60–90 days (`17-growth-plan-and-kpis.md`) and revisit price if it's consistently higher than assumed.
2. **One-off rides alone don't build this business.** They clear cost decently (~$8–9 margin on a typical one-way, still ~$7.80 even at the farthest edge of the 5-mile band) but the real profit is recurring — see the table above.
3. **15+ solo-served children is optimistic** unless several share a school/route — treat "waitlist forming" as the real signal for vehicle #2 (`10-growth-plan.md`), not a specific customer count.

## Route profitability — time AND distance, not distance alone
A 5-mile trip through a school pickup line with 15 minutes of dead time is worse economics than a 10-mile trip on an open road covered in 12 minutes — this is why driver time, not just mileage, sits inside the cost basis above. Operationally:
- **Route density**: multiple same-direction pickups/drop-offs on one recurring run (e.g., two siblings at different schools a few minutes apart) are far more profitable than isolated one-off trips — prioritize signing up families whose schedules cluster geographically and by time window.
- **Driver utilization**: idle time between a 7:30 AM school run and a 3:00 PM pickup is a real cost even if unpaid as the owner — the ideal early customer mix fills that midday gap (daycare transfers, half-day preschool, tutoring runs) rather than leaving it empty.

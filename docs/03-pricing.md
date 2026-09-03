# Pricing Strategy — Lake County, FL

## Market context
Lake County has no direct public "kids rideshare" comps to benchmark against, so pricing is built from adjacent local markets:
- **NEMT (non-emergency medical transport)** in Central Florida runs roughly $25–$45 base + $2–$3.50/mile.
- **Private after-school "carpool" services** in Florida metros (Miami, Tampa, Orlando) typically run **$15–$25 per one-way ride** for a single recurring child on a fixed short route, or **$250–$450/month** for daily M–F service on one route.
- **Rideshare (Uber/Lyft)** in Lake County for a comparable 5–10 mile trip runs roughly $12–$22 — but Uber/Lyft won't legally transport unaccompanied minors, which is exactly the gap you're filling, so you're not really competing with them on price; you're pricing against "what a parent would pay a trusted neighbor or a part-time nanny/sitter to do this."

Your price needs to cover: driver time (not just drive time — buffer for lateness, check-in/out, waiting), fuel, vehicle wear, insurance overhead, background-check/training amortization, payment processing fees (~3%), and profit. Price too low and you can't sustain a second vehicle; price too high and you lose to "ask grandma" or the daycare's own van.

## Pricing formula (what the website calculates automatically)

```
Base Fare           = $6.00  (flat, covers dispatch/scheduling overhead)
Per-Mile Rate        = $2.25/mile  (driving distance, pickup → drop-off)
Per-Minute Rate       = $0.35/min  (estimated drive time, covers traffic/short-hop trips where mileage alone undercharges)
Additional Child      = +50% of (Base + Mileage + Time) for 2nd child on same route/same trip
                       +35% of (Base + Mileage + Time) for each additional child beyond the 2nd
Round Trip            = 1.85x one-way price (not a flat 2x — reflects driver already routed/idle time saved)
Recurring Discount    = 10% off per-ride price for 5x/week (M–F) standing schedule
                        15% off per-ride price for 2 or more children on the SAME recurring schedule
Peak/Early Surcharge  = +$3.00 for pickups before 6:30 AM or after 8:00 PM
Wait Time             = First 5 minutes free; $1/minute after, capped and disclosed at booking
Cancellation          = Free >12 hrs notice; 50% of fare 4–12 hrs notice; 100% of fare <4 hrs / no-show
Minimum Fare          = $12.00 (no trip, however short, bills below this)
```

Formula shown to the parent before payment:
```
Estimated Price = MAX( Minimum Fare,
                       Base Fare + (Distance x Per-Mile) + (Est. Time x Per-Minute) )
                  x Round-Trip Multiplier (if applicable)
                  x (1 + Additional-Child %)
                  x (1 - Recurring Discount %, if applicable)
                  + Peak Surcharge (if applicable)
```
Distance/time come from a mapping API (Google Maps Distance Matrix or Mapbox Directions — see Website Tech doc) called at Step 7 of booking, using the actual pickup/drop-off addresses the parent selected in Steps 3–4.

## Worked examples (Lake County geography — ~5–12 mile typical trips between home/school/daycare within the same city)

| Scenario | Distance/Time | Calculation | Price |
|---|---|---|---|
| 1 child, one-way, 5 mi / 12 min, off-peak | 5 mi, 12 min | $6.00 + (5×$2.25) + (12×$0.35) = $6+$11.25+$4.20 | **$21.45** → round to **$21** |
| 1 child, round trip, same route | same | $21.45 × 1.85 | **$39.68** → **$40** |
| 2 children (siblings), one-way, same 5 mi trip | 5 mi | $21.45 × 1.50 | **$32** |
| 3 children, one-way, same trip | 5 mi | $21.45 base + 50% (child 2) + 35% (child 3) = $21.45×1.85 | **$39.68** → **$40** |
| 1 child, one-way, 12 mi / 22 min (cross-town, e.g. Clermont→Leesburg) | 12 mi, 22 min | $6 + $27 + $7.70 | **$40.70** → **$41** |
| Early pickup, 6:00 AM, 1 child, 5 mi | 5 mi | $21.45 + $3 surcharge | **$24** |
| Recurring M–F, 1 child, School run only (one-way AM), 5 mi | 5 mi | $21.45 × 0.90 (10% recurring) = $19.31/ride × ~21.7 school days/mo | **~$419/month** (or quote as $19/ride billed weekly, ~$96.50/wk) |
| Recurring M–F, round trip (AM school + PM pickup), 1 child, 5 mi each leg | 5 mi ×2 legs | ($21.45+$21.45) × 0.90 = $38.61/day × ~21.7 days | **~$838/month** |
| Recurring M–F, round trip, 2 siblings, same schedule | 5 mi ×2 legs, 2 kids | Base pair price $38.61 × 1.50 (2-child) × 0.85 (multi-child recurring stack) = $49.23/day × 21.7 | **~$1,068/month** for both kids, both legs (≈$534/child/month — competitive against most local daycare "extended care" add-on fees) |
| Sports/activity run, one-way, 8 mi, evening 6:30 PM | 8 mi, 15 min | $6 + $18 + $5.25 = $29.25, no surcharge (before 8pm cutoff) | **$29** |

## Recommended published pricing (round, parent-facing numbers)

| Service | Price |
|---|---|
| One-way, single child, ≤6 miles | **$20–$25** |
| One-way, single child, 7–12 miles | **$30–$42** |
| Round trip, single child, ≤6 miles | **$38–$45** |
| Each additional child, same trip | **+50% first extra, +35% each after** |
| Weekly recurring, one-way only (5x/wk) | **$90–$115/week** |
| Weekly recurring, round trip (5x/wk) | **$170–$215/week** |
| Monthly recurring, round trip, 1 child | **$700–$850/month** |
| Monthly recurring, round trip, 2 siblings same schedule | **$1,000–$1,150/month** (per-child savings vs. booking separately) |
| Sports/activity one-off, evening/weekend | **$25–$40**, +$3 late-evening surcharge after 8 PM |

## Positioning
Anchor your marketing around the **monthly recurring round-trip rate per child** ("$700–$850/month covers every school day, both ways, all month") because that's the number a working parent mentally compares against daycare extended-care fees, a part-time nanny, or their own lost work hours — and it reads as far more reasonable framed monthly than as "$40/day."

Revisit pricing after your first 25 customers once you know real average trip length/time and your actual cost-per-mile (fuel + wear) — this formula is a launch starting point, not a permanent rate card.

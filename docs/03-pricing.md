# Pricing — Locked

**This is the final, locked pricing for Lake County Student Rides.** Two flat-rate distance tiers, the same anywhere in the service area — see `14-pricing-and-business-model.md` for the full cost-basis and profitability math behind these numbers, and `15-service-area-and-seo-strategy.md` for the phased service-area rollout these prices apply within.

## Rate card

| Category | 0–5 miles | 5–9 miles |
|---|---|---|
| **One-way** | **$15** | **$20** |
| **Round trip** | **$24** — save $6 vs. $30 | **$34** — save $6 vs. $40 |
| **Weekly, one-way only** (5 days) | **$63/week** | **$84/week** |
| **Weekly, round trip** (5 days) | **$99/week** | **$140/week** |
| **Monthly, 1 route/day** | **$259/month** | **$345/month** |
| **Monthly, 2 routes/day** | **$409/month** | **$580/month** |
| **2nd child, same schedule** | **+$205/month** | **+$290/month** |
| **3rd+ child, same schedule** | **+$143/month each** | **+$205/month each** |

| Ancillary | Price |
|---|---|
| Wait time | First 5 minutes free, then $1/minute |
| Beyond 9 miles one-way | 5–9 mile tier price + $1.20/mile for each mile past mile 9 |

No weekend/after-hours surcharge and no additional-stop fee — kept simple.

## Why two tiers, not one flat price
A single flat price across a wide radius either overcharges the (much more common) short local trips or undercharges the rare longer ones — see the cost-basis math in `14-pricing-and-business-model.md`. Splitting into a 0–5 mile tier and a 5–9 mile tier lets each band price close to its own true cost, so short trips get a genuinely lower price instead of subsidizing longer ones within the same band. Every competitor in the region still hides its pricing entirely (see `13-market-competitive-research.md`) — publishing two simple, honest numbers is still a clear differentiator over "call for a quote."

**Margin at each tier's worst-case distance:**
- 0–5 mile tier: true cost at 5 miles ≈ $11.60 → $15 price leaves ≈ $3.40/trip margin
- 5–9 mile tier: true cost at 9 miles ≈ $15.47 → $20 price leaves ≈ $4.53/trip margin

Both tiers stay profitable across their full range — see `14-pricing-and-business-model.md` for the complete cost table.

## What the calculator shows
The booking flow (`04-website-booking-system.md`) calls the mapping API to get the actual distance, picks the correct tier (0–5 or 5–9 miles), applies the per-mile overage if the trip exceeds 9 miles, and always shows the full price breakdown — tier, any overage line, any multi-child total — before payment. No "call for final price" step.

## Origin point for the mile measurements
Both tier boundaries (5 miles and 9 miles) are measured from a fixed dispatch origin (where the vehicle is based), not from a generic city centroid. That origin address is intentionally **not published anywhere** — not on the site, not in this repo — since it's the owner's private address. It's stored as a server-side environment variable (`DISPATCH_ORIGIN_ADDRESS`, see `.env.example`) and used only inside the backend distance calculation; the customer-facing page only ever shows the resulting price, never the origin it was measured from.

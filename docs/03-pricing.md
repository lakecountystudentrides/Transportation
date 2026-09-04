# Pricing — Locked

**This is the final, locked pricing for Lake County Student Rides.** One flat price per category, the same anywhere in the service area — see `14-pricing-and-business-model.md` for the full cost-basis and profitability math behind these numbers, and `15-service-area-and-seo-strategy.md` for the phased service-area rollout these prices apply within.

## Rate card

| Category | Price |
|---|---|
| **One-way** (up to 10 miles) | **$20** |
| **Round trip** | **$34** — save $6 vs. two one-ways ($40) |
| **Weekly, one-way only** (5 days, one direction) | **$84/week** — vs. $100 buying individually, save $16 (16%) |
| **Weekly, round trip** (5 days) | **$140/week** — vs. $170 individually, save $30 (18%) |
| **Monthly, 1 route/day** (one-way only, ~21.7 school days) | **$345/month** |
| **Monthly, 2 routes/day** (round trip) | **$580/month**, 1 child |
| **2nd child, same schedule** | **+$290/month** (combined $870/mo for 2 kids, ~$435/child) |
| **3rd+ child, same schedule** | **+$205/month each** (3 kids = $1,075/mo, ~$358/child) |
| **Wait time** | First 5 minutes free, then $1/minute |
| **Beyond 10 miles one-way** | Flat rate + $1.20/mile for each mile past mile 10 |

No weekend/after-hours surcharge and no additional-stop fee — kept simple, matching the "one flat price" promise.

## Why flat, not distance-tiered
Every identifiable competitor in the region hides its pricing entirely (see `13-market-competitive-research.md`) — publishing one simple, honest number per category is itself a real differentiator. The 10-mile line and per-mile overage past it exist only so the flat price stays honest on the rare long trip; it does not apply to the vast majority of real bookings, which fall well inside that radius within the launch service-area cluster.

**Margin at $20 one-way, 10-mile band:** true cost for the longest trip still covered (10 miles) runs about $16.31, leaving real margin (~$3/trip after payment processing) at every distance in the band — tightening the radius from 15 to 10 miles removed the near-breakeven edge case that existed at the wider radius. See `14-pricing-and-business-model.md` for the full math.

## What the calculator shows
Even with flat pricing, the booking flow (`04-website-booking-system.md`) still checks distance via the mapping API — not to vary the price, but to (a) confirm the trip is within the 10-mile flat-rate radius or apply the per-mile overage if not, and (b) confirm the address falls inside the current service area at all. The parent always sees the price before paying, per the original design goal — flat pricing makes this step simpler, not obsolete.

## Origin point for the 10-mile measurement
The "10 miles" in the rate card is measured from a fixed dispatch origin (where the vehicle is based), not from a generic city centroid. That origin address is intentionally **not published anywhere** — not on the site, not in this repo — since it's the owner's private address. It's stored as a server-side environment variable (`DISPATCH_ORIGIN_ADDRESS`, see `.env.example`) and used only inside the backend distance calculation once the booking system is built; the customer-facing page only ever shows the resulting price, never the origin it was measured from.

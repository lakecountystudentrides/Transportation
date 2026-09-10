# Transportation

Business plan, launch documentation, and website for **Lake County Student Rides** (`lakecountystudentrides.com`) — a private child transportation business in Lake County, Florida.

Live site: [`index.html`](index.html) (homepage), [`book.html`](book.html) (booking + instant pricing), [`driver.html`](driver.html) (driver dashboard — Start Trip/Arrived), [`manage-drivers.html`](manage-drivers.html) (owner-only, username+password login, not linked from anywhere on the site — add/deactivate individual driver access codes), [`parent-portal.html`](parent-portal.html) (parent login — trip history and amounts paid), and [`assets/`](assets/) (styles/scripts), deployed via Cloudflare Pages. Backend logic lives in [`functions/api/`](functions/api/) as Cloudflare Pages Functions:
- `price.js` — calculates the two-tier quote
- `checkout.js` — creates the Stripe Checkout Session, carrying booking details as metadata; offers both card and bank transfer (ACH) as payment methods. A monthly plan only becomes a real Stripe Subscription (auto-billed every month) if the parent checks the "Set up automatic monthly payments" box on the booking form; otherwise it's a one-time payment for that month, same as any other category
- `webhook.js` — on a completed checkout, saves a trip record to Cloudflare KV (`TRIPS_KV` binding) right away so the ride can be dispatched without waiting on a bank transfer to clear; also keeps each monthly plan's next billing date in sync on every renewal (`invoice.paid` / `invoice.payment_failed`)
- `cancel-subscription.js` — cancels a parent's monthly plan at the end of the already-paid period (never mid-period)
- `trips.js` / `trip-status.js` — power the driver dashboard. A round trip has two independently-tracked legs (drop-off to school, pickup from school); weekly/monthly plans reset both legs every school day (keyed by today's date, not the original booking date) so the buttons don't stay stuck on "Completed" after day one. Each Start/Arrived press emails the parent via Resend (`functions/_lib/email.js`). Accepts either the owner's master code or an individual driver's code (`functions/_lib/driverAuth.js`)
- `drivers.js` / `driver-deactivate.js` — add, list, and deactivate individual driver access codes; owner-only (`manage-drivers.html`, gated by a real username/password login, `functions/api/owner-login.js` / `functions/_lib/ownerSession.js` — separate from `DRIVER_ACCESS_TOKEN` and from an individual driver's code)
- `parent-signup.js` / `parent-login.js` / `parent-logout.js` / `parent-trips.js` — parent accounts (email + password, hashed and stored in `TRIPS_KV`) and a signed session cookie (`functions/_lib/session.js`, `functions/_lib/password.js`); trips are matched to an account by the email used at checkout
- `parent-forgot-password.js` / `parent-reset-password.js` — emails a time-limited reset link via Resend (`functions/_lib/resetToken.js`); see [`reset-password.html`](reset-password.html)
- `pay-past-due.js` — pays off a parent's past-due balance (from a failed bank transfer or failed monthly renewal, tracked in `functions/_lib/pastDue.js`); `checkout.js` blocks new bookings for that email until it's cleared

All of this requires environment variables and a KV binding set in Cloudflare (see `.env.example` and `docs/12-deployment-checklist.md`) before it works end to end.

Parents book and pay online for safe, background-checked transportation for their children to and from school, daycare, after-school programs, sports, camps, and tutoring — with a driver dashboard for trip management and pickup/drop-off email notifications.

## Documents

1. [`docs/01-legal-compliance.md`](docs/01-legal-compliance.md) — Florida & Lake County legal/regulatory research: vehicle classification, driver screening, insurance, licensing, CDL, and open items to verify directly with the relevant agency before launch.
2. [`docs/02-branding-names.md`](docs/02-branding-names.md) — 30 business name ideas, top 10 developed with tagline/logo/domain concepts.
3. [`docs/03-pricing.md`](docs/03-pricing.md) — Pricing formula, worked examples, and published rate recommendations.
4. [`docs/04-website-booking-system.md`](docs/04-website-booking-system.md) — Site structure, 8-step booking flow, recurring scheduling, Start Trip lifecycle, GPS/tracking privacy design, pickup/dropoff verification, driver and parent dashboards.
5. [`docs/05-website-technology.md`](docs/05-website-technology.md) — Platform comparison (Wix/Squarespace/WordPress/Shopify/no-code/custom) and phased build recommendation.
6. [`docs/06-safety-system.md`](docs/06-safety-system.md) — Full safety system, marked required vs. recommended.
7. [`docs/07-business-plan.md`](docs/07-business-plan.md) — Executive summary, business model, target customers, competitive advantage, financial overview.
8. [`docs/08-startup-budget.md`](docs/08-startup-budget.md) — Low-cost / moderate / professional startup budgets for one vehicle.
9. [`docs/09-marketing-plan.md`](docs/09-marketing-plan.md) — Channel strategy and first-25/50/100/250-customer plans.
10. [`docs/10-growth-plan.md`](docs/10-growth-plan.md) — Scaling from 1 to 10+ vehicles, employee vs. contractor guidance.
11. [`docs/11-launch-checklist.md`](docs/11-launch-checklist.md) — Final recommendations and a day-by-day 30-day launch checklist.
12. [`docs/12-deployment-checklist.md`](docs/12-deployment-checklist.md) — Cloudflare Pages + Stripe go-live setup, step by step.
13. [`docs/13-market-competitive-research.md`](docs/13-market-competitive-research.md) — Evidence-based Lake County market sizing and competitor research (key finding: no confirmed direct in-county competitor).
14. [`docs/14-pricing-and-business-model.md`](docs/14-pricing-and-business-model.md) — Full distance-tier pricing matrix, subscription math, unit economics, and route profitability model.
15. [`docs/15-service-area-and-seo-strategy.md`](docs/15-service-area-and-seo-strategy.md) — Phased service-area rollout, site architecture, keyword map, Google Business Profile and local authority strategy.
16. [`docs/16-conversion-trust-and-systems.md`](docs/16-conversion-trust-and-systems.md) — Feature prioritization, trust claims (real vs. placeholder), booking/admin/automation systems, conversion and mobile strategy.
17. [`docs/17-growth-plan-and-kpis.md`](docs/17-growth-plan-and-kpis.md) — KPIs to track, 90-day and 12-month growth plan, before-launch compliance gate.

**Start with `docs/01-legal-compliance.md`** — several licensing questions (notably whether Lake County requires a vehicle-for-hire permit beyond a standard Business Tax Receipt) are flagged as unresolved and need a direct call to the relevant office before you accept a paying customer.

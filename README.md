# Transportation

Business plan, launch documentation, and website for **Lake County Student Rides** (`lakecountystudentrides.com`) — a private child transportation business in Lake County, Florida.

Live site: [`index.html`](index.html) (homepage) + [`book.html`](book.html) (booking + instant pricing) + [`assets/`](assets/) (styles/scripts), deployed via Cloudflare Pages. Backend logic lives in [`functions/api/`](functions/api/) as Cloudflare Pages Functions — `price.js` calculates the quote, `checkout.js` creates the Stripe Checkout Session. Both require environment variables to be set in Cloudflare (see `.env.example` and `docs/12-deployment-checklist.md`) before they'll work.

Parents book and pay online for safe, background-checked transportation for their children to and from school, daycare, after-school programs, sports, camps, and tutoring — with a driver dashboard for trip management and a parent dashboard for live trip status.

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

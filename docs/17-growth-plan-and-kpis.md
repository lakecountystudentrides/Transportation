# Analytics/KPIs, 90-Day Plan, 12-Month Plan, and Compliance Checklist

## Analytics & KPI strategy
Track from day one (Cloudflare Web Analytics for site traffic — privacy-friendly and free since you're already on Cloudflare Pages; Stripe dashboard for revenue; a simple spreadsheet or the admin dashboard in `16-conversion-trust-and-systems.md` for everything else):

| KPI | Why it matters |
|---|---|
| Site visitors by source (organic/GBP/social/referral) | Tells you which of the SEO/marketing efforts in `15-service-area-and-seo-strategy.md` and `09-marketing-plan.md` are actually working |
| Visitor → inquiry/booking conversion rate | The real test of the conversion strategy in `16-conversion-trust-and-systems.md` — if traffic is healthy but conversion is low, the pricing/trust copy needs work before more traffic spend makes sense |
| Inquiries by city | Directly informs the Phase A→B→C service-area expansion decision in `15-service-area-and-seo-strategy.md` — real demand signal, better than population data alone |
| One-off vs. recurring booking mix | The business model in `14-pricing-and-business-model.md` depends on recurring revenue — track whether one-off customers convert to recurring within their first month, and if not, ask why |
| Vehicle utilization (booked hours/day vs. available hours/day) | The real capacity constraint per the unit economics in `14-pricing-and-business-model.md` — this number, not marketing reach, tells you when it's time for vehicle #2 |
| Customer retention (months active before cancellation) | Feeds the LTV assumption in `14-pricing-and-business-model.md` — revisit that estimate once you have 3+ months of real data |
| GBP profile views → website clicks → bookings | Confirms whether the Google Business Profile strategy in `15-service-area-and-seo-strategy.md` is converting, not just accumulating views |
| Review count and average rating | Direct prominence signal per Google's own stated ranking factors |

## 90-day plan
**Days 1–30:** Execute `11-launch-checklist.md` (legal, insurance, credentials, vehicle prep) in parallel with finishing the real website build (pricing calculator, booking flow, Stripe integration per `12-deployment-checklist.md`). Launch in the single Phase A city cluster only. Goal: first 5–10 paying families, all in the launch cluster.

**Days 31–60:** Run the marketing plan in `09-marketing-plan.md` at full intensity for the launch cluster specifically (not county-wide). Start tracking the KPI table above weekly. Goal: 15–25 recurring families, vehicle utilization climbing toward a real daily schedule (not just isolated morning/afternoon runs).

**Days 61–90:** Reassess service-area expansion using real inquiry-by-city data (not the population estimates alone) — if inquiries from outside the launch cluster are frequent, that's your evidence to plan vehicle #2 sooner than population data alone would suggest. Reassess pricing using 60+ days of real cost data (actual fuel/maintenance/insurance spend vs. the estimates in `14-pricing-and-business-model.md`). Goal: 25–40 recurring families, first real profit month after owner-draw.

## 12-month plan
- **Months 4–6:** Hit the vehicle #2 trigger from `10-growth-plan.md` (consistent waitlist or a fully booked single-vehicle schedule). Hire driver #1 as a W-2 employee, not a misclassified contractor (per the legal reasoning in `10-growth-plan.md`). Expand to Phase B service area.
- **Months 7–9:** With 2 vehicles running, revisit the admin/automation build — this is the point where a spreadsheet-based admin process starts to strain, and the dedicated lightweight admin dashboard in `16-conversion-trust-and-systems.md` earns its build cost. Begin the local-authority work in `15-service-area-and-seo-strategy.md` in earnest (Chamber membership, first sponsorships) now that there's a track record to point to.
- **Months 10–12:** Reassess whether a school-district or daycare-chain B2G/B2B contract (per `01-legal-compliance.md`'s F.S. 1012.465 vendor-screening note) is worth pursuing — this is a materially different sales motion and compliance bar than direct-to-parent, only take it on once the core direct-to-parent business is healthy and reviewed well. Consider a third vehicle if utilization and demand data support it, expanding toward Phase C service area.
- **12-month milestone target:** 2–3 vehicles, 60–100+ recurring families, first hired driver fully ramped, Lake County Student Rides ranking on page 1 for the Tier 1 keyword set in `15-service-area-and-seo-strategy.md`, real (non-estimated) unit economics replacing every estimate in `14-pricing-and-business-model.md`.

## Before-launch compliance checklist
This doesn't replace `01-legal-compliance.md` — it's the short-form gate before you flip the site's "book now" button live for real payments:
- [ ] Lake County BTR filed (and city BTR if applicable) — `01-legal-compliance.md` §18–19
- [ ] **Vehicle-for-hire permit question answered by Lake County directly, in writing** — `01-legal-compliance.md` §18–22, still the single biggest open compliance item
- [ ] Commercial auto insurance bound (not just quoted) with Sexual Abuse & Molestation coverage confirmed by name on the policy — `01-legal-compliance.md` §14–17
- [ ] General liability insurance bound
- [ ] Background check completed and on file for every driver (starting with yourself)
- [ ] CPR/First Aid certification completed and on file
- [ ] Car seats/boosters purchased and installed
- [ ] Parent Service Agreement + per-child authorization form drafted (attorney-reviewed recommended, per `01-legal-compliance.md`'s "who to call" list)
- [ ] Every trust claim on the website matches a real, completed fact (per the table in `16-conversion-trust-and-systems.md`) — no "background-checked" language live before the check is actually done
- [ ] Stripe live mode activated and tested end-to-end with a real small transaction (per `12-deployment-checklist.md`)

**Anything on this list you can't check off yet is a reason to keep the site's booking button pointed at "request early access" (as it currently is) rather than live payments** — this is exactly why the current homepage says "booking launching soon" instead of taking real money yet.

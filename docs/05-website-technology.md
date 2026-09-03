# Website Technology Recommendation

## What you actually need
Customer-facing marketing site + booking flow + payment + driver dashboard + parent dashboard + trip-status tracking. That's four distinct pieces of software wearing one brand. You do **not** need to build all four custom, and you should not spend tens of thousands of dollars before you have a paying customer base to prove the model.

## Comparison

| Platform | Booking system | Payments | Driver/parent dashboards | Cost to start | Verdict |
|---|---|---|---|---|---|
| **Wix** | Built-in "Bookings" app handles appointment-style scheduling decently but wasn't built for multi-child, multi-address, recurring transportation logic — you'd fight the tool | Wix Payments / Stripe integration | No real dashboard concept beyond basic bookings list | ~$20–$35/mo | Good for the marketing site only, not the booking engine |
| **Squarespace** | Similar limits to Wix — Acuity Scheduling integration is closer but still appointment-shaped, not route/child-shaped | Stripe/Square integration | Same limitation | ~$25–$40/mo | Same verdict as Wix |
| **WordPress + plugins** | Can be forced into shape with booking plugins (Amelia, Bookly) + custom fields, but you're now managing a plugin stack and its security patching | Woo/Stripe plugins | Possible via plugins/custom dev, gets messy fast | ~$15–$50/mo hosting + plugin licenses ($100–$300/yr) | More flexible than Wix/Square, more maintenance burden; middle ground |
| **Shopify** | Built for physical-goods checkout, not scheduled child-transport bookings — wrong tool | Shopify Payments/Stripe | No | ~$30+/mo | Not a fit, skip |
| **No-code app/booking platform** (e.g., a form-and-workflow builder like Jotform/Bubble, or a purpose-built booking tool like SimplyBook.me / Setmore adapted, or a low-code app builder like Glide/Softr on top of Airtable) | Can be configured to closely match your 8-step flow, multi-child, recurring schedules, and driver/parent portals with moderate setup effort | Stripe integration is standard | Yes — Bubble/Softr-class tools can build real role-based dashboards (driver view vs. parent view) without hand-coding | $0–$100/mo depending on tool/tier | **Best fit for launch** — closest match to your actual requirements without custom development cost |
| **Custom website/app (hand-coded or agency-built)** | Exactly matches your spec, full control | Stripe API direct integration | Fully custom driver/parent dashboards, live tracking, everything | $8,000–$40,000+ upfront, plus ongoing dev cost | Right answer once you've proven demand and revenue supports it — wrong answer for month 1 |

## Recommendation: two-phase approach

**Phase 1 (launch, 1 vehicle, months 1–6):**
- **Marketing/informational site:** WordPress or Wix — whichever you personally find faster to self-edit. WordPress if you want more SEO control long-term (better for "ranks locally," see Marketing doc); Wix if you want zero technical overhead.
- **Booking + payment + dashboards:** build this on a **no-code app platform** (Bubble, Softr+Airtable, or Glide) wired to **Stripe** for payment and a simple database (Airtable or the platform's built-in DB) as your "backend." This gets you a real booking form → price calculation → payment → confirmation → driver dashboard → parent dashboard flow live in weeks, not months, for a few hundred dollars total setup plus a monthly platform fee typically under $100/month at low volume.
- Embed the no-code booking app on your marketing site via iframe/link so the customer experience feels like one product even though it's two systems underneath.

**Phase 2 (once you're running 3+ vehicles / recurring revenue justifies it):**
- Commission a custom web app (or hire a freelance/agency developer) that replaces the no-code layer with a purpose-built system — real-time GPS tracking, push notifications, a proper driver mobile app, and a data model that scales past what a no-code tool comfortably handles. Budget realistically **$15,000–$40,000** for a solid first version at that stage, funded by the revenue Phase 1 proved out — not from savings before you have a single customer.

**Why not jump straight to custom:** you don't yet know your real booking patterns, what parents actually ask for at Step 6, or which recurring-schedule edge cases matter — building custom software against guesses is the single most common way small transportation startups burn their runway before their first paying month. Prove it cheap first.

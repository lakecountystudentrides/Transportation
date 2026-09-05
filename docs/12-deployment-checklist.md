# Deployment Setup Checklist — Cloudflare + Stripe

Working through this one step at a time, verifying each before moving on. Nothing here is a secret value — real keys live only in `.env` (git-ignored) or in the hosting platform's environment-variable dashboard, never in this repo.

**Architecture decision:** Host on **Cloudflare Pages**, connected directly to this GitHub repo (auto-deploys on push to `main`). Server-side logic (Stripe Checkout session creation, webhook handling) runs as **Cloudflare Pages Functions** — plain JS/TS files in a `/functions` folder — so there's no separate backend server to stand up, and Stripe secret keys live only in Cloudflare's server-side environment variables, never shipped to the browser.

## Cloudflare
- [x] 1. Create Cloudflare Pages project, connected to this GitHub repo — live at https://transportation-6bx.pages.dev/
- [x] 2. Confirm DNS is fully cut over to Cloudflare nameservers (in progress from earlier setup) and email still works
- [x] 3. Point the custom domain at the Cloudflare Pages project — both root and www domains showing Active
- [ ] 4. Set environment variables in Cloudflare Pages (Production + Preview): `GOOGLE_MAPS_API_KEY`, `DISPATCH_ORIGIN_ADDRESS` (your private dispatch address — enter directly in the Cloudflare dashboard, never in this repo), `STRIPE_SECRET_KEY`, `SITE_URL`. See `.env.example` for the full list of names.
- [x] 5. Confirm a test deploy is live at the `*.pages.dev` URL before attaching the custom domain

## Stripe — test mode
- [ ] 6. Create Stripe account, confirm Test mode is active
- [ ] 7. Retrieve test Publishable key + Secret key
- [x] 8. **Design decision:** skipped fixed Stripe Products/Prices in favor of dynamically-priced Checkout Sessions (`price_data` created per booking) — necessary since the real price varies with distance-overage and number of children, so a fixed catalog price wouldn't match what `/api/price` calculates. `functions/api/checkout.js` builds the session amount from the server-computed quote each time.
- [x] 9. Checkout integration built: `functions/api/price.js` (quote calculation) + `functions/api/checkout.js` (Stripe Checkout Session creation) + `book.html`/`assets/booking.js` (front end) + `booking-success.html`. **Code-complete, not yet testable** — needs `GOOGLE_MAPS_API_KEY`, `DISPATCH_ORIGIN_ADDRESS`, and `STRIPE_SECRET_KEY` set in Cloudflare Pages first (item 4/7).
- [ ] 10. Set up Stripe webhook endpoint + retrieve webhook signing secret (test mode) — not yet needed for the current flow (Stripe's own success/cancel redirect handles the customer side); add this once a real booking database exists to record payment confirmations server-side (see `16-conversion-trust-and-systems.md` admin dashboard section)
- [ ] 11. End-to-end test: book a ride on the live-but-test site, pay with a Stripe test card, confirm the price calculation and Checkout redirect both work

## Going live
- [ ] 12. Activate Stripe live mode (business details, bank account — Stripe's own verification flow)
- [ ] 13. Enter live Stripe secret key + live webhook secret directly into Cloudflare Pages env vars (recommend: you do this step yourself, key never pasted into this chat)
- [ ] 14. Create live-mode products/prices (mirroring test-mode ones) — via Stripe Dashboard directly, or Claude runs the same script against live keys if you'd rather hand them over
- [ ] 15. Switch the front end's publishable key + Checkout calls from test to live
- [ ] 16. Final production test: one real small transaction end-to-end, then refund it
- [ ] 17. Go live — remove any "test mode" banner, announce launch

Update the boxes above as we complete each one.

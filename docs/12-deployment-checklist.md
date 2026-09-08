# Deployment Setup Checklist — Cloudflare + Stripe

Working through this one step at a time, verifying each before moving on. Nothing here is a secret value — real keys live only in `.env` (git-ignored) or in the hosting platform's environment-variable dashboard, never in this repo.

**Architecture decision:** Host on **Cloudflare Pages**, connected directly to this GitHub repo (auto-deploys on push to `main`). Server-side logic (Stripe Checkout session creation, webhook handling) runs as **Cloudflare Pages Functions** — plain JS/TS files in a `/functions` folder — so there's no separate backend server to stand up, and Stripe secret keys live only in Cloudflare's server-side environment variables, never shipped to the browser.

## Cloudflare
- [x] 1. Create Cloudflare Pages project, connected to this GitHub repo — live at https://transportation-6bx.pages.dev/
- [x] 2. Confirm DNS is fully cut over to Cloudflare nameservers (in progress from earlier setup) and email still works
- [x] 3. Point the custom domain at the Cloudflare Pages project — both root and www domains showing Active
- [x] 4. Set environment variables in Cloudflare Pages (Production + Preview): `GOOGLE_MAPS_API_KEY`, `DISPATCH_ORIGIN_ADDRESS` (your private dispatch address — enter directly in the Cloudflare dashboard, never in this repo), `STRIPE_SECRET_KEY`, `SITE_URL`, `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, `DRIVER_ACCESS_TOKEN` (pick a long random passphrase). See `.env.example` for the full list of names. Note: `SITE_URL` is intentionally left **unset** on Preview so Stripe redirects back to whichever preview URL you're actually testing on; it's set to the real domain only on Production.
- [x] 5. Confirm a test deploy is live at the `*.pages.dev` URL before attaching the custom domain
- [x] 5a. Create a Cloudflare KV namespace and bind it to the Pages project as `TRIPS_KV` (Pages project → Settings → Functions → KV namespace bindings). This is what stores each completed booking for the driver dashboard — see `functions/api/webhook.js`, `functions/api/trips.js`, `functions/api/trip-status.js`.
- [x] 5b. Create a Resend account (resend.com), verify the sending domain (`lakecountystudentrides.com`) by adding the DNS records Resend gives you — straightforward since DNS is already on Cloudflare. Get the API key and set it as `RESEND_API_KEY`.

## Stripe — test mode
- [x] 6. Create Stripe account, confirm Test mode is active
- [x] 7. Retrieve test Publishable key + Secret key
- [x] 8. **Design decision:** skipped fixed Stripe Products/Prices in favor of dynamically-priced Checkout Sessions (`price_data` created per booking) — necessary since the real price varies with distance-overage and number of children, so a fixed catalog price wouldn't match what `/api/price` calculates. `functions/api/checkout.js` builds the session amount from the server-computed quote each time.
- [x] 9. Checkout integration built: `functions/api/price.js` (quote calculation) + `functions/api/checkout.js` (Stripe Checkout Session creation) + `book.html`/`assets/booking.js` (front end) + `booking-success.html`. **Code-complete, not yet testable** — needs `GOOGLE_MAPS_API_KEY`, `DISPATCH_ORIGIN_ADDRESS`, and `STRIPE_SECRET_KEY` set in Cloudflare Pages first (item 4/7).
- [x] 10. Set up the Stripe webhook: Stripe Dashboard → Developers → Webhooks → Add endpoint → URL `https://<your-domain>/api/webhook`, event `checkout.session.completed`. Copy the signing secret it gives you into `STRIPE_WEBHOOK_SECRET` in Cloudflare Pages. This is what turns a completed payment into a trip record (`functions/api/webhook.js`) for the driver dashboard and pickup/drop-off notifications. Set up as **two separate Stripe webhook endpoints**: one pointing at the preview URL (for testing, with its own signing secret in the Preview environment variables) and one pointing at `https://lakecountystudentrides.com/api/webhook` (for after go-live, secret in Production).
- [x] 11. End-to-end test — **passed on the preview deployment**: booked a ride, price calculator returned a quote, Stripe Checkout redirect worked, paid with test card `4242 4242 4242 4242`, landed on `booking-success.html`, trip appeared at `/driver.html`, pressing Start Trip and Arrived both sent parent notification emails via Resend.

## Parent portal
- [ ] 11a. Set `PARENT_SESSION_SECRET` in Cloudflare Pages (Production + Preview) — a long random passphrase, different from `DRIVER_ACCESS_TOKEN`. Signs the login cookie for `/parent-portal.html`. See `functions/_lib/session.js`, `functions/api/parent-signup.js`, `functions/api/parent-login.js`, `functions/api/parent-trips.js`. No new KV namespace needed — parent accounts reuse the existing `TRIPS_KV` binding under a `parent:<email>` key.
- [ ] 11b. Test it: create a parent account at `/parent-portal.html` using the same email used at checkout, confirm past trips (with dates, route, status, and amount paid) show up, and confirm signing out and back in works.

## Going live
- [ ] 12. Activate Stripe live mode (business details, bank account — Stripe's own verification flow)
- [ ] 13. Enter live Stripe secret key + live webhook secret directly into Cloudflare Pages env vars (recommend: you do this step yourself, key never pasted into this chat)
- [ ] 14. Create live-mode products/prices (mirroring test-mode ones) — via Stripe Dashboard directly, or Claude runs the same script against live keys if you'd rather hand them over
- [ ] 15. Switch the front end's publishable key + Checkout calls from test to live
- [ ] 16. Final production test: one real small transaction end-to-end, then refund it
- [ ] 17. Go live — remove any "test mode" banner, announce launch

Update the boxes above as we complete each one.

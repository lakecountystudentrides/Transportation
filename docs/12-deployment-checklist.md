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
- [ ] 11c. Test "Forgot your password?" (`/reset-password.html`): request a reset link for that same account, confirm the email arrives via Resend, click the link, set a new password, and sign in with it. No new env vars needed — reuses `PARENT_SESSION_SECRET` and `RESEND_API_KEY`.

## Bank transfer (ACH) payments
Card fees are 2.9% + $0.30; bank transfer is 0.8% capped at $5 — worth it especially on the $259–$580/month plans. `functions/api/checkout.js` now offers both `card` and `us_bank_account` as payment methods.
- [ ] 11d. In the Stripe Dashboard, go to **Settings → Payment methods** and confirm/enable **ACH Direct Debit** (also called "US bank account" / "Bank transfer") for your account — Stripe may require basic bank-transfer eligibility verification first.
- [ ] 11e. On **both** Stripe webhook endpoints (preview and production, from step 10), add two more events beyond `checkout.session.completed`: **`checkout.session.async_payment_succeeded`** and **`checkout.session.async_payment_failed`**. Bank transfers settle a few business days later than cards, so `functions/api/webhook.js` only creates the trip record once one of these async events confirms the money actually cleared — a card payment is unaffected and still creates the trip immediately.
- [ ] 11f. Test it: book a ride, choose the bank transfer tab on the Stripe Checkout page (test mode has a fake instant-verification test bank for this — Stripe's checkout page walks you through it). The trip appears at `/driver.html` right away (so the ride can still be dispatched while the transfer clears), tagged **"Bank transfer pending"**. In test mode Stripe usually fast-forwards the clearing simulation, flipping it to paid almost immediately; in live mode this will show pending for a few real business days until `checkout.session.async_payment_succeeded` fires and updates it. To see a failed transfer, search Stripe's docs for "ACH Direct Debit test bank accounts" for the specific test account numbers that simulate a failed transfer, and confirm the trip flips to **"Bank transfer failed"** instead.

## Past-due balances (failed bank transfers)
When a bank transfer fails after a trip was already dispatched, the trip's amount is added to that parent's past-due balance (`functions/_lib/pastDue.js`, stored in the existing `TRIPS_KV`). `functions/api/checkout.js` blocks that email from booking any new trip until it's paid off, and the parent portal shows a "Pay Past Due Balance" button that pays it via a dedicated Stripe Checkout session (`functions/api/pay-past-due.js`) without creating a duplicate trip record.
- [ ] 11g. Test it: trigger a failed bank transfer (Stripe's test failure bank account, or manually send an `async_payment_failed` test event on the trip's session), confirm the parent portal shows the past-due banner, confirm a new booking attempt with that same email is blocked with the past-due message, then click "Pay Past Due Balance," complete it, and confirm the banner disappears and new bookings work again.

## Going live
- [ ] 12. Activate Stripe live mode (business details, bank account — Stripe's own verification flow)
- [ ] 13. Enter live Stripe secret key + live webhook secret directly into Cloudflare Pages env vars (recommend: you do this step yourself, key never pasted into this chat)
- [ ] 14. Create live-mode products/prices (mirroring test-mode ones) — via Stripe Dashboard directly, or Claude runs the same script against live keys if you'd rather hand them over
- [ ] 15. Switch the front end's publishable key + Checkout calls from test to live
- [ ] 16. Final production test: one real small transaction end-to-end, then refund it
- [ ] 17. Go live — remove any "test mode" banner, announce launch

Update the boxes above as we complete each one.

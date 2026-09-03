# Website, Booking System & Trip Tracking Design

## Site structure

**Homepage**
- Header: logo + "GuardianRide Lake" + nav (How It Works / Services / Pricing / Safety / FAQ / Contact / Parent Login)
- Hero: "Safe. Reliable. Convenient." + one-line value prop ("Trusted transportation for your child — to school, daycare, sports, and back home — booked online in minutes.") + large **BOOK A RIDE** button
- Service area map/list (Clermont, Leesburg, Eustis, Mount Dora, Tavares, Groveland, Minneola — list your actual coverage; don't imply county-wide coverage on day one if you can't deliver it)
- "How It Works" — 4 icons: Book Online → Confirm & Pay → Driver Picks Up Your Child → Get Live Updates
- Services grid: School / Daycare / After-School / Sports & Activities / Camps / Tutoring
- Pricing snapshot (link to full pricing page)
- Safety section: background-checked drivers, insured vehicle, car-seat equipped, live trip tracking, driver ID verification — each with a one-line explanation (pulls from the Safety System doc)
- FAQ accordion
- Footer: contact info, service area, business license info, social links, Parent Login, Privacy Policy, Terms of Service

**Primary CTA everywhere:** a persistent **BOOK A RIDE** button in the header/nav on every page, plus a sticky mobile bottom-bar version.

## Booking flow (8 steps)

**Step 1 — Parent Account / Info** (one-time, then reused)
Name, phone, email, home address, emergency contact (name/relationship/phone). Create password or magic-link login.

**Step 2 — Add Child**
First/last name, DOB (calculate age automatically — never ask age as a free-text field, derive it), school/daycare name + address (autocomplete against a list you maintain of local schools/daycares, with "other" free text), grade, emergency contact if different from parent, **authorized pickup/drop-off adults** (name + phone + relationship, at least one required, can add more), special transportation instructions (free text — e.g., "uses a booster seat," "nonverbal, responds to name Bug"), and an optional, clearly-labeled **medical information** field scoped narrowly: "Anything the driver needs to know for a safety emergency (allergies, seizure protocol, mobility needs)?" — do not ask for general medical history, diagnoses, or medication lists beyond what's transportation-safety-relevant. Children are saved to the account for reuse on future bookings.

**Step 3 — Pickup Location**
Map-based address picker (autocomplete + pin drop) defaulting to the child's saved home/school address for one-tap selection; free entry for anything else.

**Step 4 — Drop-off Location**
Same map component. Offer quick-select chips for "Home," "[Child]'s School," "[Child]'s Daycare" pulled from saved profile data so a repeat booking is 2 taps, not a re-typed address.

**Step 5 — Date & Time**
Calendar date picker, time picker, One-Way / Round Trip toggle, and a **"Make this recurring"** toggle that opens the weekly-schedule builder (see Recurring Transportation below).

**Step 6 — Transportation Details**
Number of children on this trip (multi-select from saved children, or "add another child" inline), confirm/select car seat or booster requirement per child (defaults from saved profile, editable), confirm which saved authorized adult will be present at pickup and who's authorized at drop-off, additional instructions free-text box.

**Step 7 — Price**
Call the mapping API with the chosen pickup/drop-off, run the pricing formula (see Pricing doc), and show an itemized breakdown before payment: base fare, distance, additional children, round-trip/recurring adjustments, surcharges, total. No surprise charges after this screen — if a driver incurs extra wait time later, that's billed transparently per the disclosed wait-time policy, never silently.

**Step 8 — Payment**
Card entry via the payment processor's hosted/embedded element (never build your own card form — see Payment Processor section). On success: **"PAYMENT CONFIRMED"** + booking confirmation screen and email/SMS with all trip details, driver info (once assigned), and a cancellation-policy reminder.

## Recurring transportation

Weekly schedule builder: a simple grid (Mon–Fri columns) where the parent taps time slots and assigns a route per slot, e.g.:
```
Mon–Fri   7:30 AM   Home → School
Mon–Fri   3:00 PM   School → Daycare
```
Each recurring rule generates individual trip records for the upcoming period (recommend generating 4 weeks ahead on a rolling basis) so drivers see them on the daily dashboard like any other trip, and so a single-day pause/cancel doesn't require touching the whole recurring rule. Parents can pause, skip a single occurrence (sick day, holiday), or cancel the whole recurring schedule from their dashboard, with the same cancellation-notice windows as one-off trips applied per occurrence.

Billing options for recurring: **charge weekly in advance** (recommended for cash flow and lower dispute risk) or **charge monthly in advance** — offer both, default to weekly.

## Payment processor recommendation

**Stripe** over Square for this business, specifically:
- Stripe's Billing/Subscriptions APIs handle recurring weekly/monthly charges with proration, retries, and dunning (failed-card recovery) far better out of the box than Square, which is more point-of-sale-oriented.
- Stripe Checkout / Payment Element gives you a PCI-compliant hosted card form you can drop into a custom booking flow or into most no-code platforms (see Website Tech doc) without ever touching raw card numbers yourself — critical given your data-security obligations under F.S. 501.171 (see Legal doc §30).
- Pricing is comparable either way (roughly 2.9% + $0.30 per online card transaction as of recent pricing for both Stripe and Square) — the deciding factor is Stripe's stronger recurring-billing and webhook ecosystem, which every no-code and custom-code booking platform integrates with more readily than Square's. **Verify current rates at stripe.com/pricing and squareup.com/pricing** before committing — processor pricing changes.
- Square becomes the better call only if you also want in-person card-swipe hardware (e.g., collecting a one-off cash-equivalent payment curbside) — unlikely to matter for an online-booking-first model.

## "START TRIP" — driver dashboard trip lifecycle

Trip states: **Scheduled → Driver En Route → Arrived at Pickup → Child Checked In → In Transit → Arrived at Drop-off → Child Checked Out → Completed** (collapse to whatever subset is practical for v1 — at minimum: Scheduled → Started → Completed — but design the data model for the fuller state list from day one so you're not rebuilding it later).

Driver presses **START TRIP** at pickup after child check-in (see Pickup/Dropoff Verification below). System records: driver ID, child ID, pickup location (GPS-captured, not just the planned address — confirms driver was actually there), drop-off location, timestamp, trip ID/status. Parent immediately receives push/SMS: **"Your child's trip has started."** Optional live map link if you implement GPS tracking (see below).

Driver presses **ARRIVED** at drop-off, then **COMPLETE TRIP** after drop-off verification. Parent receives: **"Your child has arrived safely at [destination]."** with timestamp. Receipt/trip summary auto-generates and is stored in the parent's trip history.

## GPS/location tracking — design with privacy and consent built in

There's no single Florida statute specifically regulating GPS tracking of minors by a private transportation service, but treat this as a privacy-sensitive feature and design conservatively:
- **Get explicit, written consent** in the Parent Service Agreement for (a) tracking the vehicle's location during an active trip and (b) sharing that location with the enrolled parent/guardian in real time. Disclose exactly what's tracked (vehicle GPS during active trips only — not continuous, not when off-duty) and who can see it (only that trip's parent, plus you as the operator/dispatcher).
- **Track the vehicle, not a wearable on the child.** Simpler, avoids a whole separate category of child-worn-device privacy concerns, and it's what parents actually want (a status/receipt point of trust, not surveillance).
- **Don't track outside active trips.** Location capture should start when a driver goes on-duty/starts a route and stop when the last trip of the day completes — not 24/7 vehicle tracking, and definitely not personal-phone location tracking of the driver off-shift.
- **Retention:** keep trip-location logs only as long as needed for dispute resolution/insurance (e.g., 90 days), not indefinitely, and say so in your privacy policy.
- **VERIFY** with your attorney once you finalize the feature — this is a design-conservative default, not a cleared legal opinion.

## Pickup/dropoff verification — which method to use

Options and tradeoffs:

| Method | Security | Ease of implementation | Parent friction |
|---|---|---|---|
| Parent PIN (4-digit, set at booking, driver enters in app to confirm handoff) | Medium | Low — simplest to build first | Low |
| QR code (unique per trip, generated in parent's confirmation email/app, driver scans) | High | Medium — needs camera/scan UI | Low-medium (must have phone/printout) |
| Authorized-adult photo-ID check at drop-off (driver manually confirms against saved authorized-adult list) | High | Low (process, not tech) | Low |
| Digital signature at drop-off (authorized adult signs on driver's device) | Medium | Medium | Medium |
| GPS + timestamp auto-logged on every check-in/out | N/A (supporting evidence, not primary auth) | Low if already building trip tracking | None |

**Recommendation for launch:** combine the **Parent PIN** (cheapest to build, works even with a basic phone, zero extra hardware) with **manual authorized-adult verification at drop-off when a non-parent adult is receiving the child** (driver checks the saved authorized-pickup list, confirms name/ID if the adult isn't already personally known to the driver) plus **automatic GPS+timestamp logging** on every check-in/check-out event as a background audit trail. Add QR codes later once you have volume/multiple drivers — they scale better than PINs across many simultaneous drivers but aren't worth the build cost for a one-vehicle launch.

**Never release a child to anyone not on that child's authorized-pickup list, no exceptions, no matter who calls or how urgent it sounds** — build this as a hard rule in driver training, not just a UI nicety.

## Driver dashboard

**Today's Trips** list, sorted by time, each card showing: time, child name(s), pickup address, drop-off address, parent contact (tap-to-call), emergency contact, special instructions (car seat type, authorized adults, medical notes), a **Navigate** button (deep-links to Google/Apple Maps), and the trip-state action button that changes label as the trip progresses: **Start Trip → Arrived → Complete Trip**. Completed trips move to a collapsed "Done Today" section; the whole day is logged for payroll/records.

## Parent dashboard

Upcoming rides (with countdown/status), completed ride history, current trip live status (when a trip is active), assigned driver info (name, photo, vehicle description — builds trust), payment history + downloadable receipts, saved children (edit/add), saved addresses, recurring ride schedules (pause/edit/cancel), emergency contacts, account settings, and one persistent **BOOK ANOTHER RIDE** button that pre-fills the last-used child/addresses to make repeat booking near-instant.

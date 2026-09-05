// POST /api/price
// Body: { pickupAddress: string, category: string, children?: number }
// category: "oneway" | "roundtrip" | "weekly-oneway" | "weekly-roundtrip" | "monthly-oneway" | "monthly-roundtrip"
//
// Distance is measured from the private dispatch origin (env.DISPATCH_ORIGIN_ADDRESS)
// to the pickup address — this defines the service radius, not the pickup-to-dropoff
// trip length. See docs/03-pricing.md.

const BASE_ONE_WAY = 20;
const BASE_ROUND_TRIP = 34;
const FLAT_RADIUS_MILES = 10;
const OVERAGE_PER_MILE = 1.2;
const SCHOOL_DAYS_PER_MONTH = 21.7;

// Derived so these exactly reproduce the locked rate card in docs/03-pricing.md
// when a trip is within the flat radius (overage = 0).
const WEEKLY_ONEWAY_FACTOR = 84 / (5 * BASE_ONE_WAY); // 0.84
const WEEKLY_ROUNDTRIP_FACTOR = 140 / (5 * BASE_ROUND_TRIP); // ~0.8235
const MONTHLY_ONEWAY_FACTOR = 345 / (SCHOOL_DAYS_PER_MONTH * BASE_ONE_WAY); // ~0.7949
const MONTHLY_ROUNDTRIP_FACTOR = 580 / (SCHOOL_DAYS_PER_MONTH * BASE_ROUND_TRIP); // ~0.7861

const SECOND_CHILD_MONTHLY = 290;
const THIRD_PLUS_CHILD_MONTHLY = 205;
const SECOND_CHILD_PCT = 0.5;
const THIRD_PLUS_CHILD_PCT = 0.35;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const { pickupAddress, category, children } = body || {};
  if (!pickupAddress || typeof pickupAddress !== "string") {
    return json({ error: "Please enter a pickup address." }, 400);
  }
  if (!["oneway", "roundtrip", "weekly-oneway", "weekly-roundtrip", "monthly-oneway", "monthly-roundtrip"].includes(category)) {
    return json({ error: "Please choose a valid service option." }, 400);
  }

  const origin = env.DISPATCH_ORIGIN_ADDRESS;
  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!origin || !apiKey) {
    return json({ error: "Pricing isn't fully configured yet — please contact us directly for a quote." }, 503);
  }

  let miles;
  try {
    const distance = await getDistanceMiles(origin, pickupAddress, apiKey);
    if (!distance.found) {
      return json({ error: "We couldn't find that address. Please check it and try again." }, 200);
    }
    miles = distance.miles;
  } catch {
    return json({ error: "Unable to calculate distance right now. Please try again shortly." }, 502);
  }

  const overageMiles = Math.max(0, miles - FLAT_RADIUS_MILES);
  const overageCharge = round2(overageMiles * OVERAGE_PER_MILE);

  const oneWayPrice = round2(BASE_ONE_WAY + overageCharge);
  const roundTripPrice = round2(BASE_ROUND_TRIP + overageCharge);

  let basePrice, label, isMonthly = false;
  switch (category) {
    case "oneway":
      basePrice = oneWayPrice; label = "One-way"; break;
    case "roundtrip":
      basePrice = roundTripPrice; label = "Round trip"; break;
    case "weekly-oneway":
      basePrice = round2(oneWayPrice * 5 * WEEKLY_ONEWAY_FACTOR); label = "Weekly (one-way only)"; break;
    case "weekly-roundtrip":
      basePrice = round2(roundTripPrice * 5 * WEEKLY_ROUNDTRIP_FACTOR); label = "Weekly (round trip)"; break;
    case "monthly-oneway":
      basePrice = round2(oneWayPrice * SCHOOL_DAYS_PER_MONTH * MONTHLY_ONEWAY_FACTOR); label = "Monthly (one route/day)"; isMonthly = true; break;
    case "monthly-roundtrip":
      basePrice = round2(roundTripPrice * SCHOOL_DAYS_PER_MONTH * MONTHLY_ROUNDTRIP_FACTOR); label = "Monthly (two routes/day)"; isMonthly = true; break;
  }

  const childCount = Math.max(1, Math.min(6, Number(children) || 1));
  const breakdown = [{ label, amount: basePrice }];
  if (overageCharge > 0) {
    breakdown.push({ label: `Beyond ${FLAT_RADIUS_MILES} mi (+${round1(overageMiles)} mi @ $${OVERAGE_PER_MILE}/mi)`, amount: overageCharge, note: true });
  }
  let childrenSurcharge = 0;
  for (let i = 2; i <= childCount; i++) {
    const add = isMonthly
      ? (i === 2 ? SECOND_CHILD_MONTHLY : THIRD_PLUS_CHILD_MONTHLY)
      : round2(basePrice * (i === 2 ? SECOND_CHILD_PCT : THIRD_PLUS_CHILD_PCT));
    childrenSurcharge += add;
    breakdown.push({ label: `Child ${i}`, amount: add });
  }

  const total = round2(basePrice + childrenSurcharge);

  return json({
    distanceMiles: round1(miles),
    withinFlatRadius: overageMiles === 0,
    breakdown,
    total,
    children: childCount,
  });
}

async function getDistanceMiles(origin, destination, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") throw new Error(`Distance Matrix error: ${data.status}`);
  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") return { found: false };
  return { found: true, miles: element.distance.value / 1609.344 };
}

function round2(n) { return Math.round(n * 100) / 100; }
function round1(n) { return Math.round(n * 10) / 10; }

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

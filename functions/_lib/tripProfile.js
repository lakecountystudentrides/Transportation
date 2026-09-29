// Enriches trip records (in place) with the booking parent's saved child
// photo, emergency contacts, and authorized pickup/drop-off adults --
// see functions/api/parent-profile.js for where a parent sets these.
// Used by both functions/api/trips.js (driver dashboard) and
// functions/api/owner-trips.js (owner's Today's Roster).

export async function attachParentProfiles(env, trips) {
  const emails = [...new Set(trips.map((t) => (t.parentEmail || "").toLowerCase()).filter(Boolean))];
  const profiles = new Map();

  for (const email of emails) {
    const raw = await env.TRIPS_KV.get(`parent:${email}`);
    profiles.set(email, raw ? JSON.parse(raw) : null);
  }

  for (const trip of trips) {
    const profile = profiles.get((trip.parentEmail || "").toLowerCase());
    if (!profile) continue;

    const children = profile.children || [];
    const match = children.find(
      (c) => (c.name || "").trim().toLowerCase() === (trip.childName || "").trim().toLowerCase()
    );
    trip.childPhoto = match?.photo || "";
    trip.emergencyContacts = profile.emergencyContacts || [];
    trip.authorizedPickups = profile.authorizedPickups || [];
  }
}

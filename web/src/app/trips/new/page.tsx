// Trip setup wizard (spec §4.1).
// TODO(Kate, #9): steps
//   1. Trip: name, dates, destination (geocode -> destination tz), bot name, currency
//   2. Members: name, phone (E.164 via libphonenumber-js), home tz, flight-tracking opt-in
//   3. Flights / hotel (optional)
//   4. Review -> save via Supabase (RLS) -> launchTrip() from src/lib/agent.ts -> join screen
export default function NewTripPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">New trip</h1>
      <p className="mt-2 text-sm text-gray-500">Setup wizard goes here (#9).</p>
    </main>
  );
}

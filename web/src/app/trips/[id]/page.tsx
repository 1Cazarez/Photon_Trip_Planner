// Live trip dashboard (spec §13).
// TODO(Kate, #24): day-by-day timeline in destination time, live via Supabase Realtime, with a
//   "show in my zone" toggle. Must work at phone width.
// TODO(Kate, #25): flights panel (status chips, last updated), who-lands-when strip,
//   balances + settle-up, read-only message log.
// TODO(Kate, #26): inline edits for events/reservations/flights/opt-ins, and a
//   "send summary now" demo button (sendSummaryNow in src/lib/agent.ts).
export default async function TripDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Trip dashboard</h1>
      <p className="mt-2 text-sm text-gray-500">Dashboard for trip {id} goes here (#24, #25, #26).</p>
    </main>
  );
}

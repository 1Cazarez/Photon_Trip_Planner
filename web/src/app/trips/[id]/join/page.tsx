// Join screen for DM hub mode. The bot can't text first on Spectrum's free tier, so each
// member starts the conversation by texting their join code.
// TODO(Kate, #10): show the bot's number, each member's join code, and a prefilled
//   sms:/iMessage link ("JOIN K7Q2") the organizer can forward. Show who has joined live
//   (Realtime on members).
export default async function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Invite your group</h1>
      <p className="mt-2 text-sm text-gray-500">Join codes for trip {id} go here (#10).</p>
    </main>
  );
}

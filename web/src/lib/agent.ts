import "server-only";

// Server-side calls to the Python agent on Render. AGENT_URL and AGENT_SHARED_SECRET are not
// NEXT_PUBLIC_, so never import this from a client component.
async function callAgent(path: string): Promise<Response> {
  return fetch(`${process.env.AGENT_URL}${path}`, {
    method: "POST",
    headers: { "x-agent-secret": process.env.AGENT_SHARED_SECRET ?? "" },
  });
}

// TODO(Kate, #9): call after the setup wizard saves the trip; J implements the endpoint (#12).
export const launchTrip = (tripId: string) => callAgent(`/trips/${tripId}/launch`);

// TODO(Kate, #26): "send summary now" demo button; J implements the endpoint (#20).
export const sendSummaryNow = (tripId: string) => callAgent(`/trips/${tripId}/summary`);

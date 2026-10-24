// Messaging contract between the bridge and the Python agent.
// Mirror of agent/app/messaging.py — keep the two in sync.
//
// TODO(Kate, #6): finalize these shapes with J and document them in docs/messaging-contract.md.

/** Body of POST {AGENT_URL}/inbound, sent by the bridge for every inbound message. */
export interface InboundMessage {
  /** Spectrum message id; the agent dedupes on this. */
  messageId: string;
  /** Sender handle (E.164 phone or Apple ID email). */
  sender: string;
  /** Spectrum conversation/space id. DM in hub mode; group id once #27 lands. */
  conversationId: string;
  kind: "dm" | "group";
  text: string;
  /** Signed Supabase Storage URLs for inbound images. TODO(Kate, #19). */
  attachmentUrls: string[];
  /** ISO 8601, UTC. */
  sentAt: string;
}

/** Body of POST /send on the bridge, called by the agent. */
export interface SendRequest {
  /** Existing conversation id, or a handle for a DM the member already started. */
  to: { conversationId: string } | { handle: string };
  text: string;
  imageUrl?: string;
}

/**
 * One implementation per transport. DM hub mode uses Spectrum (shared line);
 * group mode (#27, stretch) uses imessage-kit on a Mac.
 */
export interface MessagingAdapter {
  start(onMessage: (msg: InboundMessage) => Promise<void>): Promise<void>;
  send(req: SendRequest): Promise<{ messageId: string }>;
}

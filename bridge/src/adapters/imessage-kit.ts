import type { InboundMessage, MessagingAdapter, SendRequest } from "../contract.js";

// Group-chat adapter using open-source imessage-kit on a Mac with a dedicated bot Apple ID.
// Stretch goal for the demo; runs on the Mac, not on Render.
//
// TODO(Kate, #27): implement with imessage-kit, emitting kind: "group" messages to the
//   same agent /inbound endpoint.
export class IMessageKitAdapter implements MessagingAdapter {
  async start(_onMessage: (msg: InboundMessage) => Promise<void>): Promise<void> {
    throw new Error("IMessageKitAdapter.start not implemented (#27)");
  }

  async send(_req: SendRequest): Promise<{ messageId: string }> {
    throw new Error("IMessageKitAdapter.send not implemented (#27)");
  }
}

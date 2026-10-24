import type { InboundMessage, MessagingAdapter, SendRequest } from "../contract.js";

// DM hub adapter backed by Photon Spectrum (free-tier shared line).
//
// TODO(Kate, #5): spike — install the Spectrum SDK (exact package name from Photon's docs),
//   receive a DM, reply, and record: delivery model (webhook / long-lived / polling),
//   whether a Python SDK exists (if so this bridge may be unnecessary), number stability
//   per person, and whether images + sender handles come through.
// TODO(Kate, #8): implement start() and send() against Spectrum.
// TODO(Kate, #19): download inbound images, upload to Supabase Storage at
//   attachments/<trip_id>/..., and pass signed URLs in attachmentUrls.
export class SpectrumAdapter implements MessagingAdapter {
  async start(_onMessage: (msg: InboundMessage) => Promise<void>): Promise<void> {
    throw new Error("SpectrumAdapter.start not implemented (#8)");
  }

  async send(_req: SendRequest): Promise<{ messageId: string }> {
    throw new Error("SpectrumAdapter.send not implemented (#8)");
  }
}

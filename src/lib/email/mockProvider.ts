import type { EmailProvider, EmailMessage, EmailSendResult } from "./types";

/**
 * Dev/mock email provider: logs the message instead of sending it. Used
 * whenever no real provider is configured, so lead capture keeps working
 * without an EMAIL_API_KEY (AI/MASTER_SPEC.md §11).
 */
export const mockEmailProvider: EmailProvider = {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log("[mock email]", {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return { ok: true };
  },
};

import { env } from "@/lib/config/env";
import type { EmailProvider, EmailMessage, EmailSendResult } from "./types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const resendEmailProvider: EmailProvider = {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) {
      return { ok: false, error: "Resend is not configured" };
    }

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.EMAIL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });

      if (!response.ok) {
        return { ok: false, error: `Resend responded ${response.status}` };
      }
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Resend request failed",
      };
    }
  },
};

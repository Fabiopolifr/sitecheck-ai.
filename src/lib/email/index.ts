import { env } from "@/lib/config/env";
import { mockEmailProvider } from "./mockProvider";
import { resendEmailProvider } from "./resendProvider";
import type { EmailProvider } from "./types";

export type { EmailProvider, EmailMessage, EmailSendResult } from "./types";

export function getEmailProvider(): EmailProvider {
  const configured =
    env.EMAIL_PROVIDER === "resend" && env.EMAIL_API_KEY && env.EMAIL_FROM;

  return configured ? resendEmailProvider : mockEmailProvider;
}

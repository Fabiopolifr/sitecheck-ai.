export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailSendResult = { ok: true } | { ok: false; error: string };

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

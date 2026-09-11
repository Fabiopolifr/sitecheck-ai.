import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/config/env";
import { verifyWebhookSignature } from "@/lib/email/verifyWebhookSignature";
import { addOutreachSuppression } from "@/lib/db/outreachRepository";

export const runtime = "nodejs";

/**
 * Un indirizzo che rimbalza o che ci segnala come spam va soppresso
 * subito: continuare a scrivergli danneggia la reputazione del dominio
 * mittente, che è un asset dell'azienda (AI/DECISIONS.md D53).
 */
const SUPPRESSING_EVENTS: Record<string, string> = {
  "email.bounced": "bounce",
  "email.complained": "complaint",
};

const eventSchema = z.object({
  type: z.string(),
  data: z
    .object({
      to: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .optional(),
});

function recipientsOf(to: string | string[] | undefined): string[] {
  if (!to) return [];
  return (Array.isArray(to) ? to : [to]).filter((value) => value.includes("@"));
}

export async function POST(request: Request) {
  if (!env.RESEND_WEBHOOK_SECRET) {
    // Non configurato: si risponde 404 invece di rivelare che
    // l'endpoint esiste ma è inerte.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Il corpo va letto come testo grezzo: la firma è calcolata sui byte
  // esatti ricevuti, e un JSON.parse + re-serialize li cambierebbe.
  const payload = await request.text();

  const valid = verifyWebhookSignature({
    secret: env.RESEND_WEBHOOK_SECRET,
    payload,
    headers: {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
  });

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = eventSchema.safeParse(JSON.parse(payload));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const reason = SUPPRESSING_EVENTS[parsed.data.type];
  if (!reason) {
    // Evento legittimo ma non interessante (consegna, apertura…):
    // confermare la ricezione evita che Resend continui a riprovare.
    return NextResponse.json({ ignored: parsed.data.type });
  }

  const recipients = recipientsOf(parsed.data.data?.to);
  for (const email of recipients) {
    await addOutreachSuppression({ email, domain: null, reason });
  }

  return NextResponse.json({ suppressed: recipients.length, reason });
}

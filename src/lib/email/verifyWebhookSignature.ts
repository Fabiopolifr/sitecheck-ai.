import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifica la firma dei webhook di Resend, che usa lo schema Svix:
 * HMAC-SHA256 su `<id>.<timestamp>.<payload>` con la chiave contenuta
 * nel secret `whsec_<base64>`. Implementata a mano invece di aggiungere
 * il pacchetto `svix`: sono venti righe, e ogni dipendenza in più su un
 * endpoint pubblico è superficie d'attacco in più (AI/DECISIONS.md D53).
 *
 * Il webhook è pubblico: senza questa verifica chiunque potrebbe
 * inviarci finti "bounce" e far sopprimere indirizzi a piacere.
 */

/** Oltre questa finestra la firma è considerata scaduta (anti-replay). */
const MAX_AGE_SECONDS = 5 * 60;

export type SignatureHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

export function verifyWebhookSignature(params: {
  secret: string;
  payload: string;
  headers: SignatureHeaders;
  now?: number;
}): boolean {
  const { secret, payload, headers } = params;
  const now = params.now ?? Date.now();

  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  if (Math.abs(now / 1000 - sentAt) > MAX_AGE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  if (key.length === 0) return false;

  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest();

  // L'header può contenere più firme separate da spazio, ognuna nella
  // forma "v1,<base64>": basta che una combaci.
  return signature.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) return false;

    const candidate = Buffer.from(value, "base64");
    return (
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    );
  });
}

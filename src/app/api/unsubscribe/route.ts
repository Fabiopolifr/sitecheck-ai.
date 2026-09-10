import { NextResponse } from "next/server";
import { z } from "zod";
import { signUnsubscribeToken } from "@/features/outreach/composeEmail";
import { addOutreachSuppression } from "@/lib/db/outreachRepository";

export const runtime = "nodejs";

const requestSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, token } = parsed.data;
  if (token !== signUnsubscribeToken(email)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  await addOutreachSuppression({
    email,
    domain: null,
    reason: "Disiscrizione volontaria da email di outreach",
  });

  return NextResponse.json({ ok: true });
}

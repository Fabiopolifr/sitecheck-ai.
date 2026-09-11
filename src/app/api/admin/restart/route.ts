import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionToken,
} from "@/lib/security/adminAuth";

export const runtime = "nodejs";

/**
 * Phusion Passenger reloads the app when the mtime of `tmp/restart.txt`
 * inside the app root changes — that is the manual step documented in
 * DEPLOYMENT.md. The path is server configuration (an env var or the
 * process's own cwd), never anything a request can influence, so there
 * is no traversal surface here.
 *
 * On Hostinger the cwd of the *running* process is the versioned
 * directory of the build that started it, while Passenger watches the
 * path through the `current` symlink — which after an upload points at
 * the NEW build. That is why PASSENGER_RESTART_FILE should be set to the
 * `current` path explicitly; the cwd fallback is only a best effort.
 */
function restartFilePath(): string {
  return (
    env.PASSENGER_RESTART_FILE ?? path.join(process.cwd(), "tmp", "restart.txt")
  );
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);

  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = restartFilePath();

  try {
    await mkdir(path.dirname(target), { recursive: true });
    // Rewriting the file is what Passenger watches (mtime change); the
    // contents are irrelevant and deliberately empty.
    await writeFile(target, "");
  } catch (error) {
    console.error("Failed to write the Passenger restart file:", error);
    return NextResponse.json(
      {
        error: "Impossibile scrivere il file di riavvio",
        path: target,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, path: target });
}

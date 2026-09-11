import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const restartFile = vi.hoisted(() => ({ path: "" }));

vi.mock("@/lib/config/env", () => ({
  env: {
    get PASSENGER_RESTART_FILE() {
      return restartFile.path;
    },
    ADMIN_PASSWORD: "test-admin-password",
  },
}));

import { POST } from "@/app/api/admin/restart/route";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
} from "@/lib/security/adminAuth";

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "restart-test-"));
  // Deliberately inside a subdirectory that does not exist yet: the
  // route must create it, like the real tmp/ dir on a fresh deploy.
  restartFile.path = path.join(dir, "tmp", "restart.txt");
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

function request(cookie?: string) {
  return new Request("https://example.test/api/admin/restart", {
    method: "POST",
    headers: cookie ? { cookie } : {},
  });
}

describe("POST /api/admin/restart", () => {
  it("rejects a request with no admin session", async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
  });

  it("rejects a forged session token", async () => {
    const response = await POST(
      request(`${ADMIN_SESSION_COOKIE}=123456789.deadbeef`),
    );
    expect(response.status).toBe(401);
  });

  it("writes the restart file for a valid admin session", async () => {
    const token = createAdminSessionToken();
    const response = await POST(request(`${ADMIN_SESSION_COOKIE}=${token}`));

    expect(response.status).toBe(200);
    await expect(readFile(restartFile.path, "utf8")).resolves.toBe("");
  });

  it("reports the path it used, so a wrong path is diagnosable", async () => {
    const token = createAdminSessionToken();
    const response = await POST(request(`${ADMIN_SESSION_COOKIE}=${token}`));
    const body = await response.json();

    expect(body).toEqual({ ok: true, path: restartFile.path });
  });
});

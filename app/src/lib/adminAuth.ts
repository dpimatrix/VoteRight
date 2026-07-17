import { cookies } from "next/headers";

// Dev/staging gate only — a real deployment needs proper auth before Phase 2 goes
// public (flagged in docs/DEPLOY.md). Token via env; cookie set at /admin sign-in.
export function adminToken(): string {
  return process.env.ADMIN_TOKEN ?? "dev-admin";
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get("vr_admin")?.value === adminToken();
}

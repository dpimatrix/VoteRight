import { hasAdminAccess, createAdminAccount } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: Request) {
  if (!(await hasAdminAccess("admin_accounts"))) return new Response("forbidden", { status: 403 });
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  if (!username || !/^[a-zA-Z0-9_.-]{2,40}$/.test(username)) return new Response("bad username", { status: 400 });
  try {
    const { enrollmentUri } = await createAdminAccount(username);
    const secret = new URL(enrollmentUri).searchParams.get("secret") ?? "";
    return redirectTo(`/admin/admin-accounts?newUsername=${encodeURIComponent(username)}&newSecret=${encodeURIComponent(secret)}`, request);
  } catch {
    // Most likely a duplicate username (UNIQUE constraint) -- no dedicated
    // error UI for this yet, just avoid a raw 500 for a common mistake.
    return redirectTo("/admin/admin-accounts?error=username_taken", request);
  }
}

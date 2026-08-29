import { cookies } from "next/headers";
import { hasAdminAccess, createAdminAccount } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";

// Found live 2026-08-29: this TOTP enrollment secret used to travel as a URL
// query param through the redirect -- despite the page's own claim that it's
// "shown once; not stored anywhere retrievable," a URL query string
// routinely IS retrievable afterward: web-server/CDN access logs, browser
// history, and any outbound request's Referer header on that page all
// capture the full URL. A short-lived httpOnly cookie (same flags the real
// admin session cookie already uses, see login/route.ts) never appears in
// any of those -- the 60s maxAge bounds the exposure window even though it
// isn't a perfect single-view guarantee (a refresh within 60s would still
// show it), which is a large improvement over "lives in logs indefinitely"
// without needing route-handler-level cookie deletion on view.
// Not exported -- route.ts files only support HTTP-method + a small fixed
// set of config exports in this Next version (see app/AGENTS.md's "this is
// NOT the Next.js you know" -- read the versioned docs before assuming), so
// this literal is duplicated in admin/admin-accounts/page.tsx rather than
// imported. Keep both in sync if this ever changes.
const ENROLL_COOKIE = "vr_admin_enroll";

export async function POST(request: Request) {
  if (!(await hasAdminAccess("admin_accounts"))) return new Response("forbidden", { status: 403 });
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  if (!username || !/^[a-zA-Z0-9_.-]{2,40}$/.test(username)) return new Response("bad username", { status: 400 });
  try {
    const { enrollmentUri } = await createAdminAccount(username);
    const secret = new URL(enrollmentUri).searchParams.get("secret") ?? "";
    const store = await cookies();
    store.set(ENROLL_COOKIE, JSON.stringify({ username, secret }), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/admin/admin-accounts",
      maxAge: 60,
    });
    return redirectTo("/admin/admin-accounts", request);
  } catch {
    // Most likely a duplicate username (UNIQUE constraint) -- no dedicated
    // error UI for this yet, just avoid a raw 500 for a common mistake.
    return redirectTo("/admin/admin-accounts?error=username_taken", request);
  }
}

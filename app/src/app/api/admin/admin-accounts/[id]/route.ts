import { SCREEN_KEYS, currentAdmin, hasAdminAccess, setAdminDisabled, setScreenAccess } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess("admin_accounts"))) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "save_screens");

  if (action === "save_screens") {
    // Found live 2026-08-29: same self-lockout class the disable/enable
    // guard below already protects against, but reachable through this
    // form instead -- nothing stopped an admin from unchecking their OWN
    // admin_accounts box and saving, which (if they're the only admin who
    // currently holds it) permanently locks everyone out of ever
    // restoring it, since doing so itself requires admin_accounts access.
    // Simpler and safer to just never let this one screen be removed from
    // your own account via this form, rather than checking whether
    // another admin happens to hold it too right now (that could change
    // moments later).
    const me = await currentAdmin();
    for (const s of SCREEN_KEYS) {
      const granted = s === "admin_accounts" && me?.id === id ? true : form.has(`screen_${s}`);
      await setScreenAccess(id, s, granted);
    }
  } else if (action === "disable" || action === "enable") {
    const me = await currentAdmin();
    if (me?.id === id) return new Response("can't disable your own account", { status: 400 }); // avoid a self-lockout with no other admin able to re-enable it
    await setAdminDisabled(id, action === "disable");
  }
  return redirectTo("/admin/admin-accounts", request);
}

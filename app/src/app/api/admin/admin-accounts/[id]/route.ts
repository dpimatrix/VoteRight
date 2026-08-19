import { SCREEN_KEYS, currentAdmin, hasAdminAccess, setAdminDisabled, setScreenAccess } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess("admin_accounts"))) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "save_screens");

  if (action === "save_screens") {
    for (const s of SCREEN_KEYS) {
      await setScreenAccess(id, s, form.has(`screen_${s}`));
    }
  } else if (action === "disable" || action === "enable") {
    const me = await currentAdmin();
    if (me?.id === id) return new Response("can't disable your own account", { status: 400 }); // avoid a self-lockout with no other admin able to re-enable it
    await setAdminDisabled(id, action === "disable");
  }
  return redirectTo("/admin/admin-accounts", request);
}

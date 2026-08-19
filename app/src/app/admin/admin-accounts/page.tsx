import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { SCREEN_KEYS, SCREEN_LABEL, currentAdmin, hasAdminAccess, listAdminAccounts } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ newUsername?: string; newSecret?: string }>;
}) {
  if (!(await hasAdminAccess("admin_accounts"))) return <AdminAccessDenied screen="admin_accounts" />;
  const sp = await searchParams;
  const me = await currentAdmin();
  const accounts = await listAdminAccounts();

  return (
    <>
      <div className="pagetitle">Admin accounts</div>
      <p className="sub">
        Per-screen access (2026-08-19) — a new account starts with ZERO screens granted; check exactly what each
        admin should see below. Each admin enrolls their own authenticator app (TOTP), separate from every other
        admin's.
      </p>

      {sp.newSecret && (
        <div className="disclosure">
          <span className="tag">Save this now</span>
          <span>
            Enrollment for <strong>{sp.newUsername}</strong> — scan or manually enter this into their authenticator
            app. <strong>Shown once; it is not stored anywhere retrievable after this page reloads.</strong>
            <br />
            <code className="mono" style={{ wordBreak: "break-all", display: "block", marginTop: "0.4rem" }}>{sp.newSecret}</code>
          </span>
        </div>
      )}

      <div className="card">
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>New admin</h3>
        <form className="admform" method="post" action="/api/admin/admin-accounts">
          <input type="text" name="username" placeholder="Username" required style={{ flex: 1 }} />
          <button type="submit">Create</button>
        </form>
      </div>

      {accounts.map((a) => (
        <div className="card" key={a.id}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <strong style={{ flex: 1 }}>
              {a.username}
              {a.id === me?.id && <span className="cover"> (you)</span>}
            </strong>
            {a.disabled && <span className="chip band bm1">disabled</span>}
            <span className="cover">created {a.createdAt}</span>
          </div>
          <form method="post" action={`/api/admin/admin-accounts/${a.id}`} style={{ marginTop: "0.5rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 1rem", fontSize: "0.85rem" }}>
              {SCREEN_KEYS.map((s) => (
                <label key={s} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <input type="checkbox" name={`screen_${s}`} defaultChecked={a.screens.includes(s)} />
                  {SCREEN_LABEL[s]}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
              <button className="btn" type="submit" name="action" value="save_screens" style={{ flex: 1 }}>
                Save access
              </button>
              {a.id !== me?.id && (
                <button className="btn secondary" type="submit" name="action" value={a.disabled ? "enable" : "disable"}>
                  {a.disabled ? "Re-enable" : "Disable"}
                </button>
              )}
            </div>
          </form>
        </div>
      ))}
    </>
  );
}

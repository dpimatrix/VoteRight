import { cookies } from "next/headers";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { SCREEN_KEYS, SCREEN_LABEL, currentAdmin, hasAdminAccess, listAdminAccounts } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Must match the same literal in api/admin/admin-accounts/route.ts (not
// imported across the route.ts boundary -- see that file's own comment).
const ENROLL_COOKIE = "vr_admin_enroll";

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await hasAdminAccess("admin_accounts"))) return <AdminAccessDenied screen="admin_accounts" />;
  const me = await currentAdmin();
  const accounts = await listAdminAccounts();
  // Real gap found live 2026-08-31: the creation route already redirects
  // here with ?error=username_taken on a duplicate-username attempt (its
  // own comment even says so: "no dedicated error UI for this yet, just
  // avoid a raw 500") -- but this page never read searchParams at all, so
  // that redirect landed on the exact same page with zero visible
  // difference from a successful creation.
  const { error } = await searchParams;

  // Found live 2026-08-29: this used to read newUsername/newSecret straight
  // from the URL query string, which (despite the banner's own claim below)
  // is routinely retrievable afterward -- access logs, browser history, any
  // outbound Referer header on this page. Now sourced from a short-lived
  // (60s) httpOnly cookie the creation route sets instead of a redirect
  // param -- see that route's own comment for the full reasoning.
  let enroll: { username: string; secret: string } | null = null;
  try {
    const raw = (await cookies()).get(ENROLL_COOKIE)?.value;
    if (raw) enroll = JSON.parse(raw);
  } catch {
    enroll = null;
  }

  return (
    <>
      <div className="pagetitle">Admin accounts</div>
      <p className="sub">
        Per-screen access (2026-08-19) — a new account starts with ZERO screens granted; check exactly what each
        admin should see below. Each admin enrolls their own authenticator app (TOTP), separate from every other
        admin's.
      </p>

      {error === "username_taken" && (
        <p className="nopos" style={{ color: "var(--adv, #b00)" }}>That username is already taken — pick a different one.</p>
      )}
      {error === "invalid_email" && (
        <p className="nopos" style={{ color: "var(--adv, #b00)" }}>That doesn't look like a valid email address — screen access was still saved, but the email wasn't.</p>
      )}

      {enroll && (
        <div className="disclosure">
          <span className="tag">Save this now</span>
          <span>
            Enrollment for <strong>{enroll.username}</strong> — scan or manually enter this into their authenticator
            app. <strong>Not visible again after about a minute, and never stored anywhere retrievable.</strong>
            <br />
            <code className="mono" style={{ wordBreak: "break-all", display: "block", marginTop: "0.4rem" }}>{enroll.secret}</code>
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
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              Alert email
              <input
                type="email"
                name="email"
                defaultValue={a.email ?? ""}
                placeholder="not set -- no operational alerts sent"
                style={{ flex: 1, minWidth: "12rem" }}
              />
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 1rem", fontSize: "0.85rem" }}>
              {SCREEN_KEYS.map((s) => {
                // Same self-lockout guard the API route enforces server-side
                // (see that route's own comment) -- shown here too rather
                // than left to silently revert on save with no explanation,
                // same posture as every other silent-no-op gap fixed today.
                const lockedOn = s === "admin_accounts" && a.id === me?.id;
                return (
                  <label key={s} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }} title={lockedOn ? "Can't remove your own access to this screen -- no one else could restore it" : undefined}>
                    <input type="checkbox" name={`screen_${s}`} defaultChecked={a.screens.includes(s)} disabled={lockedOn} />
                    {SCREEN_LABEL[s]}
                    {lockedOn && " 🔒"}
                  </label>
                );
              })}
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

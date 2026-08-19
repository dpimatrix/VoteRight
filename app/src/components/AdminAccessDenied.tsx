import { SCREEN_LABEL, type ScreenKey } from "@/lib/adminAuth";

/** Shown instead of a blank page when a logged-in admin lacks access to
    THIS specific screen (2026-08-19 per-screen permissions) -- distinct
    from the layout's own login form, which only gates "is anyone logged
    in at all". A silent `return null` here would look like a broken page,
    not a permissions boundary, defeating the point of granular access. */
export function AdminAccessDenied({ screen }: { screen: ScreenKey }) {
  return (
    <div className="card">
      <div className="pagetitle" style={{ marginTop: 0 }}>Access restricted</div>
      <p className="nopos">
        Your admin account doesn't have access to {SCREEN_LABEL[screen]}. Ask an admin with access to{" "}
        <code>admin_accounts</code> to grant it.
      </p>
    </div>
  );
}

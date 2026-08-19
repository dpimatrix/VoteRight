import Link from "next/link";
import { isAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const ok = await isAdmin();
  return (
    <div className="pagepad">
      <div className="topbar" style={{ position: "static", margin: "0 -1rem" }}>
        <Link href="/admin" className="wordmark">
          VoteRight<small>Admin console</small>
        </Link>
        <span className="spacer" />
        {ok && (
          <form method="post" action="/api/admin/logout" style={{ display: "inline" }}>
            <button className="iconbtn" type="submit">Sign out</button>
          </form>
        )}
        <Link className="iconbtn" href="/">
          Exit
        </Link>
      </div>
      <div className="admbanner">
        <span>🔒</span>
        <span>
          Internal tool — trusted, trained operators. English-only by design (the voter
          product is bilingual). Every action lands in an append-only event log.
        </span>
      </div>
      {ok ? (
        children
      ) : (
        <div className="card">
          <div className="pagetitle" style={{ marginTop: 0 }}>Sign in</div>
          <form className="admform" method="post" action="/api/admin/login">
            <input
              type="text"
              name="username"
              autoComplete="username"
              placeholder="Username"
              aria-label="Username"
            />
            <input
              type="password"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Authenticator code"
              aria-label="Authenticator code"
            />
            <button type="submit">Enter</button>
          </form>
          <p className="nopos">
            Each admin has their own account and authenticator enrollment (2026-08-19 — see
            db/bootstrap-admin.mjs for the first one). Sessions last 12 hours. Local dev without a
            configured account falls back to the ADMIN_TOKEN value with an empty username field.
          </p>
        </div>
      )}
    </div>
  );
}

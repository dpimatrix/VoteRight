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
            <input type="password" name="token" placeholder="Admin token" aria-label="Admin token" />
            <button type="submit">Enter</button>
          </form>
          <p className="nopos">Dev gate only — token from ADMIN_TOKEN (default: dev-admin).</p>
        </div>
      )}
    </div>
  );
}

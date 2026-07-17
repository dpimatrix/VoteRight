import Link from "next/link";
import { isAdmin } from "@/lib/adminAuth";
import { adminFlags } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DisputesPage() {
  if (!(await isAdmin())) return null;
  const flags = await adminFlags();
  return (
    <>
      <div className="pagetitle">Integrity-flag dispute queue</div>
      <p className="sub">
        The §2.3 workflow: evidence before publication, right of reply before resolution,
        append-only history throughout. The publish gate is a database constraint, not
        this console&apos;s good behavior.
      </p>
      {flags.map((f) => (
        <Link key={f.id} className="seat" href={`/admin/disputes/${f.id}`}>
          <span className="seat-ic">{f.full_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>
          <span className="sname">
            {f.full_name}
            <span className="smeta">{f.description.slice(0, 90)}…</span>
          </span>
          {f.published ? (
            <span className="pill broken">✗ upheld · published</span>
          ) : f.status === "open" ? (
            <span className="pill pending">open</span>
          ) : (
            <span className="pill neutral">{f.status}</span>
          )}
        </Link>
      ))}
    </>
  );
}

import Link from "next/link";
import { isAdmin } from "@/lib/adminAuth";
import { adminCodingQueue, adminFlags } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!(await isAdmin())) return null;
  const flags = await adminFlags();
  const queue = await adminCodingQueue();
  const open = flags.filter((f) => f.status === "open").length;
  return (
    <>
      <div className="pagetitle">Queues</div>
      <Link className="seat" href="/admin/disputes">
        <span className="seat-ic">IF</span>
        <span className="sname">
          Integrity disputes
          <span className="smeta">{open} open · {flags.length} total</span>
        </span>
        <span className={`chip band ${open > 0 ? "bm1" : "b0"}`}>{open} open</span>
      </Link>
      <Link className="seat" href="/admin/coding">
        <span className="seat-ic">PC</span>
        <span className="sname">
          Position coding
          <span className="smeta">model suggestions awaiting human confirmation</span>
        </span>
        <span className={`chip band ${queue.length > 0 ? "b1" : "b0"}`}>{queue.length} pending</span>
      </Link>
    </>
  );
}

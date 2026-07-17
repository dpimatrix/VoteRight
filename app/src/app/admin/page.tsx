import Link from "next/link";
import { isAdmin } from "@/lib/adminAuth";
import { moderationQueue } from "@/lib/debates";
import { adminCodingQueue, adminFlags } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!(await isAdmin())) return null;
  const flags = await adminFlags();
  const queue = await adminCodingQueue();
  const mods = await moderationQueue();
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
      <Link className="seat" href="/admin/moderation">
        <span className="seat-ic">AM</span>
        <span className="sname">
          Argument moderation
          <span className="smeta">pre-publish review for debate arguments</span>
        </span>
        <span className={`chip band ${mods.length > 0 ? "bm1" : "b0"}`}>{mods.length} pending</span>
      </Link>
    </>
  );
}

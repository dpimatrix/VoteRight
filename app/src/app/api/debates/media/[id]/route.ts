import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { isAdmin } from "@/lib/adminAuth";
import { currentUserId } from "@/lib/anon";
import { db } from "@/lib/db";
import { contentTypeFor, mediaFilePath } from "@/lib/media";

export const runtime = "nodejs"; // fs streaming below needs the Node runtime, not edge

/* Serves debate audio/video bytes — deliberately NOT a static app/public/
   file (see media.ts's header comment for why). Re-checks moderation_status
   on every request, same visibility rule debateDetail() already applies to
   text arguments: approved is public, pending/removed is visible only to
   the post's own author or an authenticated moderator. Range-request aware
   (206 Partial Content) — Safari/iOS in particular won't reliably play
   <video> without it, and it's what lets scrubbing/seeking work at all. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await db().query(`SELECT format, moderation_status, user_id FROM arguments WHERE id = $1`, [id]);
  const arg = rows[0] as { format: string; moderation_status: string; user_id: string } | undefined;
  if (!arg || (arg.format !== "audio" && arg.format !== "video")) {
    return new Response("Not found", { status: 404 });
  }

  const [userId, admin] = await Promise.all([currentUserId(), isAdmin()]);
  if (arg.moderation_status !== "approved" && arg.user_id !== userId && !admin) {
    // 404, not 403 — don't confirm to a non-author that this id exists at all.
    return new Response("Not found", { status: 404 });
  }

  const format = arg.format as "audio" | "video";
  const filePath = mediaFilePath(id, format);
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const contentType = contentTypeFor(format);

  const range = request.headers.get("range");
  if (!range) {
    const body = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new Response(body, {
      headers: {
        "content-type": contentType,
        "content-length": String(size),
        "accept-ranges": "bytes",
        "cache-control": "private, max-age=3600",
      },
    });
  }

  const m = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!m || (!m[1] && !m[2])) {
    return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
  }
  const start = m[1] ? parseInt(m[1], 10) : size - parseInt(m[2], 10);
  const end = m[1] && m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start < 0 || end >= size) {
    return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
  }
  const body = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
  return new Response(body, {
    status: 206,
    headers: {
      "content-type": contentType,
      "content-range": `bytes ${start}-${end}/${size}`,
      "content-length": String(end - start + 1),
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=3600",
    },
  });
}

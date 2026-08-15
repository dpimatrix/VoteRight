import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

/* Debate argument media (audio/video uploads, ARCHITECTURE.md §9.1).

   Storage: plain files on local VPS disk (DEPLOY.md's self-hosted posture —
   the original "S3-compatible object store" plan is superseded), but
   deliberately NOT under app/public/ like politician photos. Photos are
   always-public government portraits; a debate argument can be `pending` or
   `removed` by a moderator, and debates.ts already hides pending/removed
   TEXT arguments from everyone but their own author. A file sitting in
   public/ would leak that same content forever via its raw URL regardless
   of what the UI shows, so media is served through the gated
   /api/debates/media/[id] route instead (re-checks moderation_status on
   every request) rather than Next's static file server. */

export const MAX_DURATION_SECONDS = 180; // 3-minute cap, both formats — owner's call, enforced here (authoritative) and client-side (soft, for fast feedback)

// Generous ceiling on the RAW upload before transcoding — not the stored
// size (ffmpeg's own resolution/bitrate caps below do that; a 3-minute clip
// transcoded per the settings below lands closer to 15–25MB). Exists only
// to stop an absurd upload from being buffered in memory at all. NOTE:
// Cloudflare's own proxy in front of this app caps request bodies before
// they ever reach it — 100MB on Free/Pro plans — confirm
// voteright.dpimatrix.com's zone plan and lower this (or raise the zone
// plan) if real uploads are getting cut off before this code ever runs. See
// docs/DEPLOY.md.
export const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;

export type MediaFormat = "audio" | "video";

export class MediaTooLongError extends Error {}
export class MediaTooLargeError extends Error {}
export class MediaInvalidError extends Error {}

function mediaDir(): string {
  // Under cwd (app/debate-media/), not a `..`-sibling of it, AND explicitly
  // turbopackIgnore'd -- confirmed live 2026-08-15: even a plain
  // path.join(process.cwd(), "debate-media") (no `..`) still left Next's
  // build-time file tracer unable to statically bound the call, so it
  // conservatively swept in unrelated compiled routes ("Encountered
  // unexpected file in NFT list" against pages this module has nothing to
  // do with). The ignore comment is the fix Next's own error message
  // recommends for exactly this shape of call -- this path is read at
  // request time via fs, never imported as a module, so there's genuinely
  // nothing here for the tracer to bundle. Override via DEBATE_MEDIA_DIR if
  // the self-hosted layout ever needs it somewhere else (e.g. a separate
  // disk/mount).
  return process.env.DEBATE_MEDIA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "debate-media");
}

// Resolve ffmpeg/ffprobe explicitly rather than trusting PATH: the app runs
// as a systemd --user service, which doesn't source the login shell that a
// PATH addition like ~/.local/bin normally comes from. ffmpeg was installed
// there specifically because the voteright OS user has no sudo/root
// (2026-08-14, static build from johnvansickle.com — see DEPLOY.md).
// Override via env if it ever moves or gets installed system-wide.
// turbopackIgnore: these are spawned as external binaries (child_process),
// never imported as JS -- Next's build tracer has no reason to follow
// homedir() to figure out what to bundle, but without the hint it can't
// statically bound the call and conservatively traces the whole project
// instead (confirmed live 2026-08-15, same class of warning mediaDir() hit
// above before it was changed to a plain cwd-relative path).
function ffmpegPath(): string {
  return process.env.FFMPEG_PATH ?? path.join(/*turbopackIgnore: true*/ homedir(), ".local", "bin", "ffmpeg");
}
function ffprobePath(): string {
  return process.env.FFPROBE_PATH ?? path.join(/*turbopackIgnore: true*/ homedir(), ".local", "bin", "ffprobe");
}

export function extensionFor(format: MediaFormat): string {
  return format === "video" ? "mp4" : "m4a";
}

export function contentTypeFor(format: MediaFormat): string {
  return format === "video" ? "video/mp4" : "audio/mp4";
}

export function mediaFilePath(id: string, format: MediaFormat): string {
  return path.join(mediaDir(), `${id}.${extensionFor(format)}`);
}

export function mediaUrlPath(id: string): string {
  return `/api/debates/media/${id}`;
}

// Wall-clock cap on ffmpeg/ffprobe itself (separate from the 3-minute
// MEDIA duration cap above) -- a crafted file can make a demuxer/decoder
// hang or spin without ever exceeding the duration check (which just reads
// container metadata, not real processing time). Without this, a single
// malicious upload ties up a worker indefinitely; a real transcode of a
// ≤3-minute clip at these settings finishes in seconds, so this is a wide
// margin, not a tight one.
const PROCESS_TIMEOUT_MS = 120_000;

function run(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args);
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, PROCESS_TIMEOUT_MS);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e); // e.g. binary not found at the resolved path
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) reject(new MediaInvalidError(`${path.basename(bin)} timed out`));
      else if (code === 0) resolve(stdout);
      else reject(new Error(`${path.basename(bin)} exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

async function probeDurationSeconds(filePath: string): Promise<number> {
  const stdout = await run(ffprobePath(), [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", filePath,
  ]);
  const seconds = parseFloat(stdout.trim());
  if (!Number.isFinite(seconds)) throw new MediaInvalidError("could not read media duration");
  return seconds;
}

/** Transcode + save an uploaded File to disk, regardless of source format —
    always H.264+AAC/MP4 for video, AAC/M4A for audio, so playback has zero
    compatibility risk on the real native mobile app as well as the web
    (picked over more space-efficient-but-riskier codecs like H.265/VP9/AV1
    for exactly that reason — space comes from the 720p/CRF caps below
    instead). Checks duration against the RAW upload first (fails fast,
    before spending CPU transcoding something that's getting rejected
    anyway), then again from the transcoded output (authoritative — what
    actually gets served). Returns the new argument id, which doubles as the
    on-disk filename stem. */
export async function saveMediaUpload(
  file: File,
  format: MediaFormat,
): Promise<{ id: string; url: string; durationSeconds: number; sizeBytes: number }> {
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) throw new MediaInvalidError("empty upload");
  if (buf.length > MAX_UPLOAD_BYTES) throw new MediaTooLargeError("upload exceeds size limit");

  await mkdir(mediaDir(), { recursive: true });
  const id = randomUUID();
  const rawPath = path.join(mediaDir(), `${id}.upload`);
  await writeFile(rawPath, buf);

  try {
    let rawDuration: number;
    try {
      rawDuration = await probeDurationSeconds(rawPath);
    } catch {
      throw new MediaInvalidError("unreadable media file");
    }
    if (rawDuration > MAX_DURATION_SECONDS) throw new MediaTooLongError("media exceeds the 3-minute cap");

    const outPath = mediaFilePath(id, format);
    if (format === "video") {
      await run(ffmpegPath(), [
        "-y", "-i", rawPath,
        // force_divisible_by=2: without it, an input whose aspect ratio doesn't
        // divide evenly into the 1280x720 box can scale to an ODD dimension
        // (verified live: a plain 1918x1198 source lands on 1153x720 without
        // this flag) and libx264 then refuses to encode at all
        // ("width not divisible by 2") — not a hypothetical edge case, just an
        // untested one until it was actually tried against a realistic source.
        "-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
        "-c:v", "libx264", "-preset", "medium", "-crf", "26",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart", // moov atom up front — playback (and Range seeking) can start before the whole file downloads
        outPath,
      ]);
    } else {
      await run(ffmpegPath(), ["-y", "-i", rawPath, "-vn", "-c:a", "aac", "-b:a", "96k", outPath]);
    }
    const stats = await stat(outPath);
    const finalDuration = await probeDurationSeconds(outPath).catch(() => rawDuration);
    return { id, url: mediaUrlPath(id), durationSeconds: Math.round(finalDuration), sizeBytes: stats.size };
  } finally {
    await rm(rawPath, { force: true });
  }
}

export async function deleteMediaFile(id: string, format: MediaFormat): Promise<void> {
  await rm(mediaFilePath(id, format), { force: true });
}

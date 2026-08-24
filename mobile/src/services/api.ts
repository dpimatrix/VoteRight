import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, UploadType } from "expo-file-system";
import { API_URL } from "../constants/Config";

const SESSION_KEY = "voteright_session_id";
const SESSION_HEADER = "X-VoteRight-Session";

let currentSessionId: string | null = null;

export const hasSession = () => !!currentSessionId;

const persistSessionId = (sid: string) => {
  currentSessionId = sid;
  AsyncStorage.setItem(SESSION_KEY, sid).catch(() => {});
};

/** Identity recovery (2026-08-24) -- overwrites the current session id with
 *  a recovered one, e.g. after signing.ts's importEncryptedBackup() finds
 *  the restored key belongs to a different, already-existing identity than
 *  this fresh install's own session (mirrors web's adoptIdentity() in
 *  anon.ts, which re-points a cookie the same way). Exported rather than
 *  reusing persistSessionId directly so callers can't casually overwrite
 *  the session id for any other reason -- this name says what it's for. */
export const adoptSessionId = persistSessionId;

// Resolves once any stored session id has been loaded from AsyncStorage.
let sessionReadyResolve!: () => void;
export const sessionReady: Promise<void> = new Promise((resolve) => {
  sessionReadyResolve = resolve;
});

AsyncStorage.getItem(SESSION_KEY)
  .then((sid) => {
    if (sid) currentSessionId = sid;
  })
  .catch(() => {})
  .finally(() => sessionReadyResolve());

const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (currentSessionId) headers[SESSION_HEADER] = currentSessionId;
  return headers;
};

/** Mints an anonymous identity on first launch, or re-confirms an existing one.
 *  Mirrors VoteRight's web anon-voter cookie (see app/src/lib/anon.ts) — this is
 *  the native equivalent, since a native fetch client has no cookie jar. */
export const ensureSession = async (): Promise<string> => {
  await sessionReady;
  const res = await fetch(`${API_URL}/api/mobile/session`, {
    method: "POST",
    headers: getHeaders(),
  });
  const data = await res.json();
  persistSessionId(data.sessionId);
  return data.sessionId;
};

const withTimeout = (ms: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeoutId) };
};

// carries the parsed JSON error body (2026-08-19) -- routes across this app
// return typed codes on failure (e.g. {error: "pay"} vs {error: "verify"},
// see app/src/app/api/debates/[id]/second/route.ts and siblings), and until
// now every one of those codes was silently dropped: both get() and post()
// only threw a generic Error built from the HTTP status, so a caller had no
// way to tell "you need to verify" apart from "you need to pay" apart from
// "the server errored" -- they all just landed in the same bare
// catch (e) { console.error(...) } with nothing shown to the user. body is
// best-effort (undefined if the response wasn't JSON, e.g. a plain-text
// admin-route "forbidden") so a caller can safely do
// `e instanceof ApiError && (e.body as { error?: string })?.error === 'pay'`.
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(method: string, path: string, status: number, body: unknown) {
    super(`${method} ${path} failed: ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function parseBodyBestEffort(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

export const get = async <T = unknown>(path: string): Promise<T> => {
  await sessionReady;
  const { signal, clear } = withTimeout(15000);
  try {
    const res = await fetch(`${API_URL}${path}`, { method: "GET", headers: getHeaders(), signal });
    if (!res.ok) throw new ApiError("GET", path, res.status, await parseBodyBestEffort(res));
    return (await res.json()) as T;
  } finally {
    clear();
  }
};

export const post = async <T = unknown>(path: string, body?: unknown): Promise<T> => {
  await sessionReady;
  const { signal, clear } = withTimeout(15000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { ...getHeaders(), "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
    if (!res.ok) throw new ApiError("POST", path, res.status, await parseBodyBestEffort(res));
    return (await res.json()) as T;
  } finally {
    clear();
  }
};

// Audio/video debate arguments (2026-08-24) -- NOT built on fetch()/FormData
// the way get()/post() are. Real bug found live on-device (2026-08-24,
// screenshot from the owner): a plain `fetch(url, { body: formData })` with
// an RN-style {uri, name, type} file part throws "Unsupported FormDataPart
// implementation" on this project's exact setup. Root cause traced, not
// guessed: metro.config.js's `unstable_enablePackageExports = true` (added
// for @noble/curves/@noble/hashes's package.json "exports" maps, see that
// file's own comment) has a documented side effect on Expo SDK 53+ --
// it also redirects the global fetch/Request/Response/Headers to expo/fetch
// instead of React Native's classic polyfill, and expo/fetch's own FormData
// support is a known, currently-open gap (expo/expo#33134) that doesn't
// accept RN's traditional file-part shape at all. Turning off
// enablePackageExports isn't an option -- that would break the signing
// library's own module resolution, a real, already-shipped feature.
//
// Fixed by not going through fetch/FormData for this one call at all:
// expo-file-system's File.upload() does the multipart upload via its own
// native upload task, entirely independent of whichever global fetch
// implementation is currently active. UploadResult's `body` is a raw
// string (this endpoint's own responses are always JSON, parsed by the
// caller) and `status` isn't auto-checked against 2xx the way fetch's
// `res.ok` is -- both handled explicitly below.
export const uploadMedia = async <T = unknown>(
  path: string,
  fileUri: string,
  fields: Record<string, string>,
  opts: { fieldName: string; mimeType: string },
): Promise<T> => {
  await sessionReady;
  const file = new File(fileUri);
  const result = await file.upload(`${API_URL}${path}`, {
    uploadType: UploadType.MULTIPART,
    fieldName: opts.fieldName,
    mimeType: opts.mimeType,
    parameters: fields,
    headers: getHeaders(),
    // Same 300s reasoning as before this rewrite: not just the server's own
    // 120s ffmpeg wall-clock cap (§9.1) -- that only covers the TRANSCODE
    // step, which starts AFTER the full upload already lands server-side.
    // A tighter timeout budgeted only for the transcode would abort
    // mid-upload on anything but a fast connection (250MB in under a
    // minute needs a sustained ~35+ Mbps upload, not guaranteed on
    // cellular).
    signal: AbortSignal.timeout(300000),
  });
  let body: unknown;
  try {
    body = JSON.parse(result.body);
  } catch {
    body = undefined;
  }
  if (result.status < 200 || result.status >= 300) throw new ApiError("POST", path, result.status, body);
  return body as T;
};

/** Convenience for the common "route to the right screen" branch every
 *  payment-gated action needs -- see debates/[id].tsx, (tabs)/debates.tsx,
 *  debates/new.tsx, and DebateComposer.tsx. */
export function errorCode(e: unknown): string | null {
  if (!(e instanceof ApiError)) return null;
  const body = e.body as { error?: unknown } | undefined;
  return typeof body?.error === "string" ? body.error : null;
}

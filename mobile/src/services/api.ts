import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/Config";

const SESSION_KEY = "voteright_session_id";
const SESSION_HEADER = "X-VoteRight-Session";

let currentSessionId: string | null = null;

export const hasSession = () => !!currentSessionId;

const persistSessionId = (sid: string) => {
  currentSessionId = sid;
  AsyncStorage.setItem(SESSION_KEY, sid).catch(() => {});
};

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

/** Convenience for the common "route to the right screen" branch every
 *  payment-gated action needs -- see debates/[id].tsx, (tabs)/debates.tsx,
 *  debates/new.tsx, and DebateComposer.tsx. */
export function errorCode(e: unknown): string | null {
  if (!(e instanceof ApiError)) return null;
  const body = e.body as { error?: unknown } | undefined;
  return typeof body?.error === "string" ? body.error : null;
}

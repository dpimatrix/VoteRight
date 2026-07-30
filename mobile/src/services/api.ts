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

export class ApiError extends Error {
  status: number;
  constructor(path: string, status: number) {
    super(`GET ${path} failed: ${status}`);
    this.status = status;
  }
}

export const get = async <T = unknown>(path: string): Promise<T> => {
  await sessionReady;
  const { signal, clear } = withTimeout(15000);
  try {
    const res = await fetch(`${API_URL}${path}`, { method: "GET", headers: getHeaders(), signal });
    if (!res.ok) throw new ApiError(path, res.status);
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
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clear();
  }
};

import { redirectTo } from "@/lib/redirect";
import { currentOrNewUserId } from "@/lib/anon";
import { createRequest, type RequestType } from "@/lib/privacy";

const TYPES: RequestType[] = ["access", "correction", "deletion", "portability", "appeal"];

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const type = String(form.get("type") ?? "");
  if (!TYPES.includes(type as RequestType)) {
    return redirectTo(`/privacy/request?lang=${lang}`, request);
  }
  // No verification gate: MODPA rights belong to everyone we hold data about,
  // including unverified visitors — the cookie identity IS the authentication,
  // because it is the same identity the data is stored under.
  const userId = await currentOrNewUserId();
  const res = await createRequest({
    userId,
    type: type as RequestType,
    details: String(form.get("details") ?? "") || undefined,
    responseContact: String(form.get("contact") ?? "") || undefined,
    appealOf: String(form.get("appeal_of") ?? "") || undefined,
  });
  // Real gap found live 2026-08-31: createRequest()'s own {ok:false} (an
  // appeal submitted with no request to appeal) used to be discarded
  // outright -- every submission redirected to the same "Request received"
  // success banner regardless of outcome. A statutory MODPA rights request
  // silently not being recorded, while telling the person it was, is worth
  // fixing even though the page's own appeal button always supplies
  // appeal_of correctly (this is a defense-in-depth fix against a
  // malformed/direct request, not a commonly-reachable-through-normal-use
  // gap).
  return redirectTo(`/privacy/request?lang=${lang}&${res.ok ? "ok=1" : "error=1"}`, request);
}

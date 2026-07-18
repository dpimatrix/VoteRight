import { currentOrNewUserId } from "@/lib/anon";
import { createRequest, type RequestType } from "@/lib/privacy";

const TYPES: RequestType[] = ["access", "correction", "deletion", "portability", "appeal"];

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const type = String(form.get("type") ?? "");
  if (!TYPES.includes(type as RequestType)) {
    return Response.redirect(new URL(`/privacy/request?lang=${lang}`, request.url), 303);
  }
  // No verification gate: MODPA rights belong to everyone we hold data about,
  // including unverified visitors — the cookie identity IS the authentication,
  // because it is the same identity the data is stored under.
  const userId = await currentOrNewUserId();
  await createRequest({
    userId,
    type: type as RequestType,
    details: String(form.get("details") ?? "") || undefined,
    responseContact: String(form.get("contact") ?? "") || undefined,
    appealOf: String(form.get("appeal_of") ?? "") || undefined,
  });
  return Response.redirect(new URL(`/privacy/request?lang=${lang}&ok=1`, request.url), 303);
}

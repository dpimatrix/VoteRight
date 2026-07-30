import { currentOrNewUserId } from "@/lib/anon";
import { verifyAddress } from "@/lib/debates";

export async function POST(request: Request) {
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const userId = await currentOrNewUserId();

  if (isJson) {
    const { address } = (await request.json()) as { address?: string };
    const outcome = await verifyAddress(userId, address ?? "");
    return Response.json({ outcome });
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const outcome = await verifyAddress(userId, String(form.get("address") ?? ""));
  const dest =
    outcome === "ok"
      ? `/debates?lang=${lang}`
      : outcome === "outside"
        ? `/verify?bad=outside&lang=${lang}`
        : `/verify?bad=1&lang=${lang}`; // bad_format and no_match share the "check the address" message
  return Response.redirect(new URL(dest, request.url), 303);
}

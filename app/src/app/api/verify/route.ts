import { redirectTo } from "@/lib/redirect";
import { currentOrNewUserId } from "@/lib/anon";
import { verifyAddress } from "@/lib/debates";
import { DEMAND_THRESHOLD } from "@/lib/jurisdictionDemand";
import { hashContext } from "@/lib/signing";

export async function POST(request: Request) {
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const userId = await currentOrNewUserId();
  const ip = request.headers.get("x-forwarded-for");
  const requestContext = { ip, contextHash: hashContext(ip ?? "unknown", request.headers.get("user-agent") ?? "unknown") };

  if (isJson) {
    const { address } = (await request.json()) as { address?: string };
    const outcome = await verifyAddress(userId, address ?? "", requestContext);
    // demandThreshold rides along on this one outcome only (found on
    // regression review, 2026-09-08) -- the client copy used to hardcode
    // "12" in four places (both platforms, both languages) instead of
    // reading the actual DEMAND_THRESHOLD constant, which would silently
    // go stale the moment that pilot-scale number is ever retuned.
    return Response.json(
      outcome === "ok_county_not_seeded" ? { outcome, demandThreshold: DEMAND_THRESHOLD } : { outcome },
    );
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const outcome = await verifyAddress(userId, String(form.get("address") ?? ""), requestContext);
  const dest =
    outcome === "ok" || outcome === "ok_county_not_seeded"
      ? `/debates?lang=${lang}`
      : outcome === "outside"
        ? `/verify?bad=outside&lang=${lang}`
        : outcome === "resolver_unavailable"
          ? `/verify?bad=unavailable&lang=${lang}`
          : outcome === "no_match"
            ? `/verify?bad=no_match&lang=${lang}` // split from bad_format (2026-09-08) -- see AddressForm.tsx's own comment; kept consistent here even though no page currently reads this specific value, this route's only no-JS fallback path
            : `/verify?bad=1&lang=${lang}`;
  return redirectTo(dest, request);
}

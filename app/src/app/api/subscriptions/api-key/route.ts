import { currentUserId } from "@/lib/anon";
import { redirectTo } from "@/lib/redirect";
import { generateApiKey, hasTierAtLeast } from "@/lib/subscriptions";

export async function POST(request: Request) {
  const userId = await currentUserId();
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  if (!userId || !(await hasTierAtLeast(userId, "champion"))) {
    return new Response("Champion tier required", { status: 403 });
  }
  const rawKey = await generateApiKey(userId);
  // Shown exactly once via a query param on redirect, same pattern as the
  // admin-accounts TOTP enrollment secret -- never stored anywhere
  // retrievable after this page reloads.
  return redirectTo(`/subscribe?lang=${lang}&newApiKey=${encodeURIComponent(rawKey)}`, request);
}

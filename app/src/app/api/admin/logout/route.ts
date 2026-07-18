import { cookies } from "next/headers";
import { sessionCookieName } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const store = await cookies();
  store.delete(sessionCookieName());
  store.delete("vr_admin"); // legacy dev cookie
  return Response.redirect(new URL("/admin", request.url), 303);
}

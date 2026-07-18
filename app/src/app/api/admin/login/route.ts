import { cookies } from "next/headers";
import { loginWithCode, sessionCookieName, sessionMaxAgeSeconds } from "@/lib/adminAuth";

/* Serverless-friendly brute-force damper: a failed attempt costs a second.
   (A per-IP store would not survive across instances anyway; the real ceiling
   is TOTP's 30-second rotation + 10^6 space + this delay.) */
export async function POST(request: Request) {
  const form = await request.formData();
  const code = String(form.get("token") ?? "").trim();
  const session = loginWithCode(code);
  if (session) {
    const store = await cookies();
    store.set(sessionCookieName(), session, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMaxAgeSeconds(),
    });
  } else {
    await new Promise((r) => setTimeout(r, 1000));
  }
  return Response.redirect(new URL("/admin", request.url), 303);
}

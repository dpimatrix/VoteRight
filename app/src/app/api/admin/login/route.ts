import { cookies } from "next/headers";
import { adminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  if (token === adminToken()) {
    const store = await cookies();
    store.set("vr_admin", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  }
  return Response.redirect(new URL("/admin", request.url), 303);
}

// Real production bug found live (2026-08-14): every server-action route in
// this app built its post-submit redirect with `new URL(path, request.url)`
// -- but request.url reflects whatever host Next.js sees internally, which
// behind this app's Apache reverse proxy (docs/DEPLOY.md) is the bare
// 127.0.0.1:3001 the Node process is actually bound to, not the real public
// domain. Apache isn't forwarding the original Host header to it. The
// result: every real user submitting a form (verify an address, second a
// proposal, vote on a referendum, support an accountability campaign,
// every admin-console action, ...) got redirected to
// http://localhost:3001/... instead of https://voteright.dpimatrix.com/...
// -- "This site can't be reached" for anyone not literally on the VPS
// itself. This almost certainly dates to the July 2026 move off Vercel
// (whose edge network forwards the real Host automatically) onto this
// self-hosted setup, and went uncaught until a real user hit it, since
// local dev's request.url is already correct (no proxy in front of it) and
// this session's own earlier testing used the JSON API variant of /verify,
// which returns JSON directly rather than redirecting.
//
// Fix: an explicit SITE_URL env var for production (set once in
// app/.env.production, documented in .env.example) takes priority over
// request.url's own (proxy-mangled) origin. Local dev is unaffected --
// SITE_URL stays unset there, so this falls through to the same
// request.url-based origin that already works correctly without a proxy
// in front of it.
export function redirectTo(path: string, request: Request): Response {
  const origin = process.env.SITE_URL ?? new URL(request.url).origin;
  return Response.redirect(new URL(path, origin), 303);
}

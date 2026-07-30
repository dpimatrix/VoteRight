/* Canonical payload builders for signed actions (ARCHITECTURE.md Section 10) -
   zero imports, safe to run in both the browser (client-side signing) and the
   server (independent reconstruction before verifying - see signing.ts). Both
   sides MUST build this string identically, or a legitimately-signed action
   will fail verification.

   JSON-encoding an ordered array (not object - no key-ordering ambiguity) avoids
   any delimiter-collision risk a hand-rolled joined string would have against
   free-text fields like `body`. */
export function canonicalArgumentPayload(opts: {
  threadId: string;
  userId: string;
  side: string;
  body: string;
  citationUrl?: string | null;
}): string {
  return JSON.stringify(["argument", opts.threadId, opts.userId, opts.side, opts.body, opts.citationUrl ?? ""]);
}

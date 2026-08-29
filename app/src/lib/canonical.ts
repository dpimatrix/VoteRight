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

export function canonicalProposalPayload(opts: {
  userId: string;
  topicId: string;
  title: string;
  body: string;
}): string {
  return JSON.stringify(["issue_proposal", opts.userId, opts.topicId, opts.title, opts.body]);
}

export function canonicalSecondPayload(opts: { userId: string; proposalId: string }): string {
  return JSON.stringify(["second", opts.userId, opts.proposalId]);
}

export function canonicalAccountabilitySupportPayload(opts: { userId: string; campaignId: string }): string {
  return JSON.stringify(["accountability_support", opts.userId, opts.campaignId]);
}

// Proof-of-possession for /api/keys/register and /api/keys/recover (found
// live 2026-08-29): neither endpoint previously required any proof the
// caller actually held the PRIVATE key for the public key they submitted --
// public keys are deliberately public (attached to every signed argument/
// proposal/second), so anyone who'd merely SEEN a victim's key could claim
// it as their own, poisoning ownerOfValidKey()'s "most recent event wins"
// resolution and hijacking a future legitimate recovery attempt onto the
// attacker's identity instead. Binding to userId (the CALLER's own current
// session, resolved server-side -- never client-supplied) rather than just
// the fingerprint alone means a valid proof can only ever be produced by
// whoever currently holds the private key AND is asking as that exact
// session; it's meaningless to replay against a different session/account,
// which is the whole point.
export function canonicalKeyProofPayload(opts: { userId: string; fingerprint: string }): string {
  return JSON.stringify(["key_proof", opts.userId, opts.fingerprint]);
}

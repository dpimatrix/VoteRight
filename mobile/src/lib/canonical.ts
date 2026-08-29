/* Canonical payload builders for signed actions — must build byte-identical
   strings to app/src/lib/canonical.ts, since the server reconstructs the same
   payload independently before verifying a signature against it. Kept as a
   plain, dependency-free port rather than shared code across the two
   package.json boundaries (app/ vs mobile/). */
export function canonicalArgumentPayload(opts: {
  threadId: string;
  userId: string;
  side: string;
  body: string;
  citationUrl?: string | null;
}): string {
  return JSON.stringify(['argument', opts.threadId, opts.userId, opts.side, opts.body, opts.citationUrl ?? '']);
}

export function canonicalProposalPayload(opts: {
  userId: string;
  topicId: string;
  title: string;
  body: string;
}): string {
  return JSON.stringify(['issue_proposal', opts.userId, opts.topicId, opts.title, opts.body]);
}

export function canonicalSecondPayload(opts: { userId: string; proposalId: string }): string {
  return JSON.stringify(['second', opts.userId, opts.proposalId]);
}

export function canonicalAccountabilitySupportPayload(opts: { userId: string; campaignId: string }): string {
  return JSON.stringify(['accountability_support', opts.userId, opts.campaignId]);
}

// Proof-of-possession for /api/keys/register and /api/keys/recover (found
// live 2026-08-29, see app/src/lib/canonical.ts's own comment for the full
// vulnerability this closes) -- must match that file's version exactly.
export function canonicalKeyProofPayload(opts: { userId: string; fingerprint: string }): string {
  return JSON.stringify(['key_proof', opts.userId, opts.fingerprint]);
}

import { db } from "./db";
import { ownAccountabilityScope, ownOfficeholders } from "./jurisdictions";

/* Phase 4 slice 2: accountability pathways (§2.1, §2.1.1, §7.4). The table tells a
   voter, truthfully, what mechanisms actually exist for a given seat — the word
   "recall" never appears unless a specific office really has one. Campaigns are
   citizen organizing on top of those facts, with two hard limits: in-app support
   is never a legal signature, and the disclosure text is generated, not edited. */

export interface Pathway {
  id: string;
  mechanism_type: string;
  is_binding: boolean;
  legal_citation: string;
  signature_requirement_note: string | null;
  description: string;
  office_title: string | null;
}

/* ── disclosure generator (pure — unit-tested; §7.4 "auto-populated, non-editable") ── */
export function buildDisclosure(opts: {
  targetType: "politician" | "charter_or_law_change";
  mechanismType: string;
  legalCitation: string;
  isBinding: boolean;
}): string {
  const base =
    "This is a citizen-organized campaign on VoteRight — not a legal petition, not an official proceeding, and not affiliated with any election authority. In-app support is not a petition signature and has no legal effect.";
  if (opts.targetType === "charter_or_law_change") {
    return `${base} The underlying mechanism — the voter-initiated charter amendment (${opts.legalCitation}) — is a real, binding legal process, but a real signature drive has its own legal form, circulators, and Board of Elections verification, entirely outside this app.`;
  }
  const mech = opts.isBinding
    ? `The underlying mechanism (${opts.legalCitation}) is a real legal process with its own requirements, entirely outside this app.`
    : `This campaign organizes voters within the ordinary electoral process (${opts.legalCitation}); it does not and cannot remove anyone from office.`;
  return `${base} No petition-based recall exists for this office. ${mech}`;
}

/* ── pathways for a politician's current seat (§7.4 lookup) ── */
export async function pathwaysForPolitician(politicianId: string): Promise<{ pathways: Pathway[]; holds_office: boolean }> {
  // Real gap found live 2026-08-31: holds_office used to be a per-row scalar
  // subquery on the SAME query as the pathways JOIN below, so it was only
  // ever computed when at least one pathway row existed. A politician who
  // genuinely holds office today, but whose specific office/jurisdiction
  // simply has no curated accountability_pathways row yet (accountability
  // data coverage is nowhere near complete at nationwide scale -- see this
  // file's own header comment on the word "recall" never appearing unless
  // a specific office really has one, which cuts both ways: absence of
  // curated data must never be read as absence of the office itself)
  // produced ZERO rows here, and holds_office silently fell back to false
  // -- rendering "This person holds no current office" on a real,
  // currently-serving politician's own accountability panel. Fixed by
  // computing holds_office as its own independent top-level query,
  // unconditional on whether any pathway happens to exist.
  const holds = await db().query(`SELECT current_office_id IS NOT NULL AS holds_office FROM politicians WHERE id = $1`, [politicianId]);
  const { rows } = await db().query(
    `SELECT ap.id, ap.mechanism_type, ap.is_binding, ap.legal_citation,
            ap.signature_requirement_note, ap.description, o.title AS office_title
       FROM accountability_pathways ap
       LEFT JOIN offices o ON o.id = ap.office_id
      WHERE ap.office_id = (SELECT current_office_id FROM politicians WHERE id = $1)
         -- Jurisdiction-wide pathways (e.g. a charter amendment petition) apply
         -- only within the politician's OWN jurisdiction — Virginia and D.C. have
         -- no equivalent to Maryland's Article XI-A charter petition, so this must
         -- never silently borrow another state's mechanism (§2 discipline).
         OR (ap.office_id IS NULL AND ap.jurisdiction_id = (
               SELECT o2.jurisdiction_id FROM politicians p
                 JOIN offices o2 ON o2.id = p.current_office_id
                WHERE p.id = $1
             ))
      ORDER BY ap.is_binding DESC, ap.mechanism_type`,
    [politicianId],
  );
  return {
    pathways: rows as Pathway[],
    holds_office: holds.rows[0]?.holds_office ?? false,
  };
}

/* ── campaigns ── */
export async function listCampaigns(userId: string | null) {
  const { rows } = await db().query(
    `SELECT c.id, c.target_type, c.reform_title, c.description, c.support_count, c.status,
            c.external_petition_status, c.created_at::date::text AS date,
            ap.mechanism_type, ap.is_binding, ap.legal_citation,
            pol.full_name AS politician_name, pol.id AS politician_id,
            EXISTS (SELECT 1 FROM accountability_campaign_supports s
                     WHERE s.campaign_id = c.id AND s.user_id = $1) AS supported
       FROM accountability_campaigns c
       JOIN accountability_pathways ap ON ap.id = c.pathway_id
       LEFT JOIN politicians pol ON pol.id = c.politician_id
      ORDER BY (c.status = 'gathering_support') DESC, c.support_count DESC, c.created_at DESC`,
    [userId],
  );
  return rows as {
    id: string; target_type: string; reform_title: string | null; description: string;
    support_count: number; status: string; external_petition_status: string; date: string;
    mechanism_type: string; is_binding: boolean; legal_citation: string;
    politician_name: string | null; politician_id: string | null; supported: boolean;
  }[];
}

export async function campaignDetail(id: string, userId: string | null) {
  const { rows } = await db().query(
    `SELECT c.id, c.target_type, c.reform_title, c.description, c.disclosure_text,
            c.support_count, c.status, c.external_petition_status, c.created_at::date::text AS date,
            ap.mechanism_type, ap.is_binding, ap.legal_citation, ap.signature_requirement_note,
            ap.description AS pathway_description,
            pol.full_name AS politician_name, pol.id AS politician_id,
            EXISTS (SELECT 1 FROM accountability_campaign_supports s
                     WHERE s.campaign_id = c.id AND s.user_id = $2) AS supported,
            -- Same shape DebateComposer's argument citations already render
            -- in (publisher + title, see debates.ts/debates/[id]/page.tsx).
            COALESCE((SELECT json_agg(json_build_object('publisher', ci.publisher, 'title', ci.title))
               FROM campaign_citations cc JOIN citations ci ON ci.id = cc.citation_id
              WHERE cc.campaign_id = c.id), '[]') AS citations
       FROM accountability_campaigns c
       JOIN accountability_pathways ap ON ap.id = c.pathway_id
       LEFT JOIN politicians pol ON pol.id = c.politician_id
      WHERE c.id = $1`,
    [id, userId],
  );
  return rows[0] ?? null;
}

export async function campaignsForPolitician(politicianId: string) {
  const { rows } = await db().query(
    `SELECT c.id, c.description, c.support_count, c.status, ap.mechanism_type
       FROM accountability_campaigns c
       JOIN accountability_pathways ap ON ap.id = c.pathway_id
      WHERE c.politician_id = $1 AND c.status <> 'closed'
      ORDER BY c.support_count DESC`,
    [politicianId],
  );
  return rows as { id: string; description: string; support_count: number; status: string; mechanism_type: string }[];
}

/** Public act (§10.2 — like seconding): attributed, one per verified user;
    support_count self-corrects from the per-user rows.

    Eligibility walks UP the supporter's jurisdiction stack against the
    campaign's pathway jurisdiction, same pattern as issueBallot in
    referenda.ts -- a City of Rockville resident can support a Montgomery
    County-wide campaign; the reverse fails. Unlike a referendum, a campaign
    has no opens_at to anchor a residency-established-before check against
    (it's ongoing, not a single time-boxed vote), so this is jurisdiction-only. */
export async function supportCampaign(
  campaignId: string,
  userId: string,
  tier: string,
  signing?: { signature: string; publicKeyFingerprint: string; contextHash?: string },
): Promise<"ok" | "signature_invalid" | "not_eligible"> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const elig = await client.query(
      `WITH RECURSIVE up AS (
         SELECT j.ocd_id, j.parent_ocd_id
           FROM users u JOIN jurisdictions j ON j.ocd_id = u.residence_jurisdiction_id
          WHERE u.id = $2
         UNION ALL
         SELECT j.ocd_id, j.parent_ocd_id FROM jurisdictions j JOIN up ON j.ocd_id = up.parent_ocd_id
       )
       SELECT EXISTS (
         SELECT 1 FROM up JOIN accountability_pathways ap ON ap.jurisdiction_id = up.ocd_id
          WHERE ap.id = (SELECT pathway_id FROM accountability_campaigns WHERE id = $1)
       ) AS eligible`,
      [campaignId, userId],
    );
    if (!elig.rows[0]?.eligible) {
      await client.query("ROLLBACK");
      return "not_eligible";
    }
    let signedActionId: string | null = null;
    if (signing) {
      const { recordSignedAction, canonicalAccountabilitySupportPayload } = await import("./signing");
      try {
        signedActionId = await recordSignedAction(client, {
          userId,
          publicKeyFingerprint: signing.publicKeyFingerprint,
          actionType: "accountability_support",
          canonicalPayload: canonicalAccountabilitySupportPayload({ userId, campaignId }),
          signature: signing.signature,
          contextHash: signing.contextHash,
        });
      } catch {
        await client.query("ROLLBACK");
        return "signature_invalid";
      }
    }
    await client.query(
      `INSERT INTO accountability_campaign_supports (campaign_id, user_id, verification_tier_at_support, signed_action_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [campaignId, userId, tier, signedActionId],
    );
    await client.query(
      `UPDATE accountability_campaigns c SET support_count =
         (SELECT count(*) FROM accountability_campaign_supports s WHERE s.campaign_id = c.id)
       WHERE c.id = $1`,
      [campaignId],
    );
    await client.query("COMMIT");
    return "ok";
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function createCampaign(opts: {
  userId: string;
  pathwayId: string;
  targetType: "politician" | "charter_or_law_change";
  politicianId?: string;
  reformTitle?: string;
  description: string;
  // Optional (2026-08-23, mirrors DebateComposer's citationUrl exactly --
  // same shared citations ledger via a new campaign_citations join table,
  // see migration 090). The campaign description has always asked "cite
  // the record" with nowhere structured to put one until now.
  citationUrl?: string;
}): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const pw = await db().query(
    `SELECT mechanism_type, legal_citation, is_binding FROM accountability_pathways WHERE id = $1`,
    [opts.pathwayId],
  );
  if (pw.rowCount === 0) return { ok: false, reason: "pathway" };
  const p = pw.rows[0];
  // A reform campaign only makes sense on the binding petition pathway; a
  // politician campaign never rides the jurisdiction-wide petition row.
  if (opts.targetType === "charter_or_law_change" && p.mechanism_type !== "charter_amendment_petition")
    return { ok: false, reason: "pathway_mismatch" };
  if (opts.targetType === "politician" && p.mechanism_type === "charter_amendment_petition")
    return { ok: false, reason: "pathway_mismatch" };
  const disclosure = buildDisclosure({
    targetType: opts.targetType,
    mechanismType: p.mechanism_type,
    legalCitation: p.legal_citation,
    isBinding: p.is_binding,
  });
  const { rows } = await db().query(
    `INSERT INTO accountability_campaigns
       (pathway_id, target_type, politician_id, reform_title, initiated_by_user_id, description,
        disclosure_text, external_petition_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      opts.pathwayId,
      opts.targetType,
      opts.targetType === "politician" ? opts.politicianId : null,
      opts.targetType === "charter_or_law_change" ? opts.reformTitle : null,
      opts.userId,
      opts.description,
      disclosure,
      p.mechanism_type === "charter_amendment_petition" ? "not_started" : "not_applicable",
    ],
  );
  const campaignId = rows[0].id as string;
  // Same citation-insert shape as postArgument() in debates.ts -- archive_url
  // and publisher are derived, never hand-entered (this app never trusts a
  // self-reported publisher name).
  if (opts.citationUrl) {
    const cit = await db().query(
      `INSERT INTO citations (url, archive_url, title, publisher, published_at)
       VALUES ($1, 'https://web.archive.org/web/0/' || $1, $1, split_part(regexp_replace($1, 'https?://', ''), '/', 1), CURRENT_DATE)
       RETURNING id`,
      [opts.citationUrl],
    );
    await db().query(`INSERT INTO campaign_citations (campaign_id, citation_id) VALUES ($1, $2)`, [
      campaignId,
      cit.rows[0].id,
    ]);
  }
  return { ok: true, id: campaignId };
}

/* ── creation-form data ── */
/** Scoped to the resident's own represented officials AND own jurisdiction's
    pathways (2026-08-22 fix for politicians, 2026-08-23 fix for pathways --
    see ownOfficeholders()'s and ownAccountabilityScope()'s own doc comments
    for the real unscoped-nationwide-fetch bugs these replace). userId null
    (anonymous/pre-verification) correctly yields empty lists, not everyone
    -- matches the screen's own gate, which never shows the campaign-
    creation UI at all until the resident is address_verified. */
export async function creatableTargets(userId: string | null) {
  const scope = await ownAccountabilityScope(userId);
  const pathways = scope
    ? await db().query(
        `SELECT ap.id, ap.mechanism_type, ap.is_binding, ap.legal_citation, o.title AS office_title
           FROM accountability_pathways ap
           LEFT JOIN offices o ON o.id = ap.office_id
          WHERE ap.mechanism_type NOT IN ('no_removal_mechanism_exists')
            AND (
              (ap.office_id IS NOT NULL AND ap.office_id = ANY($1::uuid[]))
              OR (ap.office_id IS NULL AND ap.jurisdiction_id = ANY($2::text[]))
            )
          ORDER BY ap.is_binding DESC, o.title NULLS FIRST`,
        [scope.officeIds, scope.jurisdictionIds],
      )
    : { rows: [] };
  const politicians = await ownOfficeholders(userId);
  return { pathways: pathways.rows, politicians: politicians ?? [] };
}

/* ── duplicate-campaign detection ── */
export interface SimilarCampaign {
  id: string;
  label: string;
  description: string;
  supportCount: number;
}

/** Suggest, never block (2026-08-23) -- same spirit as the debates
    composer's claim heuristic. Real incident this fixes: 3 byte-identical
    reform campaigns ("Reduce & Balance Montgomery County Budget"), same
    user, created minutes apart, clearly repeated testing rather than 3
    distinct efforts (see migration 089's own comment).

    Reform campaigns: free-text `q` (the title being typed) against existing
    reform_title values on the SAME pathway, via pg_trgm similarity --
    catches close wording, not just exact repeats.

    Politician campaigns: no comparable free-text field exists (the
    resident picks a politician + pathway from fixed lists), so this is an
    exact match on (politician_id, pathway_id) instead -- a stronger,
    more precise signal than fuzzy text would give for that case. */
export async function similarCampaigns(
  opts:
    | { targetType: "charter_or_law_change"; pathwayId: string; q: string }
    | { targetType: "politician"; pathwayId: string; politicianId: string },
): Promise<SimilarCampaign[]> {
  if (opts.targetType === "charter_or_law_change") {
    if (opts.q.trim().length < 3) return []; // too short for a meaningful trigram score
    const { rows } = await db().query(
      `SELECT id, reform_title AS label, description, support_count
         FROM accountability_campaigns
        WHERE target_type = 'charter_or_law_change'
          AND pathway_id = $1
          AND similarity(reform_title, $2) > 0.3
        ORDER BY similarity(reform_title, $2) DESC
        LIMIT 5`,
      [opts.pathwayId, opts.q],
    );
    return rows.map((r) => ({ id: r.id, label: r.label, description: r.description, supportCount: r.support_count }));
  }
  const { rows } = await db().query(
    `SELECT c.id, p.full_name AS label, c.description, c.support_count
       FROM accountability_campaigns c
       JOIN politicians p ON p.id = c.politician_id
      WHERE c.target_type = 'politician'
        AND c.pathway_id = $1
        AND c.politician_id = $2
      LIMIT 5`,
    [opts.pathwayId, opts.politicianId],
  );
  return rows.map((r) => ({ id: r.id, label: r.label, description: r.description, supportCount: r.support_count }));
}

/* ── admin ── */
export async function adminCampaigns() {
  const { rows } = await db().query(
    `SELECT c.id, c.target_type, c.reform_title, c.support_count, c.status, c.external_petition_status,
            c.description, ap.mechanism_type, pol.full_name AS politician_name
       FROM accountability_campaigns c
       JOIN accountability_pathways ap ON ap.id = c.pathway_id
       LEFT JOIN politicians pol ON pol.id = c.politician_id
      ORDER BY c.created_at DESC`,
  );
  return rows as {
    id: string; target_type: string; reform_title: string | null; support_count: number;
    status: string; external_petition_status: string; description: string;
    mechanism_type: string; politician_name: string | null;
  }[];
}

export async function adminUpdateCampaign(id: string, status?: string, externalStatus?: string) {
  if (status) await db().query(`UPDATE accountability_campaigns SET status = $2 WHERE id = $1`, [id, status]);
  if (externalStatus)
    await db().query(`UPDATE accountability_campaigns SET external_petition_status = $2 WHERE id = $1`, [id, externalStatus]);
}

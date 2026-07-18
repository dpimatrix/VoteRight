import { db } from "./db";

/* Phase 4 slice 2: accountability pathways (§2.1, §2.1.1, §7.4). The table tells a
   voter, truthfully, what mechanisms actually exist for a given seat — the word
   "recall" never appears unless a specific office really has one. Campaigns are
   citizen organizing on top of those facts, with two hard limits: in-app support
   is never a legal signature, and the disclosure text is generated, not edited. */

const COUNTY = "ocd-division/country:us/state:md/county:montgomery";

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
  const { rows } = await db().query(
    `SELECT ap.id, ap.mechanism_type, ap.is_binding, ap.legal_citation,
            ap.signature_requirement_note, ap.description, o.title AS office_title,
            (SELECT current_office_id IS NOT NULL FROM politicians WHERE id = $1) AS holds_office
       FROM accountability_pathways ap
       LEFT JOIN offices o ON o.id = ap.office_id
      WHERE ap.office_id = (SELECT current_office_id FROM politicians WHERE id = $1)
         OR (ap.office_id IS NULL AND ap.jurisdiction_id = $2)
      ORDER BY ap.is_binding DESC, ap.mechanism_type`,
    [politicianId, COUNTY],
  );
  return {
    pathways: rows as Pathway[],
    holds_office: rows[0]?.holds_office ?? false,
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
                     WHERE s.campaign_id = c.id AND s.user_id = $2) AS supported
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
    support_count self-corrects from the per-user rows. */
export async function supportCampaign(campaignId: string, userId: string, tier: string) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO accountability_campaign_supports (campaign_id, user_id, verification_tier_at_support)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [campaignId, userId, tier],
    );
    await client.query(
      `UPDATE accountability_campaigns c SET support_count =
         (SELECT count(*) FROM accountability_campaign_supports s WHERE s.campaign_id = c.id)
       WHERE c.id = $1`,
      [campaignId],
    );
    await client.query("COMMIT");
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
  return { ok: true, id: rows[0].id as string };
}

/* ── creation-form data ── */
export async function creatableTargets() {
  const pathways = await db().query(
    `SELECT ap.id, ap.mechanism_type, ap.is_binding, ap.legal_citation, o.title AS office_title
       FROM accountability_pathways ap
       LEFT JOIN offices o ON o.id = ap.office_id
      WHERE ap.mechanism_type NOT IN ('no_removal_mechanism_exists')
      ORDER BY ap.is_binding DESC, o.title NULLS FIRST`,
  );
  const politicians = await db().query(
    `SELECT id, full_name, party FROM politicians ORDER BY full_name`,
  );
  return { pathways: pathways.rows, politicians: politicians.rows };
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

import { db } from "./db";

/* D3: outside money + endorsements (docs/DATA-OPS.md D3; ARCHITECTURE §8.1).
   Source decision (probed 2026-07-19): MDCRIS's public viewer is a JS shell
   with session-bound export XHR — scraping it is fragile, and county-level
   independent-expenditure volume is a handful of filings per cycle. So D3 is
   ADMIN-CURATED with a mandatory filing citation on every row: a trained
   human maps committee → candidate from the filing itself (the never-guess
   rule held by process instead of parser). Bulk automation stays a documented
   seam: SBE accepts bulk-data requests, and the MDCRIS XHR endpoints can be
   revisited when volume warrants. */

export async function adminAddExpenditure(opts: {
  committeeName: string;
  committeeType: string;
  registrationId?: string;
  raceId?: string;
  benefitsPoliticianId?: string;
  direction: "supporting" | "opposing";
  amountUsd: number;
  expenditureDate: string;
  purpose?: string;
  filingUrl: string;
  filingTitle?: string;
}): Promise<"ok" | "invalid"> {
  if (!opts.filingUrl || !opts.committeeName || !(opts.amountUsd > 0) || !opts.expenditureDate) return "invalid";
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT id FROM independent_expenditure_committees WHERE lower(name) = lower($1)`,
      [opts.committeeName.trim()],
    );
    let committeeId: string;
    if (existing.rowCount) {
      committeeId = existing.rows[0].id;
    } else {
      const ins = await client.query(
        `INSERT INTO independent_expenditure_committees (name, committee_type, registration_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [opts.committeeName.trim(), opts.committeeType, opts.registrationId || null],
      );
      committeeId = ins.rows[0].id;
    }
    const cit = await client.query(
      `INSERT INTO citations (url, archive_url, title, publisher, published_at)
       VALUES ($1, 'https://web.archive.org/web/' || $1, $2, 'MDCRIS / Maryland SBE filings', $3)
       RETURNING id`,
      [opts.filingUrl, opts.filingTitle || `Independent expenditure filing — ${opts.committeeName.trim()}`, opts.expenditureDate],
    );
    await client.query(
      `INSERT INTO independent_expenditures
         (committee_id, race_id, benefits_politician_id, direction, amount_usd, expenditure_date, purpose, citation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        committeeId,
        opts.raceId || null,
        opts.benefitsPoliticianId || null,
        opts.direction,
        opts.amountUsd,
        opts.expenditureDate,
        opts.purpose || null,
        cit.rows[0].id,
      ],
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

export async function adminAddEndorsement(opts: {
  orgName: string;
  orgType: string;
  candidacyId: string;
  endorsedAt?: string;
  sourceUrl: string;
  sourceTitle?: string;
}): Promise<"ok" | "invalid"> {
  if (!opts.sourceUrl || !opts.orgName || !opts.candidacyId) return "invalid";
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(`SELECT id FROM endorsing_organizations WHERE lower(name) = lower($1)`, [
      opts.orgName.trim(),
    ]);
    let orgId: string;
    if (existing.rowCount) {
      orgId = existing.rows[0].id;
    } else {
      const ins = await client.query(
        `INSERT INTO endorsing_organizations (name, org_type) VALUES ($1, $2) RETURNING id`,
        [opts.orgName.trim(), opts.orgType],
      );
      orgId = ins.rows[0].id;
    }
    const cit = await client.query(
      `INSERT INTO citations (url, archive_url, title, publisher, published_at)
       VALUES ($1, 'https://web.archive.org/web/' || $1, $2, split_part(regexp_replace($1, 'https?://', ''), '/', 1), $3)
       RETURNING id`,
      [opts.sourceUrl, opts.sourceTitle || `Endorsement announcement — ${opts.orgName.trim()}`, opts.endorsedAt || null],
    );
    await client.query(
      `INSERT INTO endorsements (organization_id, candidacy_id, endorsed_at, citation_id)
       VALUES ($1, $2, $3, $4)`,
      [orgId, opts.candidacyId, opts.endorsedAt || null, cit.rows[0].id],
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

/* ── admin console data ── */
export async function adminTransparencyData() {
  const candidacies = await db().query(
    `SELECT cd.id, pol.full_name, cd.party, o.title AS office
       FROM candidacies cd
       JOIN politicians pol ON pol.id = cd.politician_id
       JOIN races ra ON ra.id = cd.race_id
       JOIN offices o ON o.id = ra.office_id
      WHERE cd.status = 'active'
      ORDER BY o.title, pol.full_name`,
  );
  const racesQ = await db().query(
    `SELECT ra.id, o.title FROM races ra JOIN offices o ON o.id = ra.office_id ORDER BY o.title`,
  );
  const politicians = await db().query(`SELECT id, full_name FROM politicians ORDER BY full_name`);
  const recentExp = await db().query(
    `SELECT ie.amount_usd, ie.direction, ie.expenditure_date::text AS date, ie.purpose,
            c.name AS committee, pol.full_name AS politician, cit.url
       FROM independent_expenditures ie
       JOIN independent_expenditure_committees c ON c.id = ie.committee_id
       LEFT JOIN politicians pol ON pol.id = ie.benefits_politician_id
       JOIN citations cit ON cit.id = ie.citation_id
      ORDER BY ie.ingested_at DESC LIMIT 10`,
  );
  const recentEnd = await db().query(
    `SELECT org.name AS organization, pol.full_name AS politician, e.endorsed_at::text AS date, cit.url
       FROM endorsements e
       JOIN endorsing_organizations org ON org.id = e.organization_id
       JOIN candidacies cd ON cd.id = e.candidacy_id
       JOIN politicians pol ON pol.id = cd.politician_id
       JOIN citations cit ON cit.id = e.citation_id
      ORDER BY e.created_at DESC LIMIT 10`,
  );
  return {
    candidacies: candidacies.rows,
    races: racesQ.rows,
    politicians: politicians.rows,
    recentExp: recentExp.rows,
    recentEnd: recentEnd.rows,
  };
}

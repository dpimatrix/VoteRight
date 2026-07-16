-- VoteRight relational schema (PostgreSQL)
-- See ARCHITECTURE.md Section 5 for design rationale.
-- Requires: PostgreSQL 15+ (UNIQUE NULLS NOT DISTINCT); CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ══════════════════════════════════════════════════════════════
-- GEOGRAPHY & OFFICES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE jurisdictions (
    ocd_id          TEXT PRIMARY KEY,               -- e.g. 'ocd-division/country:us/state:md/county:montgomery'
    name            TEXT NOT NULL,
    level           TEXT NOT NULL CHECK (level IN ('country','state','county','municipal','school_district','special_district')),
    parent_ocd_id   TEXT REFERENCES jurisdictions(ocd_id),
    registered_voter_count INTEGER,                 -- refreshed periodically from official SBE stats; denominator for voter_mandates turnout_pct_of_registered
    registered_voter_count_as_of DATE
);

CREATE TABLE politicians (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       TEXT NOT NULL,
    bioguide_id     TEXT,                           -- Congress members only
    external_ids    JSONB NOT NULL DEFAULT '{}',     -- { "ballotready_id": "...", "ocd_person_id": "..." }
    current_office_id UUID,                         -- FK added after offices table exists; several politicians may share one office row (multi-seat at-large offices)
    party           TEXT,
    photo_url       TEXT,
    bio             TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE offices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id TEXT NOT NULL REFERENCES jurisdictions(ocd_id),
    title           TEXT NOT NULL,                  -- 'County Executive', 'Council District 1'
    seat_type       TEXT NOT NULL CHECK (seat_type IN ('single','at_large','district')),
    seat_count      SMALLINT NOT NULL DEFAULT 1,    -- >1 for multi-seat pools: Montgomery County Council elects 4 at-large members from one countywide contest
    term_length_years SMALLINT NOT NULL,
    is_partisan     BOOLEAN NOT NULL DEFAULT TRUE,
    level           TEXT NOT NULL CHECK (level IN ('federal','state','county','municipal','school_board','judicial'))
);

ALTER TABLE politicians
    ADD CONSTRAINT fk_politicians_current_office
    FOREIGN KEY (current_office_id) REFERENCES offices(id);

CREATE TABLE election_cycles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,                  -- '2026 Maryland Primary'
    election_date   DATE NOT NULL,
    election_type   TEXT NOT NULL CHECK (election_type IN ('primary','general','special','municipal'))
);

CREATE TABLE races (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_cycle_id   UUID NOT NULL REFERENCES election_cycles(id),
    office_id           UUID NOT NULL REFERENCES offices(id),
    seats_elected       SMALLINT NOT NULL DEFAULT 1,    -- how many candidacies can end 'won': 4 for the at-large Council contest
    UNIQUE (election_cycle_id, office_id)
);

-- incumbency is a join table, not a singular column on races — a multi-seat at-large
-- contest (the pilot county's own Council) has several sitting incumbents at once
CREATE TABLE race_incumbents (
    race_id         UUID NOT NULL REFERENCES races(id),
    politician_id   UUID NOT NULL REFERENCES politicians(id),
    PRIMARY KEY (race_id, politician_id)
);

CREATE TABLE candidacies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id   UUID NOT NULL REFERENCES politicians(id),
    race_id         UUID NOT NULL REFERENCES races(id),
    party           TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','withdrawn','won','lost')),
    website         TEXT,
    social_links    JSONB NOT NULL DEFAULT '{}',
    UNIQUE (politician_id, race_id)
);

-- ══════════════════════════════════════════════════════════════
-- ISSUES & VOTER INTENT
-- ══════════════════════════════════════════════════════════════

CREATE TABLE topics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    parent_id       UUID REFERENCES topics(id),
    description     TEXT,
    UNIQUE NULLS NOT DISTINCT (parent_id, name)     -- no duplicate topics at the same level, including top level (PostgreSQL 15+)
);

CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id                 TEXT NOT NULL UNIQUE,     -- external auth provider subject
    display_name            TEXT,
    email_hash              TEXT,                     -- hashed, not raw, if collected at all — pseudonymous, NOT anonymous: emails are dictionary-attackable (Section 10)
    residence_jurisdiction_id TEXT REFERENCES jurisdictions(ocd_id),  -- self-attested + address-format verified
    verification_tier      TEXT NOT NULL DEFAULT 'unverified'
                              CHECK (verification_tier IN ('unverified','email_verified','address_verified','govt_id_verified')),
    locale                  TEXT NOT NULL DEFAULT 'en',
    deleted_at              TIMESTAMPTZ,              -- MODPA deletion request: row is pseudonymized (auth_id tombstoned, display_name/email_hash cleared), not physically removed — see ARCHITECTURE.md Section 10
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE voter_priorities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    topic_id        UUID NOT NULL REFERENCES topics(id),
    statement       TEXT NOT NULL,                    -- the voter's own words: their wish/objective
    importance_weight SMALLINT NOT NULL CHECK (importance_weight BETWEEN 1 AND 5),
    stance          JSONB,                             -- optional structured position, e.g. { "direction": "support", "policy": "rent_stabilization" }
    visibility      TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','anonymous_aggregate','public')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- EVIDENCE LEDGER (shared by positions, promises, integrity flags)
-- ══════════════════════════════════════════════════════════════

-- One url may legitimately back several rows (different excerpts of the same page for
-- different claims), so there is deliberately no UNIQUE(url); dedup is an ingestion concern.
-- archive_url is nullable at ingest, but the publish workflows for integrity flags and
-- promise status changes require an archived copy before anything goes public (Section 2.3).
CREATE TABLE citations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url             TEXT NOT NULL,
    archive_url     TEXT,                             -- Wayback Machine snapshot, captured at ingestion time
    title           TEXT,
    publisher       TEXT,
    published_at    DATE,
    retrieved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    excerpt         TEXT
);

CREATE TABLE politician_positions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id   UUID NOT NULL REFERENCES politicians(id),
    topic_id        UUID NOT NULL REFERENCES topics(id),
    statement       TEXT NOT NULL,
    source_type     TEXT NOT NULL CHECK (source_type IN ('campaign_site','questionnaire','debate_transcript','voting_record_inferred','interview')),
    citation_id     UUID REFERENCES citations(id),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE promises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id   UUID NOT NULL REFERENCES politicians(id),
    topic_id        UUID NOT NULL REFERENCES topics(id),
    statement       TEXT NOT NULL,
    made_at         DATE,
    origin_citation_id UUID REFERENCES citations(id),
    current_status  TEXT NOT NULL DEFAULT 'pending'
                      CHECK (current_status IN ('pending','in_progress','kept','broken','compromised','stalled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- append-only history so a status is always explainable, never just overwritten
CREATE TABLE promise_status_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promise_id      UUID NOT NULL REFERENCES promises(id),
    status          TEXT NOT NULL CHECK (status IN ('pending','in_progress','kept','broken','compromised','stalled')),
    citation_id     UUID REFERENCES citations(id),
    note            TEXT,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE voting_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id   UUID NOT NULL REFERENCES politicians(id),
    jurisdiction_id TEXT NOT NULL REFERENCES jurisdictions(ocd_id),
    bill_external_id TEXT NOT NULL,                   -- id in source system (OpenStates/LegiScan/Legistar/Congress.gov)
    bill_title      TEXT NOT NULL,
    vote            TEXT NOT NULL CHECK (vote IN ('yea','nay','abstain','absent')),
    voted_at        DATE NOT NULL,
    source_url      TEXT NOT NULL,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (politician_id, bill_external_id)
);

-- ══════════════════════════════════════════════════════════════
-- TRANSPARENCY: OUTSIDE MONEY, BALLOT-AUTHENTICITY CHECKS & ENDORSEMENTS
-- Generalizes three feature gaps identified from local reporting patterns
-- (independent-expenditure disclosure, "is this the real ballot?" mailer
-- confusion, endorsement tracking) into sourced platform capabilities fed
-- by official filings — never by any single commentator's specific claims.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE independent_expenditure_committees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    committee_type  TEXT NOT NULL CHECK (committee_type IN
                      ('super_pac','slate_mailer_committee','ballot_issue_committee','party_committee','other')),
    registration_id TEXT,                        -- filer ID with the state/county board of elections
    external_ids    JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE independent_expenditures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_id    UUID NOT NULL REFERENCES independent_expenditure_committees(id),
    race_id         UUID REFERENCES races(id),
    benefits_politician_id UUID REFERENCES politicians(id),   -- nullable: may target a ballot measure instead
    direction       TEXT NOT NULL CHECK (direction IN ('supporting','opposing')),
    amount_usd      NUMERIC(12,2) NOT NULL,
    expenditure_date DATE NOT NULL,
    purpose         TEXT,                         -- e.g. 'digital ads', 'mailers'
    citation_id     UUID NOT NULL REFERENCES citations(id),   -- the campaign-finance filing itself; never bare assertion
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- lets a user check a suspicious mailer/robocall/flyer against a sourced finding of
-- whether it's an actual official ballot, rather than relying on any one report of
-- any one mailer — generalizes the "styled like an official sample ballot" problem
CREATE TABLE campaign_communications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by_user_id UUID REFERENCES users(id),     -- null if staff/system-ingested
    jurisdiction_id TEXT NOT NULL REFERENCES jurisdictions(ocd_id),
    communication_type TEXT NOT NULL CHECK (communication_type IN
                      ('mailer','flyer','robocall','text_message','digital_ad','other')),
    title           TEXT NOT NULL,                -- e.g. '"Democratic Team" sample ballot mailer'
    image_or_media_url TEXT,                       -- photo/scan of the item, our object storage
    claimed_authority TEXT,                        -- what the item itself claims to be, e.g. 'Official Sample Ballot'
    actual_sponsor  TEXT,                          -- who actually paid for it, per campaign-finance disclosure
    is_official_ballot BOOLEAN,                           -- verified fact, not the submitter's opinion — NULL until verification resolves it
    verification_status TEXT NOT NULL DEFAULT 'unverified'
                      CHECK (verification_status IN ('unverified','verified_unofficial','verified_official','disputed')),
    citation_id     UUID REFERENCES citations(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- both gates are constraints, not comments: no verified finding without a source,
    -- and no is_official_ballot verdict while the row is still unverified
    CHECK (verification_status = 'unverified' OR citation_id IS NOT NULL),
    CHECK (verification_status <> 'unverified' OR is_official_ballot IS NULL)
);

CREATE TABLE endorsing_organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,                 -- e.g. 'Greater Capital Area Association of Realtors'
    org_type        TEXT NOT NULL CHECK (org_type IN
                      ('union','trade_association','advocacy_group','editorial_board','party_organization','elected_official','other')),
    external_ids    JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE endorsements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES endorsing_organizations(id),
    candidacy_id    UUID NOT NULL REFERENCES candidacies(id),
    endorsed_at     DATE,
    citation_id     UUID NOT NULL REFERENCES citations(id),   -- an endorsement claim always needs a source
    rescinded       BOOLEAN NOT NULL DEFAULT FALSE,
    rescinded_at    DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- ALIGNMENT SCORING
-- ══════════════════════════════════════════════════════════════

CREATE TABLE alignment_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    candidacy_id    UUID NOT NULL REFERENCES candidacies(id),
    overall_score   NUMERIC(5,2) NOT NULL,             -- 0.00–100.00
    topic_breakdown JSONB NOT NULL,                     -- [{ topic_id, score, weight_used }]
    algorithm_version TEXT NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, candidacy_id, algorithm_version)
);

-- ══════════════════════════════════════════════════════════════
-- INTEGRITY & ACCOUNTABILITY (see ARCHITECTURE.md Section 2.1-2.3 before touching this)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE integrity_flags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id   UUID NOT NULL REFERENCES politicians(id),
    promise_id      UUID REFERENCES promises(id),
    raised_by_user_id UUID REFERENCES users(id),        -- null = system-generated from voting-record contradiction
    description     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','upheld','dismissed','disputed')),  -- current status; see integrity_flag_status_events for the append-only trail behind it
    published       BOOLEAN NOT NULL DEFAULT FALSE,      -- only TRUE once dispute workflow clears it
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ,
    -- the publish gate is a constraint, not a comment: a flag still in dispute can never be public
    CHECK (NOT published OR status <> 'open')
);

-- append-only history for the single most defamation-exposed object in the schema —
-- status was previously a bare mutable column here, inconsistent with the same
-- "always shows its work" principle already applied to promise_status_events.
CREATE TABLE integrity_flag_status_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integrity_flag_id UUID NOT NULL REFERENCES integrity_flags(id),
    status          TEXT NOT NULL CHECK (status IN ('open','upheld','dismissed','disputed')),
    citation_id     UUID REFERENCES citations(id),
    note            TEXT,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE integrity_flag_citations (
    integrity_flag_id UUID NOT NULL REFERENCES integrity_flags(id),
    citation_id       UUID NOT NULL REFERENCES citations(id),
    PRIMARY KEY (integrity_flag_id, citation_id)
);

-- jurisdiction-real accountability options. Populated by hand, from actual charter/statute text.
CREATE TABLE accountability_pathways (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id TEXT NOT NULL REFERENCES jurisdictions(ocd_id),
    office_id       UUID REFERENCES offices(id),        -- NULL for jurisdiction-wide mechanisms: the charter-amendment petition belongs to the county, not to any one office
    mechanism_type  TEXT NOT NULL CHECK (mechanism_type IN
                      ('next_election_defeat','primary_challenge_support','supermajority_council_removal',
                       'impeachment','criminal_referral','municipal_recall','charter_amendment_petition',
                       'no_removal_mechanism_exists')),
    is_binding      BOOLEAN NOT NULL,
    legal_citation  TEXT NOT NULL,                      -- e.g. 'Montgomery County Charter Section 201', 'Md. Const. Art. XI-A'
    signature_requirement_note TEXT,                    -- petition-type mechanisms only, e.g. '20% of registered voters, or 10,000 signatures, whichever is fewer'
    description     TEXT NOT NULL,
    -- every officeholder mechanism needs its office; only the jurisdiction-wide
    -- charter-amendment petition may float free of one
    CHECK (office_id IS NOT NULL OR mechanism_type = 'charter_amendment_petition')
);

-- A campaign targets either a politician (accountability for a person) or a law/charter
-- change (e.g. organizing support to petition for a recall provision that doesn't yet exist).
-- These are different objects with a different shape, so target_type is a real discriminator,
-- not a label — the CHECK enforces that exactly one target is populated.
CREATE TABLE accountability_campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pathway_id      UUID NOT NULL REFERENCES accountability_pathways(id),
    target_type     TEXT NOT NULL CHECK (target_type IN ('politician','charter_or_law_change')),
    politician_id   UUID REFERENCES politicians(id),         -- required when target_type = 'politician'
    reform_title    TEXT,                                    -- required when target_type = 'charter_or_law_change', e.g. 'Add recall provision to Montgomery County Charter'
    originating_referendum_id UUID,                          -- FK to referenda(id) added below, after that table exists
    initiated_by_user_id UUID NOT NULL REFERENCES users(id),
    description     TEXT NOT NULL,
    support_count   INTEGER NOT NULL DEFAULT 0,               -- in-app support only — NOT a legal petition signature count
    status          TEXT NOT NULL DEFAULT 'gathering_support'
                      CHECK (status IN ('gathering_support','threshold_met','submitted_to_authority','closed')),
    external_petition_status TEXT DEFAULT 'not_applicable'
                      CHECK (external_petition_status IN
                        ('not_applicable','not_started','gathering_signatures',
                         'submitted_to_board_of_elections','certified','on_ballot','failed_certification')),
    disclosure_text TEXT NOT NULL,                       -- auto-populated, non-editable: what this is / is not
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
      (target_type = 'politician' AND politician_id IS NOT NULL AND reform_title IS NULL)
      OR
      (target_type = 'charter_or_law_change' AND reform_title IS NOT NULL AND politician_id IS NULL)
    )
);

-- ══════════════════════════════════════════════════════════════
-- DIRECT DEMOCRACY LAYER
-- ══════════════════════════════════════════════════════════════

CREATE TABLE issue_proposals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    jurisdiction_id TEXT NOT NULL REFERENCES jurisdictions(ocd_id),
    topic_id        UUID NOT NULL REFERENCES topics(id),
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    second_threshold INTEGER NOT NULL,                   -- scaled to jurisdiction population
    status          TEXT NOT NULL DEFAULT 'seconding'
                      CHECK (status IN ('seconding','debating','referendum','closed','rejected')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE seconds (
    proposal_id     UUID NOT NULL REFERENCES issue_proposals(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    verification_tier_at_second TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (proposal_id, user_id)
);

-- ══════════════════════════════════════════════════════════════
-- ROBERT'S RULES OVERLAY, PART 1: AMENDMENTS
-- See ARCHITECTURE.md Section 7.6 for which RONR concepts do and don't transfer
-- to async, internet-scale debate. A proposed revision to a main proposal,
-- itself requiring its own seconds before adoption — mirrors RONR: an
-- amendment must be seconded and decided before the main motion proceeds.
-- App-layer rule (not expressible as a simple CHECK): an amendment may only
-- be proposed while issue_proposals.status IN ('seconding','debating') —
-- never once a referendum has been scheduled.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE proposal_amendments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id     UUID NOT NULL REFERENCES issue_proposals(id),
    proposed_by_user_id UUID NOT NULL REFERENCES users(id),
    amended_title   TEXT,
    amended_body    TEXT NOT NULL,
    rationale       TEXT,
    second_threshold INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'proposed'
                      CHECK (status IN ('proposed','adopted','rejected','withdrawn')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE TABLE amendment_seconds (
    amendment_id    UUID NOT NULL REFERENCES proposal_amendments(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    verification_tier_at_second TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (amendment_id, user_id)
);

-- original title/body stay untouched (append-only, same pattern as promise_status_events) —
-- this points to whichever amendment is currently adopted, if any, so the debate always
-- shows both the original text and what it was amended to.
ALTER TABLE issue_proposals ADD COLUMN current_amendment_id UUID REFERENCES proposal_amendments(id);

CREATE TABLE forum_threads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id     UUID NOT NULL UNIQUE REFERENCES issue_proposals(id),
    opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    closes_at       TIMESTAMPTZ NOT NULL,
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    -- ROBERT'S RULES OVERLAY, PART 2: CALLING THE QUESTION —
    -- a supermajority of a thread's active participants can force debate to
    -- close early rather than wait out closes_at, once it's clearly stalled.
    -- Threshold is a real column, not a hardcoded constant, so it's disclosed
    -- and auditable the same way algorithm_version is elsewhere.
    close_early_threshold_pct NUMERIC(4,1) NOT NULL DEFAULT 66.7,   -- RONR default: 2/3
    closed_early    BOOLEAN NOT NULL DEFAULT FALSE,
    closed_early_at TIMESTAMPTZ,
    -- eligibility floor for "active participant" in the denominator/electorate of the above:
    -- a single one-click agreement vote is too cheap a bar to let someone help force early
    -- closure, so an agreement-vote-only participant needs this many DISTINCT agreement
    -- votes in the thread; posting at least one argument always qualifies on its own.
    call_the_question_min_agreement_votes INTEGER NOT NULL DEFAULT 3
);

-- one vote per active participant (anyone who has posted an argument or cast an
-- agreement vote in the thread) toward closing debate early
CREATE TABLE call_the_question_votes (
    thread_id       UUID NOT NULL REFERENCES forum_threads(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (thread_id, user_id)
);

-- format is a real discriminator: exactly one media field must be populated per format,
-- enforced below rather than left to application code, since a debate argument with no
-- content is a moderation and integrity gap, not just a UI bug.
CREATE TABLE arguments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID NOT NULL REFERENCES forum_threads(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    side            TEXT NOT NULL CHECK (side IN ('for','against','neutral_info')),
    format          TEXT NOT NULL CHECK (format IN ('text','audio','video','youtube')),
    body_text       TEXT,
    audio_url       TEXT,
    video_url       TEXT,                                -- locally recorded/uploaded video, in our object storage
    video_duration_seconds INTEGER,
    video_size_bytes BIGINT,                              -- enforced against platform max_video_size_bytes at upload (TBD — see ARCHITECTURE.md Section 9.1)
    youtube_video_id TEXT,                                -- parsed from submitted URL; embedded via YouTube's own player, never downloaded/re-hosted
    youtube_metadata JSONB,                               -- cached title/channel/duration/thumbnail via YouTube Data API, refreshed periodically for link-rot detection
    transcript_text TEXT,                                 -- required for 'audio' and 'video' (our own STT pipeline); NOT auto-generated for 'youtube' — see 9.1
    parent_argument_id UUID REFERENCES arguments(id),     -- rebuttal chain
    moderation_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (moderation_status IN ('pending','approved','removed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
      (format = 'text' AND body_text IS NOT NULL)
      OR (format = 'audio' AND audio_url IS NOT NULL)
      OR (format = 'video' AND video_url IS NOT NULL)
      OR (format = 'youtube' AND youtube_video_id IS NOT NULL)
    )
);

CREATE TABLE argument_citations (
    argument_id     UUID NOT NULL REFERENCES arguments(id),
    citation_id     UUID NOT NULL REFERENCES citations(id),
    PRIMARY KEY (argument_id, citation_id)
);

CREATE TABLE argument_ratings (
    argument_id     UUID NOT NULL REFERENCES arguments(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    rating          TEXT NOT NULL CHECK (rating IN ('helpful','not_helpful','needs_sources')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (argument_id, user_id)
);

-- ══════════════════════════════════════════════════════════════
-- DEBATE SCALING: NEAR-DUPLICATE CLUSTERING & OPINION MAPPING
-- See ARCHITECTURE.md Section 7.5 for how these are computed and displayed.
-- ══════════════════════════════════════════════════════════════

-- Groups near-duplicate arguments on the same side of a thread under one point, so a
-- popular thread reduces to its distinct claims instead of an unreadable flat feed —
-- and so moderation reviews a representative once instead of every restatement of it.
CREATE TABLE argument_clusters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID NOT NULL REFERENCES forum_threads(id),
    side            TEXT NOT NULL CHECK (side IN ('for','against','neutral_info')),
    representative_argument_id UUID REFERENCES arguments(id),  -- best-sourced/highest-rated member
    summary         TEXT NOT NULL,                 -- short synthesis of the shared point
    member_count    INTEGER NOT NULL DEFAULT 0,
    algorithm_version TEXT NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE arguments ADD COLUMN cluster_id UUID REFERENCES argument_clusters(id);

-- Per-statement agree/disagree signal, distinct from posting a rebuttal — the raw
-- material opinion_clusters below is computed from (Pol.is-style: cluster users by
-- the similarity of their agree/disagree pattern across many statements, not by text).
CREATE TABLE argument_agreement_votes (
    argument_id     UUID NOT NULL REFERENCES arguments(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    response        TEXT NOT NULL CHECK (response IN ('agree','disagree','pass')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (argument_id, user_id)
);

-- PARTICIPATION PRIVACY (see ARCHITECTURE.md Section 10.2): per-user agreement votes are a
-- political-opinion ledger, held only while the thread needs them (open debate window +
-- opinion-cluster recomputation + audit window), then DELETED. What survives them: the
-- denormalized per-argument tallies below, and the final opinion_clusters snapshots —
-- neither contains a user identity. call_the_question_votes rows are likewise deleted
-- once a thread closes; only the recorded outcome on forum_threads persists.
ALTER TABLE arguments ADD COLUMN agree_count    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE arguments ADD COLUMN disagree_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE arguments ADD COLUMN pass_count     INTEGER NOT NULL DEFAULT 0;

-- "Camps" of opinion within a thread — recomputed periodically as the agreement-vote
-- matrix grows, not a fixed schema concept. A prior snapshot is superseded, not edited,
-- by inserting a new row with a later computed_at (append pattern, same as promise history).
CREATE TABLE opinion_clusters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID NOT NULL REFERENCES forum_threads(id),
    computation_run_id UUID NOT NULL,                -- groups every cluster produced by one batch, so a snapshot is addressable as a set rather than by matching timestamps
    label           TEXT,                            -- human-assigned once a camp stabilizes; else 'Cluster A' etc.
    member_user_count INTEGER NOT NULL,
    representative_argument_ids JSONB NOT NULL,       -- statements that most distinguish this camp
    bridging_argument_ids JSONB,                      -- statements most camps agree on despite an overall split
    algorithm_version TEXT NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prompts for a citation on a specific unsourced factual assertion within an argument,
-- at submission time — deliberately NOT a generic "this is opinion, rephrase to be
-- objective" classifier. A debate needs opinions; the gap this closes is a bare claim
-- of fact ("this will cost $907/year") presented with no source. Always dismissible;
-- never blocks submission. See ARCHITECTURE.md Section 7.7.
CREATE TABLE argument_claim_flags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    argument_id     UUID NOT NULL REFERENCES arguments(id),
    claim_text      TEXT NOT NULL,                -- the specific span/sentence flagged as a factual assertion
    detection_method TEXT NOT NULL DEFAULT 'model' CHECK (detection_method IN ('model','human_review')),
    algorithm_version TEXT,
    prompted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    author_response TEXT NOT NULL DEFAULT 'pending'
                      CHECK (author_response IN ('pending','added_citation','marked_as_opinion','dismissed')),
    resulting_citation_id UUID REFERENCES citations(id)   -- populated if author_response = 'added_citation'
);

-- ══════════════════════════════════════════════════════════════
-- AI DEBATE AGENTS: one-shot, evidence-grounded, imbalance-triggered.
-- See ARCHITECTURE.md Section 7.8. Generates a single steel-manned
-- argument for whichever side is thin, from citations already in (or
-- newly researched into) the evidence ledger — never a running AI-vs-AI
-- debate loop, and always disclosed as machine-authored. Held to a
-- HARD sourcing requirement (fully_sourced) that humans are never held
-- to in Section 7.7 — a claim-detection nudge is right for protected
-- human opinion, but an AI tool explicitly pitched as evidence-grounded
-- analysis can and should be required to back every factual sentence.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE ai_debate_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID NOT NULL REFERENCES forum_threads(id),
    side_generated  TEXT NOT NULL CHECK (side_generated IN ('for','against')),
    trigger_reason  TEXT NOT NULL CHECK (trigger_reason IN ('side_imbalance','staff_requested')),
    triggered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    model_version   TEXT NOT NULL,
    prompt_version  TEXT NOT NULL,
    grounding_citation_ids JSONB NOT NULL DEFAULT '[]',   -- every citation used, pre-existing or freshly researched by the agent
    fully_sourced   BOOLEAN NOT NULL,                     -- machine-checked: every factual sentence maps to a citation
    status          TEXT NOT NULL DEFAULT 'completed'
                      CHECK (status IN ('completed','failed_sourcing_check','withdrawn')),
    disclosure_text TEXT NOT NULL DEFAULT
      'Generated by an AI system from sourced material, not submitted by a person. Not a substitute for a human voice in this debate.',
    resulting_argument_id UUID REFERENCES arguments(id)
);

-- an argument is now authored by a human OR by an AI debate run — never both,
-- and an AI-authored argument always traces back to the run that produced it
ALTER TABLE arguments ADD COLUMN author_type TEXT NOT NULL DEFAULT 'human' CHECK (author_type IN ('human','ai_agent'));
ALTER TABLE arguments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE arguments ADD COLUMN ai_debate_run_id UUID REFERENCES ai_debate_runs(id);
ALTER TABLE arguments ADD CONSTRAINT chk_arguments_author_type CHECK (
  (author_type = 'human' AND user_id IS NOT NULL AND ai_debate_run_id IS NULL)
  OR
  (author_type = 'ai_agent' AND ai_debate_run_id IS NOT NULL AND user_id IS NULL)
);

CREATE TABLE referenda (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id     UUID NOT NULL UNIQUE REFERENCES issue_proposals(id),
    question_text   TEXT NOT NULL,
    options         JSONB NOT NULL DEFAULT '["yes","no"]',
    opens_at        TIMESTAMPTZ NOT NULL,
    closes_at       TIMESTAMPTZ NOT NULL,
    eligibility_jurisdiction_id TEXT NOT NULL REFERENCES jurisdictions(ocd_id),
    status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','open','closed','published')),
    disclosure_text TEXT NOT NULL DEFAULT
      'This is an unofficial, advisory poll. It has no legal effect and is not an official ballot.'
);

ALTER TABLE accountability_campaigns
    ADD CONSTRAINT fk_accountability_campaigns_referendum
    FOREIGN KEY (originating_referendum_id) REFERENCES referenda(id);

-- BALLOT SECRECY: identity (who voted, enforcing one-person-one-vote and eligibility
-- weighting) and choice (what they voted) are deliberately split across two tables,
-- rather than one referendum_votes row holding user_id + choice together forever.
-- The join key between them (ballot_token_id -> referendum_ballot_tokens.id -> user_id)
-- is real and queryable until the post-certification retention window nulls the
-- token's user_id — this is a link deliberately SEVERED by redaction, not one that's
-- absent from day one. See ARCHITECTURE.md Section 10.1 for the retention rule and
-- the honest limits of this as "practical secrecy" rather than a cryptographic
-- e-voting guarantee.
CREATE TABLE referendum_ballot_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referendum_id   UUID NOT NULL REFERENCES referenda(id),
    user_id         UUID REFERENCES users(id),            -- nulled out after the post-certification retention window
    verification_tier_at_issuance TEXT NOT NULL,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    redeemed_at     TIMESTAMPTZ,                           -- set once the token has been used to cast a ballot; a token can only be redeemed once
    UNIQUE (referendum_id, user_id)
);

-- deliberately has NO user_id column — a ballot is identified only by which
-- (single-use) token redeemed it, never by who that token was issued to
CREATE TABLE referendum_ballots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referendum_id   UUID NOT NULL REFERENCES referenda(id),
    ballot_token_id UUID NOT NULL UNIQUE REFERENCES referendum_ballot_tokens(id),
    choice          TEXT NOT NULL,
    cast_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- choice must be one of the referendum's declared options — a cross-table rule, so it's a
-- trigger rather than a CHECK; a case-variant or garbage write would otherwise silently
-- corrupt the tally every voter_mandate downstream depends on
CREATE FUNCTION enforce_ballot_choice() RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM referenda r
        WHERE r.id = NEW.referendum_id
          AND NEW.choice IN (SELECT jsonb_array_elements_text(r.options))
    ) THEN
        RAISE EXCEPTION 'ballot choice "%" is not among the options of referendum %', NEW.choice, NEW.referendum_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_referendum_ballots_valid_choice
    BEFORE INSERT OR UPDATE OF choice, referendum_id ON referendum_ballots
    FOR EACH ROW EXECUTE FUNCTION enforce_ballot_choice();

CREATE TABLE voter_mandates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referendum_id   UUID NOT NULL UNIQUE REFERENCES referenda(id),
    office_id       UUID REFERENCES offices(id),           -- which officeholder's scorecard this overlays, if any
    mandate_summary TEXT NOT NULL,
    turnout_count   INTEGER NOT NULL,
    margin_pct      NUMERIC(5,2) NOT NULL,
    -- PUBLISH LEGITIMACY GATE — a mandate from a handful of self-selected app users
    -- should not carry the same public presentation as one with real turnout. This is
    -- a real gate, not just a disclaimer: overlay_status cannot be 'published' unless
    -- meets_publish_threshold is true, enforced by the CHECK below.
    turnout_pct_of_registered NUMERIC(6,3),                -- turnout_count / jurisdictions.registered_voter_count, computed at publish time
    publish_threshold_pct NUMERIC(5,2) NOT NULL DEFAULT 1.0,  -- minimum turnout %, tunable per jurisdiction size like close_early_threshold_pct
    meets_publish_threshold BOOLEAN NOT NULL DEFAULT FALSE,
    overlay_status  TEXT NOT NULL DEFAULT 'below_threshold_unpublished'
                      CHECK (overlay_status IN ('below_threshold_unpublished','published','acknowledged_by_office','addressed','ignored')),
    published_at    TIMESTAMPTZ,
    CHECK (overlay_status = 'below_threshold_unpublished' OR meets_publish_threshold = TRUE)
);

-- MANDATE → CANDIDACY → PROMISE loop (see ARCHITECTURE.md Section 7.9). The point of a
-- published mandate is to be carried out, not just displayed: every candidacy in the next
-- race for the mandate's office is asked to take a public, sourced position on each
-- standing mandate BEFORE the election — so a candidate can no longer coast on name
-- recognition while privately intending to ignore what voters actually asked for. A
-- 'commit' from the eventual winner becomes a promises row, which the existing
-- promise-tracking machinery then holds them to.
CREATE TABLE mandate_commitments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_mandate_id UUID NOT NULL REFERENCES voter_mandates(id),
    candidacy_id    UUID NOT NULL REFERENCES candidacies(id),
    stance          TEXT NOT NULL DEFAULT 'no_response'
                      CHECK (stance IN ('commit','decline','no_response')),
    statement       TEXT,                                 -- the candidate's own words, if any
    citation_id     UUID REFERENCES citations(id),        -- the candidate's public statement, on the record
    resulting_promise_id UUID REFERENCES promises(id),    -- populated when a committed candidate wins
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (voter_mandate_id, candidacy_id),
    -- an attributed stance is a factual claim about a named candidate — it needs a source;
    -- 'no_response' is the only stance the platform may assert without one
    CHECK (stance = 'no_response' OR citation_id IS NOT NULL)
);

-- ══════════════════════════════════════════════════════════════
-- TRUST & IDENTITY
-- ══════════════════════════════════════════════════════════════

CREATE TABLE verification_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    method          TEXT NOT NULL CHECK (method IN ('address_attestation','third_party_id_check')),
    provider_reference TEXT,                              -- opaque token from vendor, never raw ID/doc
    verified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ
);

-- ══════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════

CREATE INDEX idx_offices_jurisdiction ON offices(jurisdiction_id);
CREATE INDEX idx_candidacies_race ON candidacies(race_id);
CREATE INDEX idx_voter_priorities_user ON voter_priorities(user_id);
CREATE INDEX idx_voter_priorities_topic ON voter_priorities(topic_id);
CREATE INDEX idx_politician_positions_politician ON politician_positions(politician_id);
CREATE INDEX idx_promises_politician ON promises(politician_id);
CREATE INDEX idx_promise_status_events_promise ON promise_status_events(promise_id);
CREATE INDEX idx_voting_records_politician ON voting_records(politician_id);
CREATE INDEX idx_alignment_scores_user ON alignment_scores(user_id);
CREATE INDEX idx_integrity_flags_politician ON integrity_flags(politician_id);
CREATE INDEX idx_integrity_flag_status_events_flag ON integrity_flag_status_events(integrity_flag_id);
CREATE INDEX idx_issue_proposals_jurisdiction ON issue_proposals(jurisdiction_id);
CREATE INDEX idx_arguments_thread ON arguments(thread_id);
CREATE INDEX idx_referendum_ballot_tokens_referendum ON referendum_ballot_tokens(referendum_id);
CREATE INDEX idx_referendum_ballots_referendum ON referendum_ballots(referendum_id);
CREATE INDEX idx_accountability_campaigns_politician ON accountability_campaigns(politician_id) WHERE politician_id IS NOT NULL;
CREATE INDEX idx_accountability_campaigns_pathway ON accountability_campaigns(pathway_id);
CREATE INDEX idx_arguments_cluster ON arguments(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_argument_clusters_thread ON argument_clusters(thread_id);
CREATE INDEX idx_argument_agreement_votes_argument ON argument_agreement_votes(argument_id);
CREATE INDEX idx_opinion_clusters_thread ON opinion_clusters(thread_id);
CREATE INDEX idx_proposal_amendments_proposal ON proposal_amendments(proposal_id);
CREATE INDEX idx_amendment_seconds_amendment ON amendment_seconds(amendment_id);
CREATE INDEX idx_call_the_question_votes_thread ON call_the_question_votes(thread_id);
CREATE INDEX idx_independent_expenditures_politician ON independent_expenditures(benefits_politician_id) WHERE benefits_politician_id IS NOT NULL;
CREATE INDEX idx_independent_expenditures_race ON independent_expenditures(race_id);
CREATE INDEX idx_campaign_communications_jurisdiction ON campaign_communications(jurisdiction_id);
CREATE INDEX idx_endorsements_candidacy ON endorsements(candidacy_id);
CREATE INDEX idx_endorsements_organization ON endorsements(organization_id);
CREATE INDEX idx_argument_claim_flags_argument ON argument_claim_flags(argument_id);
CREATE INDEX idx_ai_debate_runs_thread ON ai_debate_runs(thread_id);
CREATE INDEX idx_arguments_ai_debate_run ON arguments(ai_debate_run_id) WHERE ai_debate_run_id IS NOT NULL;
CREATE INDEX idx_arguments_parent ON arguments(parent_argument_id) WHERE parent_argument_id IS NOT NULL;
CREATE INDEX idx_promises_topic ON promises(topic_id);
CREATE INDEX idx_race_incumbents_politician ON race_incumbents(politician_id);
CREATE INDEX idx_mandate_commitments_mandate ON mandate_commitments(voter_mandate_id);
CREATE INDEX idx_mandate_commitments_candidacy ON mandate_commitments(candidacy_id);

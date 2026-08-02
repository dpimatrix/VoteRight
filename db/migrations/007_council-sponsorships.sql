-- Council-sponsorship evidence: who introduced/co-sponsored a real agenda
-- item, with a link to the exact video moment and the staff report --
-- verified live against Montgomery County's Granicus AgendaViewer
-- (montgomerycountymd.granicus.com, view_id=169) 2026-08-01. Displayed as
-- its own citation card, same as voting_records -- NOT fed into
-- politician_positions/scoring in this pass (no topic-coding workflow
-- exists yet to responsibly assign a sponsored bill to a policy axis).
CREATE TABLE council_sponsorships (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id           UUID NOT NULL REFERENCES politicians(id),
    jurisdiction_id         TEXT NOT NULL REFERENCES jurisdictions(ocd_id),
    role                    TEXT NOT NULL CHECK (role IN ('lead_sponsor','co_sponsor')),
    clip_id                 TEXT NOT NULL,     -- Granicus clip id for the full meeting
    agenda_item_external_id TEXT NOT NULL,     -- Granicus meta_id -- unique per agenda item
    meeting_date            DATE NOT NULL,
    item_title              TEXT NOT NULL,
    video_url               TEXT NOT NULL,     -- MediaPlayer.php jump link for this item
    staff_report_url        TEXT,              -- not every item has one
    ingested_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (politician_id, agenda_item_external_id)
);

CREATE INDEX idx_council_sponsorships_politician ON council_sponsorships(politician_id);

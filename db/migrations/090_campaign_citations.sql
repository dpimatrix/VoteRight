-- Accountability campaign citations (2026-08-23). Owner asked directly:
-- the campaign description placeholder ("What should happen, and why?
-- Cite the record.") has always asked for a citation, but there was never
-- anywhere structured to put one -- just the free-text description, no
-- link to this app's shared citations ledger the way DebateComposer's
-- arguments already have (argument_citations). Mirrors that table exactly.
CREATE TABLE campaign_citations (
    campaign_id     UUID NOT NULL REFERENCES accountability_campaigns(id),
    citation_id     UUID NOT NULL REFERENCES citations(id),
    PRIMARY KEY (campaign_id, citation_id)
);

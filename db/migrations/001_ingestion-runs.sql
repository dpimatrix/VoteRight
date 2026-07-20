-- Ingestion ledger (docs/DATA-OPS.md §6): one row per automated run, drives the
-- admin freshness panel and the voter-facing "data current through" stamps.
CREATE TABLE ingestion_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source          TEXT NOT NULL,                        -- 'moco-council-bills' etc.
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed')),
    rows_upserted   INTEGER NOT NULL DEFAULT 0,
    rows_skipped    INTEGER NOT NULL DEFAULT 0,
    data_through    DATE,                                 -- max action/vote date seen in the source
    note            TEXT
);

CREATE INDEX idx_ingestion_runs_source ON ingestion_runs(source, started_at DESC);

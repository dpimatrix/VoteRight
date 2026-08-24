-- Admin-editable priority topics/axes (docs/BACKLOG.md, 2026-08-23 entry).
-- topic_axes is the single most consequential data in the platform -- the
-- actual questions every candidate and every voter gets measured against --
-- and was only ever insertable via db/seed.prod.sql. The guardrails matter
-- more than the feature (owner's own framing), so this migration carries
-- the state machine, not just an on/off switch:
--
--   draft -> in_review -> published -> retired
--
-- Existing rows all default to 'published' with no admin attribution --
-- they were seeded directly, never drafted through this new workflow, and
-- must keep behaving exactly as before (topicsWithAxes()/axesForCoding()
-- below get filtered to status='published', which every pre-existing row
-- already satisfies).
ALTER TABLE topic_axes
    ADD COLUMN status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('draft', 'in_review', 'published', 'retired')),
    -- Admin USERNAME, not a topic_axes -> admin_accounts FK: adminAuth.ts's
    -- dev-mode sentinel admin ("dev") has no real admin_accounts row at
    -- all, so a hard FK would break every dev-mode draft. Username is
    -- already how currentAdmin() identifies whoever's logged in, real or
    -- dev, uniformly.
    ADD COLUMN created_by_admin TEXT,
    ADD COLUMN reviewed_by_admin TEXT,
    ADD COLUMN published_at TIMESTAMPTZ,
    ADD COLUMN retired_at TIMESTAMPTZ,
    -- Set when this axis is retired IN FAVOR of a replacement (a rewording
    -- became a new axis, not a mutation -- see the trigger below) -- null
    -- for a retirement with no direct successor.
    ADD COLUMN superseded_by_axis_id UUID REFERENCES topic_axes(id),
    -- Second-person review, enforced in the database too (not just the
    -- admin UI hiding the button) -- the same "verified at multiple
    -- layers" discipline referenda.ts's publish gate already uses.
    ADD CONSTRAINT topic_axes_reviewer_not_author
        CHECK (reviewed_by_admin IS NULL OR reviewed_by_admin <> created_by_admin);

-- "Editing a published axis's wording should be disallowed outright" --
-- position_codings are tied to a specific axis_id; silently changing what
-- an axis actually asks after candidates have already been coded against
-- the original wording makes existing confirmed codings misrepresent what
-- was really asked. A new, differently-worded axis + retiring the old one
-- is the only path once published -- enforced here, not just left to the
-- admin UI never offering an edit form for a published row.
CREATE FUNCTION topic_axes_lock_published() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'published' AND (
       NEW.question      IS DISTINCT FROM OLD.question OR
       NEW.negative_pole IS DISTINCT FROM OLD.negative_pole OR
       NEW.positive_pole IS DISTINCT FROM OLD.positive_pole OR
       NEW.topic_id       IS DISTINCT FROM OLD.topic_id OR
       NEW.key            IS DISTINCT FROM OLD.key
     ) THEN
    RAISE EXCEPTION 'topic_axes: cannot edit the wording of a published axis (id %) -- draft a new axis and retire this one instead', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topic_axes_lock_published_trigger
    BEFORE UPDATE ON topic_axes
    FOR EACH ROW EXECUTE FUNCTION topic_axes_lock_published();

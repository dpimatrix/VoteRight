-- Priority-wish -> axis linking (2026-09-13, owner request).
--
-- Real gap found live: listPendingPriorityWishes() only ever shows
-- status='pending' wishes -- correct for that queue, but it means an
-- APPROVED wish drops off every admin screen the instant it's decided,
-- with nothing tracking "I still need to draft a real axis from this."
-- Nothing links a wish to whatever axis eventually gets drafted from it
-- either, so there was no way to even later confirm one was acted on.
--
-- linked_axis_id is set the moment an admin actually drafts an axis
-- FROM a given wish (createDraftAxis's optional wishId param) -- a real
-- audit trail (which axis came from which suggestion), not just an
-- admin's memory.
ALTER TABLE priority_wishes ADD COLUMN linked_axis_id UUID REFERENCES topic_axes(id);

-- The admin queue for "approved, not yet turned into an axis" -- same
-- partial-index reasoning as priority_wishes_pending_idx (migration 097):
-- this is the only shape of query this index needs to serve.
CREATE INDEX priority_wishes_approved_undrafted_idx ON priority_wishes (created_at)
  WHERE status = 'approved' AND linked_axis_id IS NULL;

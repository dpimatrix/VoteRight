// Shared across the 4 priority-axes admin routes (review queue, published,
// wishes, new-axis form) -- extracted from the old single-page console
// (2026-10-01 redesign) so each page's `?e=` lookup stays in sync without
// four copies of the same map drifting apart.
export const ERROR_NOTE: Record<string, string> = {
  self_review: "Can't approve your own draft — a different admin has to review it.",
  not_in_review: "That axis isn't awaiting review (someone may have already acted on it).",
  not_found: "Axis not found.",
  race: "Someone else already acted on this axis.",
  // Real gap found live 2026-08-31: createDraftAxis() already returns one of
  // these 4 reasons on failure, but api/admin/priority-axes/route.ts (the
  // "draft a new axis" form's own action) discarded it outright, always
  // redirecting back here as if the save succeeded -- unlike every action
  // on THIS SAME PAGE below (approve/reject/retire/etc.), which already
  // correctly wired into this exact ERROR_NOTE lookup.
  topic: "Choose an existing topic or name a new one.",
  fields: "Every field (key, question, both poles) is required.",
  duplicate_key: "That axis key is already used within this topic — pick a different one.",
  error: "That axis couldn't be saved.",
  wish_already_decided: "Someone else already decided that wish — your note wasn't saved.",
  wish_already_linked: "Someone already drafted an axis from that wish — this one wasn't saved to avoid a duplicate.",
};

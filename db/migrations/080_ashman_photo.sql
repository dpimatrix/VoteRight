-- Mayor Jud Ashman's portrait (2026-08-14) -- a real, deliberate policy
-- EXCEPTION, not a precedent: the City of Gaithersburg's own site
-- (gaithersburgmd.gov) blocks automated access outright (Akamai 403,
-- confirmed from two separate networks, same class of block as
-- congress.gov's image host hit earlier the same day) and no Wikimedia
-- Commons photo of him exists. Owner-approved (2026-08-14) to use his
-- campaign site's own published headshot instead --
-- https://www.votejud.com/wp-content/uploads/2025/07/2025-Headshot-800x800-1.jpg,
-- explicitly labeled a "headshot" on the source page -- rather than leave
-- the sitting Mayor on a monogram. This is CAMPAIGN material, not an
-- official government portrait, unlike every other photo in
-- app/public/politicians/ -- see ATTRIBUTION.md for the full disclosure.
-- Applied to his exact known politician ID (migration 006), not by
-- name-matching.

UPDATE politicians SET photo_url = '/politicians/ashman.webp'
 WHERE id = '50000000-0000-4000-8000-000000000101';

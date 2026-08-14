-- President + Vice President official portraits (2026-08-14), closing a
-- gap migration 061 left open: it set full_name/party/bio for both but
-- never photo_url, since photo re-hosting wasn't part of this project
-- until today's officeholder-thumbnail work. Source: official White
-- House-series portraits (January 2025, photographer Daniel Torok),
-- re-hosted from Wikimedia Commons -- public-domain U.S. government
-- works, same category as every other official portrait this project
-- uses, documented in app/public/politicians/ATTRIBUTION.md. Politician
-- IDs are the exact ones migration 061 created; no other row matches.

UPDATE politicians SET photo_url = '/politicians/trump.webp'
 WHERE id = '31000000-0000-4000-8000-000000000101';

UPDATE politicians SET photo_url = '/politicians/vance.webp'
 WHERE id = '31000000-0000-4000-8000-000000000102';

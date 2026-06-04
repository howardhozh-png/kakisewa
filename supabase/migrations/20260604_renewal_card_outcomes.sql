-- Task 1: resolved state and outcome on tenancies (= renewal_cards in spec)
-- resolved_at: stamped when a tenancy leaves active lifecycle (renewed/vacated/etc.)
-- outcome: final disposition — drives historical chart for Platinum/Elite

ALTER TABLE tenancies
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL
    CHECK (outcome IN ('renewed', 'vacated', 'replaced', 'pending'))
    DEFAULT 'pending';

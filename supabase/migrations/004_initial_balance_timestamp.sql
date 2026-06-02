-- Replace date-only column with full timestamp for exact cutoff precision
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS initial_balance_set_at TIMESTAMPTZ;

-- Migrate any existing date values to start-of-day timestamp
UPDATE accounts
SET initial_balance_set_at = initial_balance_set_date::TIMESTAMPTZ
WHERE initial_balance_set_date IS NOT NULL AND initial_balance_set_at IS NULL;

ALTER TABLE accounts
  DROP COLUMN IF EXISTS initial_balance_set_date;

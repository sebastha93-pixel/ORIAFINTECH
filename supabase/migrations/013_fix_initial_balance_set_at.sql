-- Migration 013: fix initial_balance_set_at that was set in the past by saveInitialBalance bug
-- Restore momento 0 = exact account creation time for any account where
-- initial_balance_set_at was set MORE than 1 hour before created_at (sign of the bug).
UPDATE public.accounts
SET initial_balance_set_at = created_at
WHERE initial_balance_set_at IS NOT NULL
  AND initial_balance_set_at < created_at - INTERVAL '1 hour';

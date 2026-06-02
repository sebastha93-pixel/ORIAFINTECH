-- Add initial balance tracking to accounts
-- initial_balance: the real balance the user had when they started using ORIA
-- initial_balance_set_date: the date it was set — editable only on that same day

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS initial_balance       DECIMAL(18, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS initial_balance_set_date DATE;

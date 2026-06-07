-- Add credit card specific fields to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS credit_limit    NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS payment_due_day SMALLINT;     -- day of month (1-31)

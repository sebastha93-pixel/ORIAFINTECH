-- Add USD balance fields to credit cards
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS initial_balance_usd NUMERIC(20, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_limit_usd NUMERIC(20, 2) DEFAULT 0;

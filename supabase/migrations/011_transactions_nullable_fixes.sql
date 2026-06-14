-- Migration 011: Fix two blocking issues that caused transactions to silently disappear
--
-- 1. Add category TEXT column (app code selects it; missing column caused all SELECTs to return error 42703)
-- 2. Make account_id nullable (Gmail-imported transactions that don't match a registered account
--    need to be stored without account_id; NOT NULL was blocking those inserts)

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.transactions
  ALTER COLUMN account_id DROP NOT NULL;

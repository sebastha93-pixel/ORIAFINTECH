-- Add card network (franchise) to credit cards
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS card_network TEXT DEFAULT 'other';

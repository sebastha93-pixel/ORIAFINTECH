-- Migration 012: payment_status column for credit cards
-- Allows users to manually set the current payment status of a credit card.
-- Values: 'current' (al día), 'overdue' (en mora). NULL = auto-derive from payment_due_day.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS payment_status TEXT
    CHECK (payment_status IN ('current', 'overdue'));

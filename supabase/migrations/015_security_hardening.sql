-- ============================================================
-- 015_security_hardening.sql
-- RLS HARDENING v2 — finishes the job started in 007.
--
-- Closes:
--   1. Missing WITH CHECK on 8 tables that used FOR ALL USING only
--      (assets, liabilities, net_worth_snapshots, goals,
--       ai_conversations, ai_insights, monthly_summaries,
--       email_connections) → a user could INSERT rows owned by
--      another user (e.g. plant a fake ai_insights "alert").
--   2. categories: is_system rows were INSERTable by any user
--      (globally-visible category injection).
--   3. transactions: to_account_id was not ownership-validated →
--      a crafted transfer could mutate another user's balance via
--      the SECURITY DEFINER balance trigger.
--   4. SECURITY DEFINER functions missing `SET search_path`
--      (update_account_balance, update_updated_at, handle_new_user).
--   5. audit_log writes hardened with explicit REVOKE.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ── Helper pattern: per-operation policies with WITH CHECK ────
-- For each previously-"FOR ALL USING"-only table we drop the old
-- policy and recreate SELECT/INSERT/UPDATE/DELETE with WITH CHECK
-- so INSERT/UPDATE rows are validated against auth.uid().

-- assets ------------------------------------------------------
DROP POLICY IF EXISTS "Users own assets" ON assets;
CREATE POLICY "assets_select" ON assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "assets_insert" ON assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assets_update" ON assets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assets_delete" ON assets FOR DELETE USING (auth.uid() = user_id);

-- liabilities -------------------------------------------------
DROP POLICY IF EXISTS "Users own liabilities" ON liabilities;
CREATE POLICY "liab_select" ON liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "liab_insert" ON liabilities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "liab_update" ON liabilities FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "liab_delete" ON liabilities FOR DELETE USING (auth.uid() = user_id);

-- net_worth_snapshots -----------------------------------------
DROP POLICY IF EXISTS "Users own net_worth_snapshots" ON net_worth_snapshots;
CREATE POLICY "nws_select" ON net_worth_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "nws_insert" ON net_worth_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nws_update" ON net_worth_snapshots FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nws_delete" ON net_worth_snapshots FOR DELETE USING (auth.uid() = user_id);

-- goals -------------------------------------------------------
DROP POLICY IF EXISTS "Users own goals" ON goals;
CREATE POLICY "goals_select" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update" ON goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_delete" ON goals FOR DELETE USING (auth.uid() = user_id);

-- ai_conversations --------------------------------------------
DROP POLICY IF EXISTS "Users own ai_conversations" ON ai_conversations;
CREATE POLICY "aiconv_select" ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "aiconv_insert" ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aiconv_update" ON ai_conversations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aiconv_delete" ON ai_conversations FOR DELETE USING (auth.uid() = user_id);

-- ai_insights -------------------------------------------------
DROP POLICY IF EXISTS "Users own ai_insights" ON ai_insights;
CREATE POLICY "aiins_select" ON ai_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "aiins_insert" ON ai_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aiins_update" ON ai_insights FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aiins_delete" ON ai_insights FOR DELETE USING (auth.uid() = user_id);

-- monthly_summaries -------------------------------------------
DROP POLICY IF EXISTS "Users own monthly_summaries" ON monthly_summaries;
CREATE POLICY "msum_select" ON monthly_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "msum_insert" ON monthly_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msum_update" ON monthly_summaries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msum_delete" ON monthly_summaries FOR DELETE USING (auth.uid() = user_id);

-- email_connections (created in 002) --------------------------
DROP POLICY IF EXISTS "Users own email connections" ON email_connections;
DROP POLICY IF EXISTS "Users own email_connections" ON email_connections;
CREATE POLICY "emailconn_select" ON email_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "emailconn_insert" ON email_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "emailconn_update" ON email_connections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "emailconn_delete" ON email_connections FOR DELETE USING (auth.uid() = user_id);

-- categories --------------------------------------------------
-- Keep system categories readable by everyone, but a user may only
-- write their OWN non-system categories. Moving is_system=FALSE into
-- WITH CHECK closes the global-category injection hole.
DROP POLICY IF EXISTS "Users own custom categories" ON categories;
CREATE POLICY "cat_insert" ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = FALSE);
CREATE POLICY "cat_update" ON categories FOR UPDATE
  USING  (auth.uid() = user_id AND is_system = FALSE)
  WITH CHECK (auth.uid() = user_id AND is_system = FALSE);
CREATE POLICY "cat_delete" ON categories FOR DELETE
  USING (auth.uid() = user_id AND is_system = FALSE);
-- (SELECT policy "System or own categories" from 001 stays as-is.)

-- ── transactions: validate to_account_id ownership ───────────
-- Extend the 007 INSERT/UPDATE policies so a transfer's destination
-- account must also belong to the caller. Without this, a crafted
-- transfer could move another user's balance via the balance trigger.
DROP POLICY IF EXISTS "txn_insert" ON transactions;
CREATE POLICY "txn_insert" ON transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM accounts
       WHERE accounts.id = transactions.account_id
         AND accounts.user_id = auth.uid()
    )
    AND (
      transactions.to_account_id IS NULL
      OR EXISTS (
        SELECT 1 FROM accounts
         WHERE accounts.id = transactions.to_account_id
           AND accounts.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "txn_update" ON transactions;
CREATE POLICY "txn_update" ON transactions
  FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM accounts
       WHERE accounts.id = transactions.account_id
         AND accounts.user_id = auth.uid()
    )
    AND (
      transactions.to_account_id IS NULL
      OR EXISTS (
        SELECT 1 FROM accounts
         WHERE accounts.id = transactions.to_account_id
           AND accounts.user_id = auth.uid()
      )
    )
  );

-- ── SECURITY DEFINER functions: pin search_path ──────────────
-- A SECURITY DEFINER function without a fixed search_path can be
-- hijacked by an attacker-controlled search_path. Pin to public.

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type = 'income' THEN
      UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.transaction_type = 'expense' THEN
      UPDATE accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.transaction_type = 'transfer' THEN
      UPDATE accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
      UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.transaction_type = 'income' THEN
      UPDATE accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.transaction_type = 'expense' THEN
      UPDATE accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.transaction_type = 'transfer' THEN
      UPDATE accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
      UPDATE accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.to_account_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- handle_new_user was hardened in 006 with SET search_path; re-assert
-- here defensively in case of ordering drift.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── audit_log: make tamper-resistance explicit ──────────────
-- 008 relies on "no write policy = no client writes". Add an explicit
-- REVOKE so a future careless GRANT/policy can't open a write path.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM authenticated, anon;
  END IF;
END $$;

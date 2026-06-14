-- ============================================================
-- RLS HARDENING v1
-- Replaces broad FOR ALL policies with per-operation policies
-- that include WITH CHECK so INSERT/UPDATE can't tamper with
-- user_id or reference rows owned by other users.
--
-- Key fixes:
--   1. transactions INSERT/UPDATE validates account_id ownership
--   2. goal_contributions INSERT/UPDATE validates goal_id ownership
--   3. accounts UPDATE can't change user_id
--   4. profiles UPDATE can't change id (primary key)
-- ============================================================

-- ── Transactions ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Users own transactions" ON transactions;

CREATE POLICY "txn_select" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Enforce: account_id must belong to the same authenticated user
CREATE POLICY "txn_insert" ON transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM accounts
       WHERE accounts.id = transactions.account_id
         AND accounts.user_id = auth.uid()
    )
  );

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
  );

CREATE POLICY "txn_delete" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ── Goal contributions ────────────────────────────────────────

DROP POLICY IF EXISTS "Users own goal_contributions" ON goal_contributions;

CREATE POLICY "goalc_select" ON goal_contributions
  FOR SELECT USING (auth.uid() = user_id);

-- Enforce: goal_id must belong to the same authenticated user
CREATE POLICY "goalc_insert" ON goal_contributions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM goals
       WHERE goals.id = goal_contributions.goal_id
         AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "goalc_update" ON goal_contributions
  FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM goals
       WHERE goals.id = goal_contributions.goal_id
         AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "goalc_delete" ON goal_contributions
  FOR DELETE USING (auth.uid() = user_id);

-- ── Accounts ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users own accounts" ON accounts;

CREATE POLICY "acc_select" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "acc_insert" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- WITH CHECK prevents changing user_id on an existing account
CREATE POLICY "acc_update" ON accounts
  FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "acc_delete" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- ── Profiles ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- WITH CHECK prevents changing the primary key (id) on UPDATE
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Performance: indexes used by RLS expressions ─────────────
-- Postgres evaluates USING/WITH CHECK per row; these help it do
-- the EXISTS sub-selects efficiently at scale.
CREATE INDEX IF NOT EXISTS idx_accounts_user_id_id
  ON accounts (user_id, id);

CREATE INDEX IF NOT EXISTS idx_goals_user_id_id
  ON goals (user_id, id);

CREATE INDEX IF NOT EXISTS idx_goalc_user_goal
  ON goal_contributions (user_id, goal_id);

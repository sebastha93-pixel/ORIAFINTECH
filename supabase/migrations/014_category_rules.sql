-- 014_category_rules.sql
-- Auto-categorization rules: user-defined patterns that override the
-- parser's inferred category during Gmail sync.

CREATE TABLE IF NOT EXISTS category_rules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- What field to match against: 'description' | 'recipient' | 'merchant'
  field       TEXT        NOT NULL DEFAULT 'description'
                          CHECK (field IN ('description','recipient','merchant')),
  -- The string to search for (case-insensitive, accent-insensitive internally)
  pattern     TEXT        NOT NULL CHECK (length(trim(pattern)) > 0),
  -- Target category to apply when the pattern matches
  category    TEXT        NOT NULL CHECK (length(trim(category)) > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS category_rules_user_id_idx ON category_rules (user_id);

ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own rules"
  ON category_rules FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

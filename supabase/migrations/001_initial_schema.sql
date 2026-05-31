-- ============================================================
-- NEXO FINANZAS - Database Schema v1.0
-- Personal Financial Intelligence Platform
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS & PROFILES
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  country_code CHAR(2) DEFAULT 'CO',
  currency_code CHAR(3) DEFAULT 'COP',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  ai_insights_enabled BOOLEAN DEFAULT TRUE,
  notification_preferences JSONB DEFAULT '{"push": true, "email": true, "weekly_summary": true}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCIAL ACCOUNTS
-- ============================================================

CREATE TYPE account_type AS ENUM (
  'checking',
  'savings',
  'credit_card',
  'investment',
  'crypto',
  'cash',
  'loan',
  'other'
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  institution TEXT,
  account_type account_type NOT NULL,
  currency_code CHAR(3) DEFAULT 'COP',
  current_balance DECIMAL(18, 2) DEFAULT 0,
  credit_limit DECIMAL(18, 2),
  interest_rate DECIMAL(5, 4),
  is_active BOOLEAN DEFAULT TRUE,
  is_manual BOOLEAN DEFAULT TRUE,
  color TEXT DEFAULT '#6C63FF',
  icon TEXT DEFAULT 'bank',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(account_type);

-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TYPE category_type AS ENUM ('income', 'expense', 'transfer');

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT '#6C63FF',
  category_type category_type NOT NULL,
  parent_id UUID REFERENCES categories(id),
  is_system BOOLEAN DEFAULT FALSE,
  budget_amount DECIMAL(18, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- System categories (shared across all users)
INSERT INTO categories (id, name, icon, color, category_type, is_system) VALUES
  -- Income
  (uuid_generate_v4(), 'Salario', 'briefcase', '#10B981', 'income', TRUE),
  (uuid_generate_v4(), 'Freelance', 'laptop', '#3B82F6', 'income', TRUE),
  (uuid_generate_v4(), 'Inversiones', 'trending-up', '#8B5CF6', 'income', TRUE),
  (uuid_generate_v4(), 'Arriendos', 'home', '#F59E0B', 'income', TRUE),
  (uuid_generate_v4(), 'Otros ingresos', 'plus-circle', '#6B7280', 'income', TRUE),
  -- Expenses
  (uuid_generate_v4(), 'Alimentación', 'coffee', '#EF4444', 'expense', TRUE),
  (uuid_generate_v4(), 'Transporte', 'car', '#F97316', 'expense', TRUE),
  (uuid_generate_v4(), 'Vivienda', 'home', '#EAB308', 'expense', TRUE),
  (uuid_generate_v4(), 'Salud', 'heart', '#EC4899', 'expense', TRUE),
  (uuid_generate_v4(), 'Entretenimiento', 'music', '#8B5CF6', 'expense', TRUE),
  (uuid_generate_v4(), 'Educación', 'book', '#06B6D4', 'expense', TRUE),
  (uuid_generate_v4(), 'Ropa', 'shopping-bag', '#14B8A6', 'expense', TRUE),
  (uuid_generate_v4(), 'Tecnología', 'smartphone', '#6366F1', 'expense', TRUE),
  (uuid_generate_v4(), 'Restaurantes', 'utensils', '#F43F5E', 'expense', TRUE),
  (uuid_generate_v4(), 'Viajes', 'plane', '#0EA5E9', 'expense', TRUE),
  (uuid_generate_v4(), 'Servicios', 'zap', '#84CC16', 'expense', TRUE),
  (uuid_generate_v4(), 'Deudas', 'credit-card', '#DC2626', 'expense', TRUE),
  (uuid_generate_v4(), 'Otros gastos', 'more-horizontal', '#6B7280', 'expense', TRUE);

-- ============================================================
-- TRANSACTIONS
-- ============================================================

CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id UUID REFERENCES accounts(id),
  category_id UUID REFERENCES categories(id),
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  currency_code CHAR(3) DEFAULT 'COP',
  description TEXT,
  notes TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB,
  ai_category_confidence DECIMAL(3, 2),
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_date_user ON transactions(user_id, date DESC);

-- ============================================================
-- ASSETS & LIABILITIES (Net Worth)
-- ============================================================

CREATE TYPE asset_type AS ENUM (
  'real_estate',
  'vehicle',
  'investment',
  'retirement',
  'crypto',
  'business',
  'collectible',
  'other'
);

CREATE TYPE liability_type AS ENUM (
  'mortgage',
  'car_loan',
  'personal_loan',
  'student_loan',
  'credit_card',
  'other'
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_type asset_type NOT NULL,
  current_value DECIMAL(18, 2) NOT NULL DEFAULT 0,
  purchase_value DECIMAL(18, 2),
  purchase_date DATE,
  currency_code CHAR(3) DEFAULT 'COP',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  icon TEXT DEFAULT 'trending-up',
  color TEXT DEFAULT '#10B981',
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE liabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  liability_type liability_type NOT NULL,
  original_amount DECIMAL(18, 2) NOT NULL,
  current_balance DECIMAL(18, 2) NOT NULL,
  interest_rate DECIMAL(5, 4),
  monthly_payment DECIMAL(18, 2),
  due_date DATE,
  currency_code CHAR(3) DEFAULT 'COP',
  is_active BOOLEAN DEFAULT TRUE,
  icon TEXT DEFAULT 'credit-card',
  color TEXT DEFAULT '#EF4444',
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_liabilities_user_id ON liabilities(user_id);

-- ============================================================
-- NET WORTH SNAPSHOTS (Historical Tracking)
-- ============================================================

CREATE TABLE net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_assets DECIMAL(18, 2) NOT NULL DEFAULT 0,
  total_liabilities DECIMAL(18, 2) NOT NULL DEFAULT 0,
  net_worth DECIMAL(18, 2) GENERATED ALWAYS AS (total_assets - total_liabilities) STORED,
  account_balances JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_net_worth_user_date ON net_worth_snapshots(user_id, snapshot_date);
CREATE INDEX idx_net_worth_user_id ON net_worth_snapshots(user_id);

-- ============================================================
-- FINANCIAL GOALS
-- ============================================================

CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused', 'cancelled');
CREATE TYPE goal_type AS ENUM (
  'savings',
  'debt_payoff',
  'investment',
  'emergency_fund',
  'purchase',
  'retirement',
  'travel',
  'education',
  'other'
);

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal_type goal_type NOT NULL,
  description TEXT,
  target_amount DECIMAL(18, 2) NOT NULL,
  current_amount DECIMAL(18, 2) DEFAULT 0,
  currency_code CHAR(3) DEFAULT 'COP',
  target_date DATE,
  monthly_contribution DECIMAL(18, 2),
  status goal_status DEFAULT 'active',
  icon TEXT DEFAULT 'target',
  color TEXT DEFAULT '#6C63FF',
  linked_account_id UUID REFERENCES accounts(id),
  ai_recommendations JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE goal_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  note TEXT,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goal_contributions_goal_id ON goal_contributions(goal_id);

-- ============================================================
-- AI CONVERSATIONS & INSIGHTS
-- ============================================================

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::JSONB,
  context_snapshot JSONB DEFAULT '{}'::JSONB,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'success', 'alert')),
  data JSONB DEFAULT '{}'::JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_unread ON ai_insights(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- MONTHLY SUMMARIES (Pre-computed for performance)
-- ============================================================

CREATE TABLE monthly_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_income DECIMAL(18, 2) DEFAULT 0,
  total_expenses DECIMAL(18, 2) DEFAULT 0,
  net_savings DECIMAL(18, 2) GENERATED ALWAYS AS (total_income - total_expenses) STORED,
  savings_rate DECIMAL(5, 4),
  category_breakdown JSONB DEFAULT '{}'::JSONB,
  top_expenses JSONB DEFAULT '[]'::JSONB,
  vs_previous_month JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_monthly_summaries_user_period ON monthly_summaries(user_id, year, month);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "System or own categories" ON categories FOR SELECT USING (is_system = TRUE OR auth.uid() = user_id);
CREATE POLICY "Users own custom categories" ON categories FOR ALL USING (auth.uid() = user_id AND is_system = FALSE);
CREATE POLICY "Users own assets" ON assets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own liabilities" ON liabilities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own net_worth_snapshots" ON net_worth_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own goal_contributions" ON goal_contributions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own ai_conversations" ON ai_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own ai_insights" ON ai_insights FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own monthly_summaries" ON monthly_summaries FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update account balance after transaction
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER transaction_balance_update
  AFTER INSERT OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON liabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at();

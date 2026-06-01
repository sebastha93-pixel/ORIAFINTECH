// ============================================================
// NEXO FINANZAS - Shared Types (inlined from @nexo/shared)
// ============================================================

export type Currency = 'COP' | 'USD' | 'EUR' | 'MXN' | 'ARS' | 'BRL' | 'CLP' | 'PEN';

export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'investment'
  | 'crypto'
  | 'cash'
  | 'loan'
  | 'other';

export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryType = 'income' | 'expense' | 'transfer';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type GoalType =
  | 'savings'
  | 'debt_payoff'
  | 'investment'
  | 'emergency_fund'
  | 'purchase'
  | 'retirement'
  | 'travel'
  | 'education'
  | 'other';

export type AssetType =
  | 'real_estate'
  | 'vehicle'
  | 'investment'
  | 'retirement'
  | 'crypto'
  | 'business'
  | 'collectible'
  | 'other';

export type LiabilityType =
  | 'mortgage'
  | 'car_loan'
  | 'personal_loan'
  | 'student_loan'
  | 'credit_card'
  | 'other';

export type InsightSeverity = 'info' | 'warning' | 'success' | 'alert';

// -----------------------------------------------
// Core Entities
// -----------------------------------------------

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  country_code: string;
  currency_code: Currency;
  onboarding_completed: boolean;
  ai_insights_enabled: boolean;
  notification_preferences: {
    push: boolean;
    email: boolean;
    weekly_summary: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  institution: string | null;
  account_type: AccountType;
  currency_code: Currency;
  current_balance: number;
  credit_limit: number | null;
  interest_rate: number | null;
  is_active: boolean;
  is_manual: boolean;
  color: string;
  icon: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  color: string;
  category_type: CategoryType;
  parent_id: string | null;
  is_system: boolean;
  budget_amount: number | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  currency_code: Currency;
  description: string | null;
  notes: string | null;
  date: string;
  is_recurring: boolean;
  ai_category_confidence: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  account?: Account;
  category?: Category;
}

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  asset_type: AssetType;
  current_value: number;
  purchase_value: number | null;
  purchase_date: string | null;
  currency_code: Currency;
  description: string | null;
  is_active: boolean;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Liability {
  id: string;
  user_id: string;
  name: string;
  liability_type: LiabilityType;
  original_amount: number;
  current_balance: number;
  interest_rate: number | null;
  monthly_payment: number | null;
  due_date: string | null;
  currency_code: Currency;
  is_active: boolean;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  account_balances: Record<string, number>;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  goal_type: GoalType;
  description: string | null;
  target_amount: number;
  current_amount: number;
  currency_code: Currency;
  target_date: string | null;
  monthly_contribution: number | null;
  status: GoalStatus;
  icon: string;
  color: string;
  linked_account_id: string | null;
  ai_recommendations: GoalRecommendation[];
  created_at: string;
  updated_at: string;
  // Computed
  progress_percentage?: number;
  months_to_goal?: number;
}

export interface GoalRecommendation {
  type: string;
  message: string;
  impact: number;
  generated_at: string;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  note: string | null;
  contribution_date: string;
  transaction_id: string | null;
  created_at: string;
}

export interface AiInsight {
  id: string;
  user_id: string;
  insight_type: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  data: Record<string, unknown>;
  is_read: boolean;
  is_dismissed: boolean;
  generated_at: string;
  expires_at: string | null;
}

export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface AiConversation {
  id: string;
  user_id: string;
  title: string | null;
  messages: AiMessage[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlySummary {
  id: string;
  user_id: string;
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  net_savings: number;
  savings_rate: number;
  category_breakdown: Record<string, number>;
  top_expenses: Array<{ category: string; amount: number; percentage: number }>;
  vs_previous_month: {
    income_change: number;
    expense_change: number;
    savings_change: number;
  };
}

// -----------------------------------------------
// API Response Types
// -----------------------------------------------

export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: unknown;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// -----------------------------------------------
// Dashboard Types
// -----------------------------------------------

export interface DashboardSummary {
  net_worth: number;
  net_worth_change: number;
  net_worth_change_percentage: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  savings_rate: number;
  accounts: Account[];
  recent_transactions: Transaction[];
  active_goals: Goal[];
  insights: AiInsight[];
  spending_by_category: CategorySpending[];
  net_worth_history: NetWorthSnapshot[];
}

export interface CategorySpending {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  amount: number;
  percentage: number;
  transaction_count: number;
  vs_last_month: number;
}

// -----------------------------------------------
// AI Types
// -----------------------------------------------

export interface AiFinancialContext {
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  savings_rate: number;
  top_expense_categories: CategorySpending[];
  active_goals: Goal[];
  accounts_summary: Account[];
  recent_insights: AiInsight[];
  currency: Currency;
  country: string;
}

export interface AiChatRequest {
  message: string;
  conversation_id?: string;
}

export interface AiChatResponse {
  reply: string;
  conversation_id: string;
  suggestions: string[];
  related_insights?: AiInsight[];
}

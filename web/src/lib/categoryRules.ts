import { supabase } from './supabase';
import type { ParsedEmail } from './emailParsers';

export interface CategoryRule {
  id: string;
  field: 'description' | 'recipient' | 'merchant';
  pattern: string;
  category: string;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function applyRules(parsed: ParsedEmail, rules: CategoryRule[]): string {
  for (const rule of rules) {
    let haystack = '';
    if (rule.field === 'description') haystack = parsed.description;
    else if (rule.field === 'recipient') haystack = parsed.recipientName ?? parsed.merchant ?? '';
    else if (rule.field === 'merchant')  haystack = parsed.merchant ?? '';
    if (!haystack) continue;
    if (normalize(haystack).includes(normalize(rule.pattern))) return rule.category;
  }
  return parsed.category;
}

export async function fetchCategoryRules(userId: string): Promise<CategoryRule[]> {
  const { data, error } = await supabase
    .from('category_rules')
    .select('id, field, pattern, category')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) {
    // Table may not exist yet (migration pending) — return empty so sync proceeds normally
    if (error.code === '42P01') return [];
    console.error('fetchCategoryRules:', error.message);
    return [];
  }
  return (data ?? []) as CategoryRule[];
}

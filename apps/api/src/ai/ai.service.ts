import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';
import { AiChatDto } from './dto/ai-chat.dto';

@Injectable()
export class AiService {
  private anthropic: Anthropic;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly configService: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: configService.get<string>('ANTHROPIC_API_KEY') ?? '',
    });
  }

  async chat(userId: string, dto: AiChatDto) {
    const context = await this.buildFinancialContext(userId);
    const systemPrompt = this.buildSystemPrompt(context);

    let conversationId = dto.conversation_id;
    let existingMessages: Array<{ role: string; content: string }> = [];

    if (conversationId) {
      const { data: conv } = await this.supabase
        .from('ai_conversations')
        .select('messages')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();
      if (conv) existingMessages = conv.messages;
    }

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...existingMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: dto.message },
    ];

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const reply =
      response.content[0]?.type === 'text'
        ? response.content[0].text
        : 'Lo siento, no pude procesar tu consulta.';

    const updatedMessages = [
      ...existingMessages,
      { role: 'user', content: dto.message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ];

    if (conversationId) {
      await this.supabase
        .from('ai_conversations')
        .update({ messages: updatedMessages })
        .eq('id', conversationId);
    } else {
      const { data: newConv } = await this.supabase
        .from('ai_conversations')
        .insert({
          user_id: userId,
          title: dto.message.substring(0, 60),
          messages: updatedMessages,
        })
        .select()
        .single();
      conversationId = newConv?.id;
    }

    return {
      reply,
      conversation_id: conversationId,
      suggestions: this.generateSuggestions(context),
    };
  }

  async getInsights(userId: string) {
    const { data } = await this.supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('generated_at', { ascending: false })
      .limit(10);

    return data || [];
  }

  async generateInsights(userId: string) {
    const context = await this.buildFinancialContext(userId);
    const insights: Array<{
      insight_type: string;
      title: string;
      description: string;
      severity: string;
      data: Record<string, unknown>;
    }> = [];

    if (context.savings_rate < 0.1 && context.monthly_income > 0) {
      insights.push({
        insight_type: 'low_savings_rate',
        title: 'Tu tasa de ahorro es baja',
        description: `Estás ahorrando el ${(context.savings_rate * 100).toFixed(1)}% de tus ingresos. Los expertos recomiendan al menos el 20%.`,
        severity: 'warning',
        data: { savings_rate: context.savings_rate },
      });
    } else if (context.savings_rate >= 0.2) {
      insights.push({
        insight_type: 'good_savings_rate',
        title: '¡Excelente tasa de ahorro!',
        description: `Estás ahorrando el ${(context.savings_rate * 100).toFixed(1)}% de tus ingresos. Mantén este ritmo.`,
        severity: 'success',
        data: { savings_rate: context.savings_rate },
      });
    }

    for (const insight of insights) {
      await this.supabase.from('ai_insights').insert({
        user_id: userId,
        ...insight,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return insights;
  }

  async dismissInsight(userId: string, insightId: string) {
    await this.supabase
      .from('ai_insights')
      .update({ is_dismissed: true })
      .eq('id', insightId)
      .eq('user_id', userId);
    return { message: 'Insight dismissed' };
  }

  async getConversations(userId: string) {
    const { data } = await this.supabase
      .from('ai_conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(20);
    return data || [];
  }

  async getConversation(userId: string, conversationId: string) {
    const { data } = await this.supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();
    return data;
  }

  private async buildFinancialContext(userId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
    const dateTo = new Date(year, month, 0).toISOString().split('T')[0];

    const [accountsRes, transactionsRes, goalsRes] = await Promise.all([
      this.supabase
        .from('accounts')
        .select('name, account_type, initial_balance, credit_limit')
        .eq('user_id', userId)
        .eq('is_active', true),
      this.supabase
        .from('transactions')
        .select('amount, transaction_type, description, category')
        .eq('user_id', userId)
        .gte('date', dateFrom)
        .lte('date', dateTo),
      this.supabase
        .from('goals')
        .select('name, target_amount, current_amount, target_date')
        .eq('user_id', userId)
        .eq('status', 'active'),
    ]);

    const transactions = transactionsRes.data || [];
    const income = transactions
      .filter(t => t.transaction_type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const expenses = transactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);

    const accounts = accountsRes.data || [];
    const creditCards = accounts.filter(a => a.account_type === 'credit_card');
    const totalCreditDebt = creditCards.reduce((s, a) => s + Number(a.initial_balance || 0), 0);
    const totalCreditLimit = creditCards.reduce((s, a) => s + Number(a.credit_limit || 0), 0);

    // Category breakdown from current month
    const categoryTotals: Record<string, number> = {};
    for (const t of transactions) {
      if (t.transaction_type === 'expense') {
        const cat = t.category || 'Otros';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
      }
    }
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    return {
      monthly_income: income,
      monthly_expenses: expenses,
      savings_rate: income > 0 ? (income - expenses) / income : 0,
      accounts,
      credit_debt: totalCreditDebt,
      credit_limit: totalCreditLimit,
      active_goals: goalsRes.data || [],
      top_categories: topCategories,
    };
  }

  private buildSystemPrompt(
    context: Awaited<ReturnType<typeof this.buildFinancialContext>>,
  ): string {
    const fmt = (n: number) =>
      n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

    const goalsText =
      context.active_goals.length > 0
        ? context.active_goals
            .map(
              g =>
                `  • ${g.name}: ${fmt(Number(g.current_amount))} de ${fmt(Number(g.target_amount))} (${Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)}%)`,
            )
            .join('\n')
        : '  Sin metas activas';

    const categoriesText =
      context.top_categories.length > 0
        ? context.top_categories.map(c => `  • ${c.name}: ${fmt(c.amount)}`).join('\n')
        : '  Sin datos de categorías';

    return `Eres ORIA, una asesora financiera personal inteligente para latinoamericanos. Tu misión es ayudar al usuario a entender, organizar y mejorar su patrimonio.

SITUACIÓN FINANCIERA ACTUAL DEL USUARIO (datos reales de este mes):
- Ingresos: ${fmt(context.monthly_income)}
- Gastos: ${fmt(context.monthly_expenses)}
- Ahorro neto: ${fmt(context.monthly_income - context.monthly_expenses)}
- Tasa de ahorro: ${(context.savings_rate * 100).toFixed(1)}%
${context.credit_limit > 0 ? `- Deuda tarjetas de crédito: ${fmt(context.credit_debt)} / cupo ${fmt(context.credit_limit)} (${Math.round((context.credit_debt / context.credit_limit) * 100)}% utilizado)` : ''}

TOP CATEGORÍAS DE GASTO ESTE MES:
${categoriesText}

METAS ACTIVAS:
${goalsText}

INSTRUCCIONES:
- Responde siempre en español, de forma concisa y amigable
- Usa los datos reales del usuario en tus respuestas
- Sé una asesora proactiva: da recomendaciones concretas y accionables
- Máximo 3 párrafos por respuesta; usa emojis con moderación
- Si el usuario pregunta algo que no está en los datos, indícalo honestamente`;
  }

  private generateSuggestions(context: {
    savings_rate: number;
    active_goals: Array<unknown>;
    top_categories: Array<{ name: string; amount: number }>;
  }): string[] {
    if (context.savings_rate < 0.1) {
      return [
        '¿Cómo puedo reducir mis gastos?',
        '¿Cuáles son mis gastos más altos?',
        '¿Cómo crear un presupuesto?',
        '¿Qué debería priorizar?',
      ];
    }
    if (context.active_goals.length === 0) {
      return [
        '¿Qué metas debería tener?',
        '¿Cómo crear un fondo de emergencia?',
        '¿Cuánto necesito para retirarme?',
        '¿Cómo empezar a invertir?',
      ];
    }
    return [
      '¿En qué gasto más este mes?',
      '¿Cuánto puedo ahorrar?',
      '¿Estoy cerca de mis metas?',
      '¿Cómo mejorar mi tasa de ahorro?',
    ];
  }
}

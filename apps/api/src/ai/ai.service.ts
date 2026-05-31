import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';
import { AiChatDto } from './dto/ai-chat.dto';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: configService.getOrThrow<string>('OPENAI_API_KEY'),
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

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...existingMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: dto.message },
    ];

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content || 'Lo siento, no pude procesar tu consulta.';

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

    const suggestions = this.generateSuggestions(dto.message, context);

    return {
      reply,
      conversation_id: conversationId,
      suggestions,
    };
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

    // Savings rate insight
    if (context.savings_rate < 0.1) {
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

    // Use AI to generate personalized insights
    if (context.monthly_income > 0) {
      const prompt = `Eres un CFO personal analizando la situación financiera de un usuario latinoamericano.

Datos financieros:
- Patrimonio neto: ${context.net_worth.toLocaleString()} ${context.currency}
- Ingresos mensuales: ${context.monthly_income.toLocaleString()} ${context.currency}
- Gastos mensuales: ${context.monthly_expenses.toLocaleString()} ${context.currency}
- Tasa de ahorro: ${(context.savings_rate * 100).toFixed(1)}%
- Metas activas: ${context.active_goals.length}

Genera exactamente 2 insights financieros cortos y accionables en formato JSON array:
[{"type": "string", "title": "string (max 50 chars)", "description": "string (max 150 chars)", "severity": "info|warning|success|alert"}]

Solo responde con el JSON, sin markdown ni texto adicional.`;

      try {
        const aiResponse = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.5,
        });

        const aiText = aiResponse.choices[0]?.message?.content || '[]';
        const aiInsights = JSON.parse(aiText);

        for (const insight of aiInsights) {
          insights.push({
            insight_type: insight.type,
            title: insight.title,
            description: insight.description,
            severity: insight.severity,
            data: {},
          });
        }
      } catch {
        // AI insights generation failed silently
      }
    }

    // Persist insights
    for (const insight of insights) {
      await this.supabase.from('ai_insights').insert({
        user_id: userId,
        ...insight,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return insights;
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

    const [accountsRes, transactionsRes, goalsRes, netWorthRes, profileRes] = await Promise.all([
      this.supabase.from('accounts').select('*').eq('user_id', userId).eq('is_active', true),
      this.supabase.from('transactions').select('amount, transaction_type, category_id, category:categories(name)').eq('user_id', userId).gte('date', dateFrom).lte('date', dateTo),
      this.supabase.from('goals').select('*').eq('user_id', userId).eq('status', 'active'),
      this.supabase.from('net_worth_snapshots').select('net_worth').eq('user_id', userId).order('snapshot_date', { ascending: false }).limit(1).single(),
      this.supabase.from('profiles').select('currency_code, country_code').eq('id', userId).single(),
    ]);

    const transactions = transactionsRes.data || [];
    const income = transactions.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    return {
      net_worth: Number(netWorthRes.data?.net_worth) || 0,
      monthly_income: income,
      monthly_expenses: expenses,
      savings_rate: income > 0 ? (income - expenses) / income : 0,
      accounts: accountsRes.data || [],
      active_goals: goalsRes.data || [],
      currency: profileRes.data?.currency_code || 'COP',
      country: profileRes.data?.country_code || 'CO',
      top_expense_categories: [],
    };
  }

  private buildSystemPrompt(context: Awaited<ReturnType<typeof this.buildFinancialContext>>): string {
    return `Eres Nexo, un CFO personal impulsado por IA para latinoamericanos. Tu misión es ayudar al usuario a entender, organizar y aumentar su patrimonio.

SITUACIÓN FINANCIERA ACTUAL DEL USUARIO:
- Patrimonio neto: ${context.net_worth.toLocaleString()} ${context.currency}
- Ingresos este mes: ${context.monthly_income.toLocaleString()} ${context.currency}
- Gastos este mes: ${context.monthly_expenses.toLocaleString()} ${context.currency}
- Ahorro neto: ${(context.monthly_income - context.monthly_expenses).toLocaleString()} ${context.currency}
- Tasa de ahorro: ${(context.savings_rate * 100).toFixed(1)}%
- Metas activas: ${context.active_goals.length}
- Cuentas: ${context.accounts.length}

INSTRUCCIONES:
- Responde siempre en español
- Sé conciso, claro y accionable (máximo 3 párrafos)
- Usa números reales del contexto cuando sea relevante
- Actúa como un CFO personal, no como un chatbot genérico
- Da recomendaciones específicas y prácticas
- Cuando el usuario pregunta sobre su situación, interpreta los datos y da una perspectiva honesta
- Usa emojis ocasionalmente para hacer la respuesta más amigable
- Sugiere próximos pasos concretos`;
  }

  private generateSuggestions(message: string, context: { monthly_income: number; savings_rate: number; active_goals: Array<unknown> }): string[] {
    const suggestions = [
      '¿Cuánto estoy ahorrando este mes?',
      '¿Cómo mejorar mi tasa de ahorro?',
      '¿Cuándo alcanzaré mi meta de emergencia?',
      '¿En qué estoy gastando más?',
      '¿Cómo está mi patrimonio este año?',
    ];

    if (context.savings_rate < 0.1) {
      return [
        '¿Cómo puedo reducir mis gastos?',
        '¿Cuáles son mis gastos más altos?',
        '¿Cómo crear un presupuesto?',
        '¿Qué debería priorizar financieramente?',
      ];
    }

    if (context.active_goals.length === 0) {
      return [
        '¿Qué metas financieras debería tener?',
        '¿Cómo crear un fondo de emergencia?',
        '¿Cuánto necesito para retirarme?',
        '¿Cómo empezar a invertir?',
      ];
    }

    return suggestions.filter(s => !s.toLowerCase().includes(message.toLowerCase().substring(0, 5))).slice(0, 4);
  }
}

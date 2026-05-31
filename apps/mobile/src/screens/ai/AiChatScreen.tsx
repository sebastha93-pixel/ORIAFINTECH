import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { api } from '../../services/api';
import { AiMessage } from '@nexo/shared';

const QUICK_PROMPTS = [
  '¿Cuánto gasté en restaurantes este mes?',
  '¿Cómo está mi patrimonio?',
  '¿Cuándo alcanzo mi meta?',
  '¿En qué puedo ahorrar más?',
  '¿Estoy mejor que el mes pasado?',
];

// ─────────────────────────────────────────────
export function AiChatScreen() {
  const [messages, setMessages]         = useState<AiMessage[]>([]);
  const [input, setInput]               = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [conversationId, setConvId]     = useState<string | undefined>();
  const [suggestions, setSuggestions]   = useState<string[]>(QUICK_PROMPTS);
  const listRef = useRef<FlatList>(null);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: AiMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.chat(text, conversationId);
      const botMsg: AiMessage = {
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMsg]);
      setConvId(res.conversation_id);
      if (res.suggestions?.length) setSuggestions(res.suggestions);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Ocurrió un error. Por favor intenta de nuevo.', timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [isLoading, conversationId]);

  // ─────────────────────────────────────────
  const renderMsg = ({ item, index }: { item: AiMessage; index: number }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
        {!isUser && (
          <View style={styles.avatar}>
            <LinearGradient colors={[Colors.primaryGlow, Colors.accent]} style={styles.avatarGrad}>
              <Text style={styles.avatarLetter}>N</Text>
            </LinearGradient>
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <LinearGradient colors={['#0D1B3E', Colors.background]} style={styles.header}>
        <View style={styles.headerRow}>
          {/* Avatar */}
          <LinearGradient colors={[Colors.primaryGlow, Colors.accent]} style={styles.headerAvatar}>
            <Text style={styles.headerAvatarLetter}>N</Text>
          </LinearGradient>

          <View style={styles.headerInfo}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>IA Financiera</Text>
              <View style={styles.betaChip}>
                <Text style={styles.betaText}>Beta</Text>
              </View>
            </View>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Tu CFO personal · en línea</Text>
            </View>
          </View>

          {/* New chat */}
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={() => { setMessages([]); setConvId(undefined); }}
          >
            <Ionicons name="add" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── EMPTY STATE ── */}
      {messages.length === 0 && (
        <View style={styles.empty}>
          <LinearGradient
            colors={[Colors.accent + '20', Colors.primaryGlow + '10']}
            style={styles.emptyIcon}
          >
            <Ionicons name="chatbubble-ellipses" size={36} color={Colors.accent} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Pregúntame cualquier cosa</Text>
          <Text style={styles.emptySub}>
            Analizo tu situación financiera en tiempo real y te doy consejos personalizados.
          </Text>

          <View style={styles.promptGrid}>
            {QUICK_PROMPTS.map((p, i) => (
              <TouchableOpacity
                key={i}
                style={styles.promptChip}
                onPress={() => send(p)}
              >
                <Text style={styles.promptText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── MESSAGES ── */}
      {messages.length > 0 && (
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMsg}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Typing indicator */}
      {isLoading && (
        <View style={styles.typing}>
          <View style={styles.avatar}>
            <LinearGradient colors={[Colors.primaryGlow, Colors.accent]} style={styles.avatarGrad}>
              <Text style={styles.avatarLetter}>N</Text>
            </LinearGradient>
          </View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.typingText}>Nexo está analizando...</Text>
          </View>
        </View>
      )}

      {/* Quick suggestions (after conversation starts) */}
      {messages.length > 0 && !isLoading && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={suggestions.slice(0, 3)}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.suggChip} onPress={() => send(item)}>
              <Text style={styles.suggText}>{item}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.suggRow}
          style={styles.suggList}
        />
      )}

      {/* ── INPUT ── */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe tu pregunta..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnOff]}
          onPress={() => send(input)}
          disabled={!input.trim() || isLoading}
        >
          <LinearGradient
            colors={input.trim() ? Colors.gradientAccent : [Colors.border, Colors.border]}
            style={styles.sendGrad}
          >
            <Ionicons name="send" size={17} color={input.trim() ? '#fff' : Colors.textMuted} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  headerAvatarLetter: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
  headerInfo: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: Typography.bold },
  betaChip: {
    backgroundColor: Colors.accent + '25', borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  betaText: { color: Colors.accent, fontSize: 10, fontWeight: Typography.semibold },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  onlineText: { color: Colors.textMuted, fontSize: Typography.xs },
  newChatBtn: { padding: Spacing.xs },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: Typography.bold, textAlign: 'center', marginBottom: Spacing.xs },
  emptySub: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  promptGrid: { width: '100%', gap: Spacing.sm },
  promptChip: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  promptText: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center' },

  // Messages
  msgList: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl },
  msgRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot:  { justifyContent: 'flex-start' },

  avatar: { alignSelf: 'flex-end' },
  avatarGrad: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: Typography.xs, fontWeight: Typography.bold },

  bubble: { maxWidth: '78%', borderRadius: BorderRadius.lg, padding: Spacing.md },
  bubbleUser: {
    backgroundColor: Colors.primaryGlow,
    borderBottomRightRadius: BorderRadius.xs,
  },
  bubbleBot: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: BorderRadius.xs,
    borderWidth: 1, borderColor: Colors.border,
  },
  bubbleText: { fontSize: Typography.base, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextBot:  { color: Colors.textPrimary },

  // Typing
  typing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  typingText: { color: Colors.textSecondary, fontSize: Typography.xs },

  // Suggestions
  suggList: { maxHeight: 44 },
  suggRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xs },
  suggChip: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.accent + '40',
  },
  suggText: { color: Colors.accent, fontSize: Typography.xs },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    padding: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    color: Colors.textPrimary, fontSize: Typography.base,
    maxHeight: 120,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: { alignSelf: 'flex-end' },
  sendBtnOff: { opacity: 0.5 },
  sendGrad: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
});

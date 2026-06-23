import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { api } from '../../services/api';
import { AiMessage } from '../../types';

const QUICK_PROMPTS = [
  '¿Cuánto gasté en restaurantes este mes?',
  '¿Cómo está mi patrimonio?',
  '¿Cuándo alcanzo mi meta?',
  '¿En qué puedo ahorrar más?',
  '¿Estoy mejor que el mes pasado?',
];

// ─────────────────────────────────────────────
export function AiChatScreen() {
  const [messages, setMessages]       = useState<AiMessage[]>([]);
  const [input, setInput]             = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [conversationId, setConvId]   = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>(QUICK_PROMPTS);
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

  // ── ORIA avatar — #002A1F circle with star icon ──────────
  const OriaAvatar = ({ size = 32 }: { size?: number }) => (
    <View style={[styles.oriaAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="sparkles" size={size * 0.5} color={Colors.accent} />
    </View>
  );

  // ─────────────────────────────────────────
  const renderMsg = ({ item }: { item: AiMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
        {!isUser && (
          <View style={styles.avatarWrap}>
            <OriaAvatar size={30} />
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
      {/* ── HEADER: "ORIA" title + star icon + Activa status ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {/* ORIA avatar */}
          <OriaAvatar size={42} />

          <View style={styles.headerInfo}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>ORIA</Text>
              {/* Active status chip */}
              <View style={styles.activeChip}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Activa</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>Tu CFO personal · en línea</Text>
          </View>

          {/* New chat */}
          <Pressable
            style={({ pressed }) => [styles.newChatBtn, pressed && { opacity: 0.72 }]}
            onPress={() => { setMessages([]); setConvId(undefined); }}
          >
            <Ionicons name="create-outline" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* ── EMPTY STATE ── */}
      {messages.length === 0 && (
        <View style={styles.empty}>
          {/* Large ORIA icon */}
          <View style={styles.emptyIcon}>
            <Ionicons name="sparkles" size={36} color={Colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>Pregúntame cualquier cosa</Text>
          <Text style={styles.emptySub}>
            Analizo tu situación financiera en tiempo real y te doy consejos personalizados.
          </Text>

          {/* Suggestion chips — surface2 bg, borderLight border, 99px radius */}
          <View style={styles.promptGrid}>
            {QUICK_PROMPTS.map((p, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.promptChip, pressed && { opacity: 0.72 }]}
                onPress={() => send(p)}
              >
                <Text style={styles.promptText}>{p}</Text>
              </Pressable>
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

      {/* ── TYPING INDICATOR ── */}
      {isLoading && (
        <View style={styles.typing}>
          <OriaAvatar size={30} />
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.typingText}>ORIA está analizando...</Text>
          </View>
        </View>
      )}

      {/* ── QUICK SUGGESTIONS (after conversation starts) ── */}
      {messages.length > 0 && !isLoading && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={suggestions.slice(0, 3)}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.suggChip, pressed && { opacity: 0.72 }]}
              onPress={() => send(item)}
            >
              <Text style={styles.suggText}>{item}</Text>
            </Pressable>
          )}
          contentContainerStyle={styles.suggRow}
          style={styles.suggList}
        />
      )}

      {/* ── INPUT BAR ── */}
      <View style={styles.inputBar}>
        {/* Input field — surface2 bg */}
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe tu pregunta..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
        />
        {/* Send button — accent bg */}
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            !input.trim() && styles.sendBtnOff,
            pressed && { opacity: 0.72 },
          ]}
          onPress={() => send(input)}
          disabled={!input.trim() || isLoading}
        >
          <View style={[styles.sendGrad, { backgroundColor: input.trim() ? Colors.accent : Colors.surfaceMid }]}>
            <Ionicons name="send" size={17} color={input.trim() ? Colors.background : Colors.textMuted} />
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header — flat bg
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  // ORIA avatar — accentBg circle
  oriaAvatar: {
    backgroundColor: Colors.accentBg,
    justifyContent: 'center', alignItems: 'center',
  },

  headerInfo: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: {
    color: Colors.textPrimary, fontSize: Typography.md,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold,
  },

  // Active status chip
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentBg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.accent },
  activeText: { color: Colors.accent, fontSize: 10, fontWeight: Typography.semibold },

  headerSub: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  newChatBtn: { padding: Spacing.xs },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.accentBg,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  emptyTitle: {
    color: Colors.textPrimary, fontSize: Typography.lg,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold,
    textAlign: 'center', marginBottom: Spacing.xs,
  },
  emptySub: {
    color: Colors.textSecondary, fontSize: Typography.sm,
    textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl,
  },
  promptGrid: { width: '100%', gap: Spacing.sm },
  // Suggestion chips — surface2 bg, borderLight border
  promptChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 99,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  promptText: {
    color: Colors.textSecondary, fontSize: Typography.xs,
    fontFamily: Typography.fontSans,
    textAlign: 'center',
  },

  // Messages
  msgList: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl },
  msgRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot:  { justifyContent: 'flex-start' },

  avatarWrap: { alignSelf: 'flex-end' },

  // User bubbles: accentBg bg, accent text, border-right-radius 3px
  // ORIA bubbles: surfaceElevated bg, textPrimary, border-left-radius 3px
  bubble: { maxWidth: '78%', borderRadius: BorderRadius.lg, padding: Spacing.md },
  bubbleUser: {
    backgroundColor: Colors.accentBg,
    borderBottomRightRadius: 3,
  },
  bubbleBot: {
    backgroundColor: Colors.surfaceElevated,
    borderBottomLeftRadius: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  bubbleText: { fontSize: Typography.base, lineHeight: 22 },
  bubbleTextUser: { color: Colors.accent },
  bubbleTextBot:  { color: Colors.textPrimary },

  // Typing
  typing: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs,
  },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  typingText: { color: Colors.textSecondary, fontSize: Typography.xs },

  // Suggestions (after conversation starts) — surface2 bg, borderLight border
  suggList: { maxHeight: 44 },
  suggRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xs },
  suggChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 99,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  suggText: { color: Colors.textSecondary, fontSize: Typography.xs, fontFamily: Typography.fontSans },

  // Input bar — surface bg
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    padding: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
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

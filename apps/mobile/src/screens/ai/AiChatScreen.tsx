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

const SUGGESTED_PROMPTS = [
  '¿Cómo está mi patrimonio?',
  '¿En qué estoy gastando más?',
  '¿Cuándo alcanzo mi meta?',
  '¿Cómo mejorar mi ahorro?',
  '¿Estoy mejor que hace un año?',
];

export function AiChatScreen() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>(SUGGESTED_PROMPTS);
  const listRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: AiMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.chat(text, conversationId);
      const assistantMsg: AiMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setConversationId(response.conversation_id);
      if (response.suggestions?.length) setSuggestions(response.suggestions);
    } catch {
      const errorMsg: AiMessage = {
        role: 'assistant',
        content: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [isLoading, conversationId]);

  const renderMessage = ({ item }: { item: AiMessage }) => (
    <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
      {item.role === 'assistant' && (
        <View style={styles.assistantAvatar}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatarGradient}>
            <Text style={styles.avatarText}>N</Text>
          </LinearGradient>
        </View>
      )}
      <View style={[styles.messageContent, item.role === 'user' ? styles.userContent : styles.assistantContent]}>
        <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <LinearGradient colors={['#1A1A2E', Colors.background]} style={styles.header}>
        <View style={styles.headerContent}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.nexoIcon}>
            <Text style={styles.nexoIconText}>N</Text>
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Nexo IA</Text>
            <Text style={styles.headerSubtitle}>Tu CFO personal</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <LinearGradient colors={[Colors.primary + '20', Colors.primaryDark + '10']} style={styles.emptyIcon}>
            <Ionicons name="chatbubble-ellipses" size={40} color={Colors.primary} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Tu CFO personal está listo</Text>
          <Text style={styles.emptySubtitle}>Pregúntame sobre tu situación financiera, metas, o pídeme consejos personalizados.</Text>
          <View style={styles.suggestions}>
            {suggestions.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionChip} onPress={() => sendMessage(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.typingIndicator}>
          <View style={styles.assistantAvatar}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatarGradient}>
              <Text style={styles.avatarText}>N</Text>
            </LinearGradient>
          </View>
          <View style={styles.typingDots}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.typingText}>Nexo está analizando...</Text>
          </View>
        </View>
      )}

      {/* Quick suggestions after conversation */}
      {messages.length > 0 && !isLoading && (
        <View style={styles.quickSuggestions}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={suggestions.slice(0, 3)}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.quickChip} onPress={() => sendMessage(item)}>
                <Text style={styles.quickChipText}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}
          />
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Pregúntale a Nexo IA..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage(input)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
        >
          <LinearGradient
            colors={input.trim() ? [Colors.primary, Colors.primaryDark] : [Colors.border, Colors.border]}
            style={styles.sendBtnGradient}
          >
            <Ionicons name="send" size={18} color={Colors.textPrimary} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingTop: 60, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nexoIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  nexoIconText: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: Typography.bold },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: Typography.bold },
  headerSubtitle: { color: Colors.textSecondary, fontSize: Typography.xs },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: Typography.bold, textAlign: 'center', marginBottom: Spacing.sm },
  emptySubtitle: { color: Colors.textSecondary, fontSize: Typography.base, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  suggestions: { gap: Spacing.sm, width: '100%' },
  suggestionChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionText: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center' },

  messagesList: { padding: Spacing.lg, gap: Spacing.md },
  messageBubble: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  userBubble: { justifyContent: 'flex-end' },
  assistantBubble: { justifyContent: 'flex-start' },
  assistantAvatar: { alignSelf: 'flex-end' },
  avatarGradient: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.textPrimary, fontSize: Typography.sm, fontWeight: Typography.bold },
  messageContent: { maxWidth: '80%', borderRadius: BorderRadius.lg, padding: Spacing.md },
  userContent: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  assistantContent: { backgroundColor: Colors.surfaceElevated, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  messageText: { fontSize: Typography.base, lineHeight: 22 },
  userText: { color: Colors.textPrimary },
  assistantText: { color: Colors.textPrimary },

  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, padding: Spacing.sm },
  typingText: { color: Colors.textSecondary, fontSize: Typography.xs },

  quickSuggestions: { paddingVertical: Spacing.xs },
  quickChip: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.primary + '40' },
  quickChipText: { color: Colors.primary, fontSize: Typography.xs },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: Typography.base,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: { alignSelf: 'flex-end' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnGradient: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});

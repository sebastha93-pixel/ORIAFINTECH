import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { login, clearError } from '../../store/slices/authSlice';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';

export function LoginScreen({ navigation }: { navigation: { navigate: (s: string) => void } }) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Campos requeridos', 'Completa todos los campos'); return; }
    dispatch(clearError());
    await dispatch(login({ email: email.trim().toLowerCase(), password }));
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Background: flat #0A0C0F, no gradient */}
      {/* Subtle accent glow orb (not blue) */}
      <View style={styles.orbAccent} />

      <View style={styles.content}>
        {/* Logo area — ORIA with sparkles icon in accent */}
        <View style={styles.logoArea}>
          <View style={styles.logoIconWrap}>
            <View style={styles.logoIconBg}>
              <Ionicons name="sparkles" size={32} color={Colors.accent} />
            </View>
          </View>
          <Text style={styles.brand}>ORIA</Text>
          <Text style={styles.brandSub}>FINANZAS</Text>
          <Text style={styles.tagline}>Tu dinero conectado.{'\n'}Tus decisiones más claras.</Text>
        </View>

        {/* Login card — surface bg */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Iniciar sesión</Text>

          {error && (
            <View style={styles.errBanner}>
              <Ionicons name="alert-circle" size={15} color={Colors.danger} />
              <Text style={styles.errText}>{error}</Text>
            </View>
          )}

          {/* Email field: surface2 bg, borderLight border */}
          <View style={styles.field}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.fieldIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password field */}
          <View style={styles.field}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.fieldIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Contraseña"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgot}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Primary button — flat accent bg, no gradient */}
          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.btn,
              pressed && { opacity: 0.72, transform: [{ scale: 0.97 }] },
            ]}
          >
            {isLoading
              ? <ActivityIndicator color={Colors.background} />
              : <Text style={styles.btnText}>Entrar</Text>}
          </Pressable>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Regístrate gratis</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Subtle accent glow orb (replacing blue orbs)
  orbAccent: {
    position: 'absolute', borderRadius: 300, opacity: 0.06,
    width: 280, height: 280, backgroundColor: Colors.accent,
    bottom: 60, right: -80,
  },

  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },

  // Logo area
  logoArea: { alignItems: 'center', marginBottom: Spacing.xxl },
  logoIconWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  logoIconBg: {
    width: 72, height: 72, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.accentBg,
    justifyContent: 'center', alignItems: 'center',
  },
  brand: {
    color: Colors.textPrimary, fontSize: 26,
    fontWeight: Typography.extrabold, letterSpacing: 4,
    fontFamily: Typography.fontSansBold,
  },
  brandSub: {
    color: Colors.textMuted, fontSize: 9, letterSpacing: 6,
    marginTop: -2, marginBottom: Spacing.md,
  },
  tagline: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center', lineHeight: 22 },

  // Login card — surface bg, 8px radius
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
    gap: Spacing.md,
  },
  cardTitle: {
    color: Colors.textPrimary, fontSize: Typography.lg,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold,
  },

  errBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.dangerBg, borderRadius: 8,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.danger + '40',
  },
  errText: { color: Colors.danger, fontSize: Typography.xs, flex: 1 },

  // Input fields: surface2 bg, borderLight border
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceMid, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
  },
  fieldIcon: { marginRight: Spacing.sm },
  input: { flex: 1, height: 50, color: Colors.textPrimary, fontSize: Typography.base },
  eyeBtn: { padding: 4 },

  forgot: { alignSelf: 'flex-end', marginTop: -6 },
  forgotText: { color: Colors.accent, fontSize: Typography.sm },

  // Primary button — flat accent bg, 10px radius
  btn: {
    height: 52, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.accent, borderRadius: 10,
  },
  btnText: {
    color: Colors.background, fontSize: Typography.base,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold,
  },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { color: Colors.textSecondary, fontSize: Typography.sm },
  registerLink: { color: Colors.accent, fontSize: Typography.sm, fontWeight: Typography.semibold },
});

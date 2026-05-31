import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { login, clearError } from '../../store/slices/authSlice';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';

export function LoginScreen({ navigation }: { navigation: { navigate: (s: string) => void } }) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Campos requeridos', 'Completa todos los campos'); return; }
    dispatch(clearError());
    await dispatch(login({ email: email.trim().toLowerCase(), password }));
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Background */}
      <LinearGradient colors={['#050A18', '#070B14']} style={StyleSheet.absoluteFillObject} />

      {/* Glow orbs */}
      <View style={[styles.orb, styles.orbBlue]} />
      <View style={[styles.orb, styles.orbGreen]} />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoIconWrap}>
            <LinearGradient colors={[Colors.primaryGlow, Colors.accent]} style={styles.logoGrad}>
              <Text style={styles.logoLetter}>N</Text>
            </LinearGradient>
          </View>
          <Text style={styles.brand}>NEXO</Text>
          <Text style={styles.brandSub}>FINANZAS</Text>
          <Text style={styles.tagline}>Tu dinero conectado.{'\n'}Tus decisiones más claras.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Iniciar sesión</Text>

          {error && (
            <View style={styles.errBanner}>
              <Ionicons name="alert-circle" size={15} color={Colors.danger} />
              <Text style={styles.errText}>{error}</Text>
            </View>
          )}

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

          <TouchableOpacity onPress={handleLogin} disabled={isLoading} style={styles.btnWrap}>
            <LinearGradient colors={Colors.gradientAccent} style={styles.btn}>
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Entrar</Text>}
            </LinearGradient>
          </TouchableOpacity>

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
  orb: { position: 'absolute', borderRadius: 300, opacity: 0.12 },
  orbBlue: { width: 300, height: 300, backgroundColor: Colors.primary, top: -80, left: -80 },
  orbGreen: { width: 200, height: 200, backgroundColor: Colors.accent, bottom: 100, right: -60 },

  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  logoArea: { alignItems: 'center', marginBottom: Spacing.xxl },
  logoIconWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  logoGrad: { width: 68, height: 68, justifyContent: 'center', alignItems: 'center' },
  logoLetter: { color: '#fff', fontSize: 32, fontWeight: Typography.extrabold },
  brand: { color: Colors.textPrimary, fontSize: 26, fontWeight: Typography.extrabold, letterSpacing: 4 },
  brandSub: { color: Colors.textMuted, fontSize: 9, letterSpacing: 6, marginTop: -2, marginBottom: Spacing.md },
  tagline: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
    gap: Spacing.md,
  },
  cardTitle: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: Typography.bold },

  errBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.dangerBg, borderRadius: BorderRadius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.danger + '40',
  },
  errText: { color: Colors.danger, fontSize: Typography.xs, flex: 1 },

  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  fieldIcon: { marginRight: Spacing.sm },
  input: { flex: 1, height: 50, color: Colors.textPrimary, fontSize: Typography.base },
  eyeBtn: { padding: 4 },

  forgot: { alignSelf: 'flex-end', marginTop: -6 },
  forgotText: { color: Colors.primaryGlow, fontSize: Typography.sm },

  btnWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  btn: { height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: BorderRadius.lg },
  btnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { color: Colors.textSecondary, fontSize: Typography.sm },
  registerLink: { color: Colors.accent, fontSize: Typography.sm, fontWeight: Typography.semibold },
});

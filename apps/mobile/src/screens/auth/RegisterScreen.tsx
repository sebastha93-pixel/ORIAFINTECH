import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { register, clearError } from '../../store/slices/authSlice';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';

export function RegisterScreen({ navigation }: { navigation: { navigate: (screen: string) => void; goBack: () => void } }) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Campos requeridos', 'Por favor completa todos los campos');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }
    dispatch(clearError());
    await dispatch(register({ email: email.trim().toLowerCase(), password, fullName: fullName.trim() }));
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0A0A1F', '#0A0A0F']} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.logoGradient}>
            <Text style={styles.logoText}>N</Text>
          </LinearGradient>
          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>Empieza a construir tu futuro financiero hoy</Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor={Colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
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

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Contraseña (mín. 8 caracteres)"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleRegister} disabled={isLoading} style={styles.btnWrapper}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.btn}>
              {isLoading ? (
                <ActivityIndicator color={Colors.textPrimary} />
              ) : (
                <Text style={styles.btnText}>Crear cuenta gratuita</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.terms}>
            Al registrarte, aceptas nuestros{' '}
            <Text style={styles.link}>Términos de servicio</Text> y{' '}
            <Text style={styles.link}>Política de privacidad</Text>
          </Text>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  backBtn: { position: 'absolute', left: 0, top: 0, padding: Spacing.xs },
  logoGradient: { width: 64, height: 64, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  logoText: { color: Colors.textPrimary, fontSize: 28, fontWeight: Typography.bold },
  title: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: Typography.bold, marginBottom: Spacing.xs },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center' },
  form: { gap: Spacing.md },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.danger + '20', borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.danger + '40' },
  errorText: { color: Colors.danger, fontSize: Typography.sm, flex: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, height: 52, color: Colors.textPrimary, fontSize: Typography.base },
  eyeBtn: { padding: Spacing.xs },
  btnWrapper: {},
  btn: { height: 52, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: Colors.textPrimary, fontSize: Typography.base, fontWeight: Typography.bold },
  terms: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center', lineHeight: 18 },
  link: { color: Colors.primary },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { color: Colors.textSecondary, fontSize: Typography.sm },
  loginLink: { color: Colors.primary, fontSize: Typography.sm, fontWeight: Typography.semibold },
});

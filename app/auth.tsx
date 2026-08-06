import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/data/AuthContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !isSubmitting;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email.trim(), password);
        router.replace('/');
      } else {
        const { needsEmailConfirmation } = await signUp(email.trim(), password);
        if (needsEmailConfirmation) {
          Alert.alert('Check your email', 'Confirm your address, then sign in below.');
          setMode('sign-in');
        } else {
          router.replace('/');
        }
      }
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer style={styles.content}>
      <Text style={styles.eyebrow}>Welcome to</Text>
      <Text style={styles.appName}>FamilyQuest</Text>
      <Text style={styles.subtitle}>
        Sign in as a parent to keep your family&apos;s routines in sync across everyone&apos;s
        devices.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <Button
          label={mode === 'sign-in' ? 'Sign in' : 'Create account'}
          onPress={handleSubmit}
          disabled={!canSubmit}
          fullWidth
        />

        <Button
          label={mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          variant="ghost"
          fullWidth
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: '600',
  },
  appName: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 2,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.lg,
    backgroundColor: colors.background,
  },
});

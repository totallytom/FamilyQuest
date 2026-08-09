import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { useAppData } from '@/data/AppDataContext';
import { useAuth } from '@/data/AuthContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';

export default function KidCodeScreen() {
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const { members } = useAppData();
  const { createKidPairingCode } = useAuth();
  const member = members.find((m) => m.id === memberId);

  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;
    createKidPairingCode(memberId)
      .then(setCode)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [memberId, createKidPairingCode]);

  if (!member) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <EmptyState icon="alert-circle" title="Family member not found" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['left', 'right']} style={styles.content}>
      <Stack.Screen options={{ title: `${member.name}'s code` }} />

      <Text style={styles.subtitle}>
        On {member.name}&apos;s own phone, install FamilyQuest, choose &quot;I have a code from my
        parent&quot;, and enter this code. It expires in 1 hour.
      </Text>

      <Card style={styles.card}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : !code ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <>
            <View style={styles.qrWrap}>
              <QRCode value={code} size={180} />
            </View>
            <Text style={styles.code}>{code}</Text>
          </>
        )}
      </Card>

      <Button label="Done" onPress={() => router.back()} fullWidth />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginBottom: spacing.xl,
  },
  qrWrap: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  code: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 4,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.danger,
    textAlign: 'center',
  },
});

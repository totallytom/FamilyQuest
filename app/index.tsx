import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppData } from '@/data/AppDataContext';
import { useAuth } from '@/data/AuthContext';
import { colors } from '@/theme/theme';

export default function Index() {
  const { isLoading: appDataLoading, family } = useAppData();
  const { isLoading: authLoading } = useAuth();
  const isLoading = appDataLoading || authLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return family ? <Redirect href="/(tabs)" /> : <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { colors, radius, shadow, spacing } from '@/theme/theme';

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow.card,
  },
});

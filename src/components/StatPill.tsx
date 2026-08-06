import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontSize, radius, spacing } from '@/theme/theme';

interface StatPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
}

export function StatPill({ icon, iconColor, label }: StatPillProps) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={14} color={iconColor} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cardAlt,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
});

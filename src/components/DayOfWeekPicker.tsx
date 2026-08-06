import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Weekday } from '@/types/models';
import { WEEKDAY_LABELS } from '@/types/models';
import { colors, fontSize, spacing } from '@/theme/theme';

interface DayOfWeekPickerProps {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
}

export function DayOfWeekPicker({ value, onChange }: DayOfWeekPickerProps) {
  const toggle = (day: Weekday) => {
    if (value.includes(day)) onChange(value.filter((d) => d !== day));
    else onChange([...value, day].sort());
  };

  return (
    <View style={styles.row}>
      {WEEKDAY_LABELS.map((label, index) => {
        const day = index as Weekday;
        const active = value.includes(day);
        return (
          <Pressable key={index} onPress={() => toggle(day)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.white,
  },
});

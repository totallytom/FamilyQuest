import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';

import { useAppData, useMyMember } from '@/data/AppDataContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { avatarEmojis, avatarPalette } from '@/theme/colors';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState } from '@/components/EmptyState';
import type { Role } from '@/types/models';

export default function AddMemberScreen() {
  const { addMember, members } = useAppData();
  const myMember = useMyMember();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('kid');
  const [color, setColor] = useState<string>(avatarPalette[members.length % avatarPalette.length]);
  const [emoji, setEmoji] = useState<string>(avatarEmojis[members.length % avatarEmojis.length]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await addMember({ name: name.trim(), role, color, emoji });
    router.back();
  };

  if (myMember?.role !== 'parent') {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <Stack.Screen options={{ title: 'Add Family Member' }} />
        <EmptyState icon="lock-closed" title="Parents only" subtitle="Switch to a parent profile to add family members." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['left', 'right']}>
      <Stack.Screen options={{ title: 'Add Family Member' }} />

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoFocus
      />

      <View style={styles.roleToggle}>
        {(['kid', 'parent'] as Role[]).map((r) => (
          <Pressable key={r} onPress={() => setRole(r)} style={[styles.roleOption, role === r && styles.roleOptionActive]}>
            <Text style={[styles.roleOptionText, role === r && styles.roleOptionTextActive]}>{r === 'kid' ? 'Kid' : 'Parent'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.pickerLabel}>Avatar</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
        {avatarEmojis.map((e) => (
          <Pressable key={e} onPress={() => setEmoji(e)}>
            <Avatar emoji={e} color={color} size={44} ringColor={e === emoji ? colors.primary : undefined} />
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.pickerLabel}>Color</Text>
      <View style={styles.colorRow}>
        {avatarPalette.map((c) => (
          <Pressable key={c} onPress={() => setColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]} />
        ))}
      </View>

      <Button label="Add family member" onPress={handleSave} disabled={!name.trim()} fullWidth />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.xl,
  },
  roleOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  roleOptionActive: {
    backgroundColor: colors.primary,
  },
  roleOptionText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
  },
  roleOptionTextActive: {
    color: colors.white,
  },
  pickerLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  emojiRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: colors.text,
  },
});

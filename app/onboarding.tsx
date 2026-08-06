import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppData } from '@/data/AppDataContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { avatarEmojis, avatarPalette } from '@/theme/colors';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import type { Role } from '@/types/models';

interface DraftMember {
  name: string;
  role: Role;
  color: string;
  emoji: string;
}

export default function Onboarding() {
  const { createFamily, addMember, loadDemoFamily } = useAppData();
  const [step, setStep] = useState<'family' | 'members'>('family');
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState<DraftMember[]>([]);

  const [draftName, setDraftName] = useState('');
  const [draftRole, setDraftRole] = useState<Role>('kid');
  const [draftColor, setDraftColor] = useState<string>(avatarPalette[0]);
  const [draftEmoji, setDraftEmoji] = useState<string>(avatarEmojis[0]);

  const handleTryDemo = async () => {
    await loadDemoFamily();
    router.replace('/(tabs)');
  };

  const handleContinueFromFamily = () => {
    if (!familyName.trim()) return;
    setStep('members');
  };

  const handleAddDraftMember = () => {
    if (!draftName.trim()) return;
    setMembers((prev) => [...prev, { name: draftName.trim(), role: draftRole, color: draftColor, emoji: draftEmoji }]);
    setDraftName('');
    setDraftRole('kid');
    setDraftColor(avatarPalette[(members.length + 1) % avatarPalette.length]);
    setDraftEmoji(avatarEmojis[(members.length + 1) % avatarEmojis.length]);
  };

  const handleRemoveDraftMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (members.length === 0) return;
    await createFamily(familyName.trim());
    for (const member of members) {
      await addMember(member);
    }
    router.replace('/(tabs)');
  };

  return (
    <ScreenContainer style={styles.content}>
      <Text style={styles.eyebrow}>Welcome to</Text>
      <Text style={styles.appName}>FamilyQuest</Text>
      <Text style={styles.subtitle}>
        Share daily routines with your family and check in on each other&apos;s tasks — homework,
        chores, and everything in between.
      </Text>

      {step === 'family' ? (
        <View style={styles.card}>
          <Text style={styles.label}>What&apos;s your family name?</Text>
          <TextInput
            value={familyName}
            onChangeText={setFamilyName}
            placeholder="e.g. The Rivera Family"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={handleContinueFromFamily}
          />
          <Button label="Continue" onPress={handleContinueFromFamily} disabled={!familyName.trim()} fullWidth />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button label="Try a demo family" onPress={handleTryDemo} variant="secondary" icon="sparkles" fullWidth />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Who&apos;s in {familyName}?</Text>
          <Text style={styles.helperText}>Add parents and kids — everyone can see each other&apos;s progress.</Text>

          {members.length > 0 && (
            <View style={styles.memberList}>
              {members.map((m, index) => (
                <View key={`${m.name}-${index}`} style={styles.memberRow}>
                  <Avatar emoji={m.emoji} color={m.color} size={40} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberRole}>{m.role === 'parent' ? 'Parent' : 'Kid'}</Text>
                  </View>
                  <Pressable onPress={() => handleRemoveDraftMember(index)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.draftForm}>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleAddDraftMember}
            />

            <View style={styles.roleToggle}>
              {(['kid', 'parent'] as Role[]).map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setDraftRole(role)}
                  style={[styles.roleOption, draftRole === role && styles.roleOptionActive]}
                >
                  <Text style={[styles.roleOptionText, draftRole === role && styles.roleOptionTextActive]}>
                    {role === 'kid' ? 'Kid' : 'Parent'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.pickerLabel}>Avatar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
              {avatarEmojis.map((emoji) => (
                <Pressable key={emoji} onPress={() => setDraftEmoji(emoji)}>
                  <Avatar emoji={emoji} color={draftColor} size={40} ringColor={emoji === draftEmoji ? colors.primary : undefined} />
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.colorRow}>
              {avatarPalette.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setDraftColor(color)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    draftColor === color && styles.colorSwatchActive,
                  ]}
                />
              ))}
            </View>

            <Button label="Add family member" onPress={handleAddDraftMember} variant="secondary" icon="add" disabled={!draftName.trim()} fullWidth />
          </View>

          <View style={styles.finishRow}>
            <Button label="Back" onPress={() => setStep('family')} variant="ghost" />
            <Button label="Finish setup" onPress={handleFinish} disabled={members.length === 0} />
          </View>
        </View>
      )}
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
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.sm,
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  memberList: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  memberRole: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  draftForm: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
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
    paddingBottom: spacing.md,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
  finishRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});

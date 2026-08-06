import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppData, useCurrentMember } from '@/data/AppDataContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';

export default function ProfileScreen() {
  const { family, members, currentMemberId, setCurrentMember, removeMember, resetAllData } = useAppData();
  const currentMember = useCurrentMember();

  const handleRemoveMember = (id: string, name: string) => {
    if (members.length <= 1) {
      Alert.alert("Can't remove last member", 'Every family needs at least one person.');
      return;
    }
    Alert.alert(`Remove ${name}?`, 'This deletes their routines and history too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMember(id) },
    ]);
  };

  const handleReset = () => {
    Alert.alert('Reset all data?', 'This clears your family, routines, and history from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await resetAllData();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Profile</Text>

      {currentMember && (
        <Card style={styles.currentCard}>
          <Avatar emoji={currentMember.emoji} color={currentMember.color} size={64} />
          <View style={styles.currentInfo}>
            <Text style={styles.currentName}>{currentMember.name}</Text>
            <Badge label={currentMember.role === 'kid' ? 'Kid' : 'Parent'} tone="neutral" />
          </View>
          <View style={styles.starsWrap}>
            <Ionicons name="star" size={16} color={colors.star} />
            <Text style={styles.starsText}>{currentMember.points}</Text>
          </View>
        </Card>
      )}

      <Text style={styles.sectionTitle}>{family?.name}</Text>
      <Text style={styles.sectionSubtitle}>Tap a name below to switch who's using the app.</Text>

      {members.map((member) => (
        <Pressable key={member.id} onPress={() => setCurrentMember(member.id)}>
          <Card style={styles.memberCard}>
            <Avatar emoji={member.emoji} color={member.color} size={40} ringColor={member.id === currentMemberId ? colors.primary : undefined} />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role === 'kid' ? 'Kid' : 'Parent'}</Text>
            </View>
            {member.id === currentMemberId && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            <Pressable onPress={() => handleRemoveMember(member.id, member.name)} hitSlop={8} style={styles.removeButton}>
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </Card>
        </Pressable>
      ))}

      <Button label="Add family member" onPress={() => router.push('/add-member')} variant="secondary" icon="person-add" fullWidth />

      <View style={styles.backendNote}>
        <Ionicons name="cloud-offline-outline" size={16} color={colors.textMuted} />
        <Text style={styles.backendNoteText}>
          Everything is saved on this device for now. Account sync across devices is coming soon.
        </Text>
      </View>

      <View style={styles.resetWrap}>
        <Button label="Reset all data" onPress={handleReset} variant="danger" fullWidth />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  currentInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  currentName: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  starsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cardAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  starsText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
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
  removeButton: {
    marginLeft: spacing.sm,
  },
  backendNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
  },
  backendNoteText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  resetWrap: {
    marginTop: spacing.xl,
  },
});

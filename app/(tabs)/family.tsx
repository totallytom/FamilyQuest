import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppData, useToday } from '@/data/AppDataContext';
import { memberDayStats, memberStreak } from '@/data/selectors';
import { colors, fontSize, spacing } from '@/theme/theme';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Avatar } from '@/components/Avatar';
import { ProgressRing } from '@/components/ProgressRing';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';

export default function FamilyScreen() {
  const { family, members, routines, tasks, completions } = useAppData();
  const today = useToday();

  return (
    <ScreenContainer>
      <Text style={styles.title}>{family?.name ?? 'Your Family'}</Text>
      <Text style={styles.subtitle}>Tap a family member to check in on their day.</Text>

      {members.length === 0 ? (
        <EmptyState icon="people" title="No family members yet" subtitle="Add family members from the Profile tab." />
      ) : (
        members.map((member) => {
          const stats = memberDayStats(tasks, completions, member.id, today);
          const streak = memberStreak(tasks, completions, member.id);
          const progress = stats.total > 0 ? stats.approved / stats.total : 0;
          const hasRoutines = routines.some((r) => r.memberId === member.id);

          return (
            <Pressable key={member.id} onPress={() => router.push(`/member/${member.id}`)}>
              <Card style={styles.memberCard}>
                <Avatar emoji={member.emoji} color={member.color} size={48} />
                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Badge label={member.role === 'kid' ? 'Kid' : 'Parent'} tone="neutral" />
                  </View>
                  {stats.total > 0 ? (
                    <View style={styles.statusRow}>
                      {stats.waitingReview > 0 && (
                        <Text style={styles.waitingText}>{stats.waitingReview} waiting on your review</Text>
                      )}
                      {stats.waitingReview === 0 && stats.approved === stats.total && (
                        <Text style={styles.doneText}>All caught up today ✓</Text>
                      )}
                      {stats.waitingReview === 0 && stats.approved < stats.total && (
                        <Text style={styles.pendingText}>{stats.total - stats.approved} task(s) still to do</Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.pendingText}>{hasRoutines ? 'No tasks today' : 'No routines set up yet'}</Text>
                  )}
                  {streak > 0 && (
                    <View style={styles.streakRow}>
                      <Ionicons name="flame" size={12} color={colors.warning} />
                      <Text style={styles.streakText}>{streak} day streak</Text>
                    </View>
                  )}
                </View>
                {stats.total > 0 && <ProgressRing progress={progress} size={44} strokeWidth={5} />}
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Card>
            </Pressable>
          );
        })
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  memberName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  statusRow: {
    marginBottom: 2,
  },
  waitingText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: '700',
  },
  doneText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: '700',
  },
  pendingText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  streakText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});

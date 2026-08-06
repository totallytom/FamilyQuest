import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppData, useCurrentMember, useToday } from '@/data/AppDataContext';
import { memberDayStats, memberStreak, tasksForMemberOnDate } from '@/data/selectors';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Avatar } from '@/components/Avatar';
import { ProgressRing } from '@/components/ProgressRing';
import { StatPill } from '@/components/StatPill';
import { TaskRow } from '@/components/TaskRow';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { friendlyDate } from '@/utils/date';
import type { IoniconName } from '@/theme/icons';

export default function TodayScreen() {
  const { members, routines, tasks, completions, currentMemberId, setCurrentMember, markTaskDone, undoTaskDone } = useAppData();
  const currentMember = useCurrentMember();
  const today = useToday();

  if (!currentMember) {
    return (
      <ScreenContainer>
        <EmptyState icon="person-add" title="No family member selected" subtitle="Head to your profile to pick who's using the app." />
      </ScreenContainer>
    );
  }

  const stats = memberDayStats(tasks, completions, currentMember.id, today);
  const streak = memberStreak(tasks, completions, currentMember.id);
  const progress = stats.total > 0 ? stats.approved / stats.total : 0;

  const memberRoutines = routines
    .filter((r) => r.memberId === currentMember.id)
    .map((routine) => ({
      routine,
      tasks: tasksForMemberOnDate(tasks, currentMember.id, today).filter((t) => t.routineId === routine.id),
    }))
    .filter((group) => group.tasks.length > 0);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi {currentMember.name}! 👋</Text>
          <Text style={styles.date}>{friendlyDate(today)}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherRow}>
        {members.map((m) => (
          <Pressable key={m.id} onPress={() => setCurrentMember(m.id)} style={styles.switcherItem}>
            <Avatar emoji={m.emoji} color={m.color} size={44} ringColor={m.id === currentMemberId ? colors.primary : undefined} />
            <Text style={[styles.switcherName, m.id === currentMemberId && styles.switcherNameActive]} numberOfLines={1}>
              {m.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Card style={styles.summaryCard}>
        <ProgressRing progress={progress} size={72} strokeWidth={8} label={`${stats.approved}/${stats.total}`} />
        <View style={styles.summaryText}>
          <Text style={styles.summaryTitle}>
            {stats.total === 0
              ? 'Nothing scheduled today'
              : stats.approved === stats.total
              ? 'All done and checked! 🎉'
              : `${stats.total - stats.approved} task${stats.total - stats.approved === 1 ? '' : 's'} to go`}
          </Text>
          <View style={styles.pillRow}>
            <StatPill icon="flame" iconColor={colors.warning} label={`${streak} day streak`} />
            <StatPill icon="star" iconColor={colors.star} label={`${currentMember.points} stars`} />
          </View>
        </View>
      </Card>

      {memberRoutines.length === 0 ? (
        <EmptyState icon="sunny" title="No tasks for today" subtitle="Enjoy the free day, or check the Routines tab to add one.">
          <Button label="Go to Routines" onPress={() => router.push('/(tabs)/routines')} variant="secondary" />
        </EmptyState>
      ) : (
        memberRoutines.map(({ routine, tasks: routineTasks }) => (
          <Card key={routine.id} style={styles.routineCard}>
            <View style={styles.routineHeader}>
              <View style={[styles.routineIcon, { backgroundColor: routine.color + '33' }]}>
                <Ionicons name={routine.icon as IoniconName} size={16} color={routine.color} />
              </View>
              <Text style={styles.routineTitle}>{routine.title}</Text>
            </View>
            {routineTasks.map((task) => {
              const completion = completions.find((c) => c.taskId === task.id && c.date === today);
              const status = completion?.status ?? 'pending';
              return (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  icon={task.icon as IoniconName}
                  points={task.points}
                  status={status}
                  onToggleDone={() => (status === 'pending' || status === 'rejected' ? markTaskDone(task.id, today) : undoTaskDone(task.id, today))}
                />
              );
            })}
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  switcherRow: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  switcherItem: {
    alignItems: 'center',
    width: 56,
  },
  switcherName: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  switcherNameActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  routineCard: {
    marginBottom: spacing.lg,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  routineIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  routineTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
});

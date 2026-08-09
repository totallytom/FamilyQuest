import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';

import { useAppData, useMyMember } from '@/data/AppDataContext';
import { memberDayStats, tasksForMemberOnDate } from '@/data/selectors';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Avatar } from '@/components/Avatar';
import { ProgressRing } from '@/components/ProgressRing';
import { Card } from '@/components/Card';
import { TaskRow } from '@/components/TaskRow';
import { EmptyState } from '@/components/EmptyState';
import { addDays, dateKey, friendlyDate } from '@/utils/date';
import type { IoniconName } from '@/theme/icons';

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { members, routines, tasks, completions, markTaskDone, undoTaskDone, reviewTask } = useAppData();
  const myMember = useMyMember();
  const [selectedDate, setSelectedDate] = useState(dateKey());

  const member = members.find((m) => m.id === id);

  if (!member) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <EmptyState icon="alert-circle" title="Member not found" />
      </ScreenContainer>
    );
  }

  const isOwnPage = myMember?.id === member.id;
  const canReview = myMember?.role === 'parent' && !isOwnPage;
  const isToday = selectedDate === dateKey();

  const stats = memberDayStats(tasks, completions, member.id, selectedDate);
  const progress = stats.total > 0 ? stats.approved / stats.total : 0;

  const memberRoutines = routines
    .filter((r) => r.memberId === member.id)
    .map((routine) => ({
      routine,
      tasks: tasksForMemberOnDate(tasks, member.id, selectedDate).filter((t) => t.routineId === routine.id),
    }))
    .filter((group) => group.tasks.length > 0);

  return (
    <ScreenContainer edges={['left', 'right']}>
      <Stack.Screen options={{ title: member.name }} />

      <View style={styles.header}>
        <Avatar emoji={member.emoji} color={member.color} size={56} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{member.name}</Text>
          <Text style={styles.role}>{member.role === 'kid' ? 'Kid' : 'Parent'} · {member.points} stars earned</Text>
        </View>
      </View>

      <View style={styles.dateNav}>
        <Pressable onPress={() => setSelectedDate((d) => addDays(d, -1))} hitSlop={10} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.dateLabel}>{friendlyDate(selectedDate)}</Text>
        <Pressable
          onPress={() => setSelectedDate((d) => addDays(d, 1))}
          disabled={isToday}
          hitSlop={10}
          style={styles.dateArrow}
        >
          <Ionicons name="chevron-forward" size={18} color={isToday ? colors.border : colors.text} />
        </Pressable>
      </View>

      {stats.total > 0 && (
        <Card style={styles.summaryCard}>
          <ProgressRing progress={progress} size={64} strokeWidth={7} label={`${stats.approved}/${stats.total}`} />
          <View style={styles.summaryText}>
            {stats.waitingReview > 0 && canReview ? (
              <Text style={styles.summaryWaiting}>{stats.waitingReview} task(s) waiting on your review</Text>
            ) : stats.approved === stats.total ? (
              <Text style={styles.summaryDone}>Everything approved ✓</Text>
            ) : (
              <Text style={styles.summaryPending}>{stats.total - stats.approved} task(s) remaining</Text>
            )}
          </View>
        </Card>
      )}

      {memberRoutines.length === 0 ? (
        <EmptyState icon="calendar" title="Nothing scheduled" subtitle={`${member.name} has no tasks for this day.`} />
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
              const completion = completions.find((c) => c.taskId === task.id && c.date === selectedDate);
              const status = completion?.status ?? 'pending';
              return (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  icon={task.icon as IoniconName}
                  points={task.points}
                  status={status}
                  onToggleDone={
                    isOwnPage
                      ? () => (status === 'pending' || status === 'rejected' ? markTaskDone(task.id, selectedDate) : undoTaskDone(task.id, selectedDate))
                      : undefined
                  }
                  onApprove={canReview && myMember ? () => reviewTask(task.id, selectedDate, 'approved', myMember.id) : undefined}
                  onReject={canReview && myMember ? () => reviewTask(task.id, selectedDate, 'rejected', myMember.id) : undefined}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  role: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  dateArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    minWidth: 140,
    textAlign: 'center',
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
  summaryWaiting: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.warning,
  },
  summaryDone: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.success,
  },
  summaryPending: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
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

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppData, useCurrentMember } from '@/data/AppDataContext';
import { colors, fontSize, spacing } from '@/theme/theme';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card } from '@/components/Card';
import { TaskRow } from '@/components/TaskRow';
import { EmptyState } from '@/components/EmptyState';
import { friendlyDate } from '@/utils/date';
import type { IoniconName } from '@/theme/icons';

export default function HistoryScreen() {
  const { tasks, completions } = useAppData();
  const currentMember = useCurrentMember();

  if (!currentMember) {
    return (
      <ScreenContainer>
        <EmptyState icon="person-add" title="No family member selected" subtitle="Head to your profile to pick who's using the app." />
      </ScreenContainer>
    );
  }

  const history = completions
    .filter((c) => c.memberId === currentMember.id && (c.status === 'approved' || c.status === 'rejected'))
    .sort((a, b) => b.date.localeCompare(a.date));

  const groups = new Map<string, typeof history>();
  for (const completion of history) {
    const group = groups.get(completion.date) ?? [];
    group.push(completion);
    groups.set(completion.date, group);
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>{currentMember.name}&apos;s reviewed tasks, most recent first.</Text>

      {groups.size === 0 ? (
        <EmptyState icon="time" title="No history yet" subtitle="Tasks show up here once a parent has reviewed them." />
      ) : (
        Array.from(groups.entries()).map(([date, dayCompletions]) => (
          <View key={date} style={styles.dayGroup}>
            <Text style={styles.dayLabel}>{friendlyDate(date)}</Text>
            <Card style={styles.dayCard}>
              {dayCompletions.map((completion) => {
                const task = tasks.find((t) => t.id === completion.taskId);
                if (!task) return null;
                return (
                  <TaskRow
                    key={completion.id}
                    title={task.title}
                    icon={task.icon as IoniconName}
                    points={task.points}
                    status={completion.status}
                    interactive={false}
                  />
                );
              })}
            </Card>
          </View>
        ))
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
  dayGroup: {
    marginBottom: spacing.lg,
  },
  dayLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  dayCard: {
    paddingVertical: spacing.xs,
  },
});

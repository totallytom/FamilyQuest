import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppData } from '@/data/AppDataContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import type { IoniconName } from '@/theme/icons';

export default function RoutinesScreen() {
  const { members, routines, tasks } = useAppData();

  return (
    <ScreenContainer>
      <Text style={styles.title}>Routines</Text>
      <Text style={styles.subtitle}>Set up the chores and homework each person is responsible for.</Text>

      {members.length === 0 ? (
        <EmptyState icon="list-circle" title="No family members yet" subtitle="Add family members from the Profile tab first." />
      ) : (
        members.map((member) => {
          const memberRoutines = routines.filter((r) => r.memberId === member.id);
          return (
            <View key={member.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Avatar emoji={member.emoji} color={member.color} size={32} />
                <Text style={styles.sectionTitle}>{member.name}</Text>
              </View>

              {memberRoutines.length === 0 ? (
                <Text style={styles.noRoutines}>No routines yet</Text>
              ) : (
                memberRoutines.map((routine) => {
                  const taskCount = tasks.filter((t) => t.routineId === routine.id).length;
                  return (
                    <Pressable key={routine.id} onPress={() => router.push(`/routine/${routine.id}`)}>
                      <Card style={styles.routineCard}>
                        <View style={[styles.routineIcon, { backgroundColor: routine.color + '33' }]}>
                          <Ionicons name={routine.icon as IoniconName} size={18} color={routine.color} />
                        </View>
                        <View style={styles.routineInfo}>
                          <Text style={styles.routineTitle}>{routine.title}</Text>
                          <Text style={styles.routineMeta}>{taskCount} task{taskCount === 1 ? '' : 's'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      </Card>
                    </Pressable>
                  );
                })
              )}

              <Pressable onPress={() => router.push(`/routine/new?memberId=${member.id}`)} style={styles.addButton}>
                <Ionicons name="add-circle" size={18} color={colors.primary} />
                <Text style={styles.addButtonText}>New routine for {member.name}</Text>
              </Pressable>
            </View>
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  noRoutines: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  routineIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineInfo: {
    flex: 1,
  },
  routineTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  routineMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
});

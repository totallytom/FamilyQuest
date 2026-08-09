import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { useAppData, useMyMember } from '@/data/AppDataContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { avatarPalette } from '@/theme/colors';
import { routineIconOptions, taskIconOptions } from '@/theme/icons';
import type { IoniconName } from '@/theme/icons';
import type { Weekday } from '@/types/models';
import { ALL_WEEKDAYS, WEEKDAY_LABELS } from '@/types/models';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { DayOfWeekPicker } from '@/components/DayOfWeekPicker';
import { EmptyState } from '@/components/EmptyState';

export default function RoutineScreen() {
  const { id, memberId: memberIdParam } = useLocalSearchParams<{ id: string; memberId?: string }>();
  const { members, routines, tasks, addRoutine, updateRoutine, removeRoutine, addTask, updateTask, removeTask } = useAppData();
  const canManage = useMyMember()?.role === 'parent';

  const isNew = id === 'new';
  const routine = routines.find((r) => r.id === id);
  const member = members.find((m) => m.id === (routine?.memberId ?? memberIdParam));

  const [title, setTitle] = useState(routine?.title ?? '');
  const [icon, setIcon] = useState<IoniconName>((routine?.icon as IoniconName) ?? routineIconOptions[0]);
  const [color, setColor] = useState(routine?.color ?? avatarPalette[0]);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskIcon, setTaskIcon] = useState<IoniconName>(taskIconOptions[0]);
  const [taskPoints, setTaskPoints] = useState(5);
  const [taskDays, setTaskDays] = useState<Weekday[]>(ALL_WEEKDAYS);

  if (!member) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <EmptyState icon="alert-circle" title="Family member not found" />
      </ScreenContainer>
    );
  }

  if (isNew && !canManage) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <EmptyState icon="lock-closed" title="Parents only" subtitle="Switch to a parent profile to create routines." />
      </ScreenContainer>
    );
  }

  const routineTasks = routine ? tasks.filter((t) => t.routineId === routine.id) : [];

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskIcon(taskIconOptions[0]);
    setTaskPoints(5);
    setTaskDays(ALL_WEEKDAYS);
  };

  const handleSaveRoutine = async () => {
    if (!title.trim()) return;
    if (isNew) {
      const created = await addRoutine({ memberId: member.id, title: title.trim(), icon, color });
      router.replace(`/routine/${created.id}`);
    } else if (routine) {
      await updateRoutine(routine.id, { title: title.trim(), icon, color });
    }
  };

  const handleDeleteRoutine = () => {
    if (!routine) return;
    Alert.alert('Delete routine?', `This removes "${routine.title}" and all of its tasks.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeRoutine(routine.id);
          router.back();
        },
      },
    ]);
  };

  const handleSubmitTask = async () => {
    if (!routine || !taskTitle.trim() || taskDays.length === 0) return;
    if (editingTaskId) {
      await updateTask(editingTaskId, { title: taskTitle.trim(), icon: taskIcon, points: taskPoints, daysOfWeek: taskDays });
    } else {
      await addTask({ routineId: routine.id, memberId: routine.memberId, title: taskTitle.trim(), icon: taskIcon, points: taskPoints, daysOfWeek: taskDays });
    }
    resetTaskForm();
  };

  const handleEditTaskRow = (taskId: string) => {
    const task = routineTasks.find((t) => t.id === taskId);
    if (!task) return;
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskIcon(task.icon as IoniconName);
    setTaskPoints(task.points);
    setTaskDays(task.daysOfWeek);
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert('Remove this task?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeTask(taskId);
          if (editingTaskId === taskId) resetTaskForm();
        },
      },
    ]);
  };

  return (
    <ScreenContainer edges={['left', 'right']}>
      <Stack.Screen options={{ title: isNew ? 'New Routine' : routine?.title ?? 'Routine' }} />

      {canManage ? (
        <Card style={styles.card}>
          <Text style={styles.label}>Routine name</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Morning Routine"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.pickerLabel}>Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
            {routineIconOptions.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setIcon(opt)}
                style={[styles.iconOption, { backgroundColor: color + '33' }, icon === opt && { borderColor: color, borderWidth: 2 }]}
              >
                <Ionicons name={opt} size={18} color={color} />
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.pickerLabel}>Color</Text>
          <View style={styles.colorRow}>
            {avatarPalette.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]}
              />
            ))}
          </View>

          <View style={styles.saveRow}>
            <Button label={isNew ? 'Create routine' : 'Save changes'} onPress={handleSaveRoutine} disabled={!title.trim()} />
            {!isNew && <Button label="Delete" onPress={handleDeleteRoutine} variant="danger" />}
          </View>
        </Card>
      ) : (
        <Card style={styles.card}>
          <View style={styles.taskRow}>
            <View style={[styles.taskIconWrap, { backgroundColor: color + '33' }]}>
              <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={styles.label}>{title}</Text>
          </View>
        </Card>
      )}

      {!isNew && routine && (
        <>
          <Text style={styles.sectionTitle}>Tasks</Text>

          {routineTasks.length === 0 ? (
            <Text style={styles.noTasks}>No tasks yet{canManage ? ' — add the first one below.' : '.'}</Text>
          ) : (
            routineTasks.map((task) => (
              <Card key={task.id} style={styles.taskCard}>
                <View style={styles.taskRow}>
                  <View style={styles.taskIconWrap}>
                    <Ionicons name={task.icon as IoniconName} size={16} color={colors.primaryDark} />
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskMeta}>
                      {task.points} stars · {task.daysOfWeek.length === 7 ? 'Every day' : task.daysOfWeek.map((d) => WEEKDAY_LABELS[d]).join(' ')}
                    </Text>
                  </View>
                  {canManage && (
                    <>
                      <Pressable onPress={() => handleEditTaskRow(task.id)} hitSlop={8} style={styles.taskAction}>
                        <Ionicons name="pencil" size={16} color={colors.textMuted} />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteTask(task.id)} hitSlop={8} style={styles.taskAction}>
                        <Ionicons name="trash" size={16} color={colors.danger} />
                      </Pressable>
                    </>
                  )}
                </View>
              </Card>
            ))
          )}

          {canManage && (
            <Card style={styles.card}>
              <Text style={styles.label}>{editingTaskId ? 'Edit task' : 'Add a task'}</Text>
              <TextInput
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="e.g. Make bed"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <Text style={styles.pickerLabel}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
                {taskIconOptions.map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => setTaskIcon(opt)}
                    style={[styles.iconOption, taskIcon === opt && { borderColor: colors.primary, borderWidth: 2 }]}
                  >
                    <Ionicons name={opt} size={18} color={colors.primaryDark} />
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.pickerLabel}>Repeats on</Text>
              <View style={styles.daysWrap}>
                <DayOfWeekPicker value={taskDays} onChange={setTaskDays} />
              </View>

              <Text style={styles.pickerLabel}>Stars for completing</Text>
              <View style={styles.pointsRow}>
                <Pressable onPress={() => setTaskPoints((p) => Math.max(1, p - 5))} style={styles.pointsButton}>
                  <Ionicons name="remove" size={18} color={colors.text} />
                </Pressable>
                <View style={styles.pointsValueWrap}>
                  <Ionicons name="star" size={16} color={colors.star} />
                  <Text style={styles.pointsValue}>{taskPoints}</Text>
                </View>
                <Pressable onPress={() => setTaskPoints((p) => Math.min(50, p + 5))} style={styles.pointsButton}>
                  <Ionicons name="add" size={18} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.saveRow}>
                <Button
                  label={editingTaskId ? 'Update task' : 'Add task'}
                  onPress={handleSubmitTask}
                  disabled={!taskTitle.trim() || taskDays.length === 0}
                />
                {editingTaskId && <Button label="Cancel" onPress={resetTaskForm} variant="ghost" />}
              </View>
            </Card>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
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
  pickerLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  iconRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'transparent',
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
  saveRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  noTasks: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  taskCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  taskMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  taskAction: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  daysWrap: {
    marginBottom: spacing.lg,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  pointsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 50,
    justifyContent: 'center',
  },
  pointsValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
});

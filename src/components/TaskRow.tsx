import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CompletionStatus } from '@/types/models';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { Badge } from '@/components/Badge';

interface TaskRowProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  points: number;
  status?: CompletionStatus;
  /** Kid-facing: tap the row to mark done / undo. Hidden once a reviewer is deciding. */
  onToggleDone?: () => void;
  /** Reviewer-facing: approve / send back a task that's waiting on review. */
  onApprove?: () => void;
  onReject?: () => void;
  interactive?: boolean;
}

const STATUS_BADGE: Record<CompletionStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  pending: { label: 'To do', tone: 'neutral' },
  done: { label: 'Waiting for review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Try again', tone: 'danger' },
};

export function TaskRow({ title, icon, points, status = 'pending', onToggleDone, onApprove, onReject, interactive = true }: TaskRowProps) {
  const isChecked = status === 'done' || status === 'approved';
  const badge = STATUS_BADGE[status];
  const showReviewActions = status === 'done' && (onApprove || onReject);

  return (
    <View style={[styles.row, status === 'approved' && styles.rowApproved]}>
      <Pressable
        onPress={interactive ? onToggleDone : undefined}
        disabled={!interactive || !onToggleDone || status === 'approved'}
        style={styles.checkTouch}
        hitSlop={8}
      >
        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
          {isChecked && <Ionicons name="checkmark" size={16} color={colors.white} />}
        </View>
      </Pressable>

      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color={colors.primaryDark} />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, status === 'approved' && styles.titleDone]} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.metaRow}>
          <Badge label={badge.label} tone={badge.tone} />
          <View style={styles.pointsRow}>
            <Ionicons name="star" size={12} color={colors.star} />
            <Text style={styles.pointsText}>{points}</Text>
          </View>
        </View>
      </View>

      {showReviewActions && (
        <View style={styles.reviewActions}>
          <Pressable onPress={onReject} style={[styles.reviewButton, styles.rejectButton]} hitSlop={6}>
            <Ionicons name="close" size={16} color={colors.danger} />
          </Pressable>
          <Pressable onPress={onApprove} style={[styles.reviewButton, styles.approveButton]} hitSlop={6}>
            <Ionicons name="checkmark" size={16} color={colors.white} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowApproved: {
    opacity: 0.7,
  },
  checkTouch: {
    padding: spacing.xs,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  titleDone: {
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pointsText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  reviewButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.dangerBg,
  },
});

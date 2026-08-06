import React from 'react';
import { ScrollView, StyleSheet, View, ViewProps } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/theme';

interface ScreenContainerProps extends ViewProps {
  scroll?: boolean;
  /**
   * Which sides to reserve safe-area inset for. Defaults to top/left/right.
   * Pass `['left', 'right']` for screens rendered under a native Stack header —
   * the header already clears the top inset, so reserving it again doubles the gap.
   */
  edges?: Edge[];
}

export function ScreenContainer({ children, style, scroll = true, edges = ['top', 'left', 'right'], ...rest }: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, style]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, style]} {...rest}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
});

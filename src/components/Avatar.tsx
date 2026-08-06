import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AvatarProps {
  emoji: string;
  color: string;
  size?: number;
  ringColor?: string;
}

export function Avatar({ emoji, color, size = 52, ringColor }: AvatarProps) {
  const outerSize = ringColor ? size + 6 : size;
  return (
    <View
      style={[
        styles.outer,
        {
          width: outerSize,
          height: outerSize,
          borderRadius: outerSize / 2,
          borderColor: ringColor,
          borderWidth: ringColor ? 3 : 0,
        },
      ]}
    >
      <View style={[styles.inner, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

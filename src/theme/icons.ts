import type React from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export const routineIconOptions: IoniconName[] = [
  'sunny',
  'moon',
  'book',
  'school',
  'fitness',
  'bicycle',
  'game-controller',
  'musical-notes',
  'paw',
  'home',
  'restaurant',
  'walk',
];

export const taskIconOptions: IoniconName[] = [
  'checkmark-circle',
  'bed',
  'happy',
  'book',
  'calculator',
  'fish',
  'home',
  'shirt',
  'pencil',
  'brush',
  'basketball',
  'walk',
  'trash',
  'water',
  'leaf',
  'musical-notes',
];

import { Platform } from 'react-native';

export const colors = {
  bg: '#04090A',
  bg2: '#071510',
  card: 'rgba(255,255,255,0.055)',
  card2: 'rgba(255,255,255,0.085)',
  line: 'rgba(255,255,255,0.10)',
  line2: 'rgba(255,255,255,0.16)',
  text: '#EEFCF4',
  muted: 'rgba(226,245,235,0.64)',
  faint: 'rgba(226,245,235,0.40)',
  em: '#2BE38A',
  em2: '#12B866',
  emDeep: '#0B6B3D',
  emInk: '#032013',
  emSoft: 'rgba(43,227,138,0.12)',
  emLine: 'rgba(43,227,138,0.32)',
  blue: '#63B3FF',
  blue2: '#3B8EF0',
  blueInk: '#04172C',
  blueSoft: 'rgba(99,179,255,0.12)',
  blueLine: 'rgba(99,179,255,0.32)',
  amber: '#FFC857',
  amberSoft: 'rgba(255,200,87,0.10)',
  amberLine: 'rgba(255,200,87,0.30)',
  red: '#FF5D6C',
  redSoft: 'rgba(255,93,108,0.10)',
  redLine: 'rgba(255,93,108,0.30)',
  black: '#000000',
};

export const fonts = {
  display: 'Outfit-Bold',
  displayHeavy: 'Outfit-ExtraBold',
  displaySemi: 'Outfit-SemiBold',
  body: 'Jakarta-Regular',
  bodyMedium: 'Jakarta-Medium',
  bodySemi: 'Jakarta-SemiBold',
  bodyBold: 'Jakarta-Bold',
};

export const fontFiles = {
  'Outfit-SemiBold': require('../../assets/fonts/outfit-2.ttf'),
  'Outfit-Bold': require('../../assets/fonts/outfit-3.ttf'),
  'Outfit-ExtraBold': require('../../assets/fonts/outfit-4.ttf'),
  'Jakarta-Regular': require('../../assets/fonts/jakarta-5.ttf'),
  'Jakarta-Medium': require('../../assets/fonts/jakarta-6.ttf'),
  'Jakarta-SemiBold': require('../../assets/fonts/jakarta-7.ttf'),
  'Jakarta-Bold': require('../../assets/fonts/jakarta-8.ttf'),
};

/** Removes the browser focus ring on text inputs in the web preview (no effect on iOS/Android). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const webNoOutline: any = Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : {};

export const radius ={ sm: 12, md: 16, lg: 20, xl: 24, xxl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const gradients = {
  em: ['#3CF09A', '#12B866'] as const,
  blue: ['#8CC8FF', '#3B8EF0'] as const,
  screen: ['#06120D', '#04090A', '#030706'] as const,
};

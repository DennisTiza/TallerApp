/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111c2d',
    background: '#f9f9ff',
    backgroundElement: '#e7eeff',
    backgroundSelected: '#dee8ff',
    textSecondary: '#4a626a',
  },
  dark: {
    text: '#ffffff',
    background: '#111c2d',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export const WorkshopTheme = {
  primary: '#bc0001',
  primaryContainer: '#e42014',
  onPrimary: '#ffffff',
  surface: '#f9f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f0f3ff',
  surfaceContainer: '#e7eeff',
  surfaceContainerHigh: '#dee8ff',
  surfaceContainerHighest: '#d8e3fb',
  onSurface: '#111c2d',
  secondary: '#4a626a',
  secondaryContainer: '#cae4ed',
  onSecondaryContainer: '#4e666e',
  tertiary: '#006860',
  tertiaryContainer: '#248279',
  onTertiary: '#ffffff',
  inverseSurface: '#263143',
  inverseOnSurface: '#ecf1ff',
  error: '#ba1a1a',
  outlineVariant: '#e7bdb6',
  outline: '#926e69',
  secondaryFixed: '#cde7f0',
  onSecondaryFixed: '#041f25',
  tertiaryFixed: '#9cf2e8',
  onTertiaryFixed: '#00201d',
  primaryFixed: '#ffdad4',
  onPrimaryFixed: '#410000',
  cardBorder: 'rgba(0, 0, 0, 0.05)',
  shadow: 'rgba(0, 0, 0, 0.06)',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

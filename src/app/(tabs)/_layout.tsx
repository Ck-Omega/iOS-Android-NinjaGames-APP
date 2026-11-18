import React, { forwardRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../lib/session';
import { Icon, type IconName } from '../../ui/icons';
import { colors, fonts } from '../../ui/theme';
import { tap } from '../../ui/primitives';
import { LiveSessionBar } from '../../ui/widgets';
import type { StringKey } from '../../lib/i18n';

const TABS: { name: string; href: '/' | '/play' | '/social' | '/order' | '/wallet'; icon: IconName; label: StringKey; center?: boolean }[] = [
  { name: 'index', href: '/', icon: 'home', label: 'tabHome' },
  { name: 'play', href: '/play', icon: 'gamepad', label: 'tabPlay' },
  { name: 'social', href: '/social', icon: 'chat', label: 'tabChat', center: true },
  { name: 'order', href: '/order', icon: 'food', label: 'tabOrder' },
  { name: 'wallet', href: '/wallet', icon: 'wallet', label: 'tabWallet' },
];

export default function TabLayout() {
  const { t, rtl } = useSession();
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      {/* Hidden list: registers the tab routes only (each tab exactly once). */}
      <TabList style={{ display: 'none' }}>
        {TABS.map((tab) => <TabTrigger key={tab.name} name={tab.name} href={tab.href} />)}
      </TabList>
      {/* Visible glass bar. */}
      <View style={[styles.barWrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
        <View style={{ marginBottom: 8 }} pointerEvents="box-none"><LiveSessionBar /></View>
        <View style={styles.bar}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: 26, overflow: 'hidden' }]}>
            {Platform.OS === 'ios'
              ? <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,22,17,0.94)' }]} />}
          </View>
          <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            {TABS.map((tab) => (
              <TabTrigger key={tab.name} name={tab.name} asChild>
                {tab.center ? <CenterButton icon={tab.icon} label={t(tab.label)} /> : <TabButton icon={tab.icon} label={t(tab.label)} />}
              </TabTrigger>
            ))}
          </View>
        </View>
      </View>
    </Tabs>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabButton = forwardRef<any, TabTriggerSlotProps & { icon: IconName; label: string }>(
  ({ icon, label, isFocused, onPress, ...rest }, ref) => {
    const c = isFocused ? colors.em : colors.faint;
    return (
      <Pressable
        ref={ref}
        {...rest}
        onPress={(e) => { tap(); onPress?.(e); }}
        style={styles.tab}
        accessibilityRole="tab"
        accessibilityState={{ selected: !!isFocused }}
        accessibilityLabel={label}
      >
        <Icon name={icon} size={22} color={c} stroke={isFocused ? 2.1 : 1.8} />
        <Text style={[styles.label, { color: c }]} numberOfLines={1}>{label}</Text>
        <View style={[styles.dot, isFocused && styles.dotOn]} />
      </Pressable>
    );
  },
);
TabButton.displayName = 'TabButton';

// Raised, glowing centre button (Chat). Row order flips automatically in RTL.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CenterButton = forwardRef<any, TabTriggerSlotProps & { icon: IconName; label: string }>(
  ({ icon, label, isFocused, onPress, ...rest }, ref) => (
    <Pressable
      ref={ref}
      {...rest}
      onPress={(e) => { tap(); onPress?.(e); }}
      style={styles.centerSlot}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
    >
      <LinearGradient colors={[colors.em, '#12B76A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.centerBtn, isFocused && styles.centerOn]}>
        <Icon name={icon} size={28} color={colors.emInk} stroke={2.2} />
      </LinearGradient>
      <Text style={[styles.label, { color: isFocused ? colors.em : colors.faint, marginTop: 2 }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  ),
);
CenterButton.displayName = 'CenterButton';

const styles = StyleSheet.create({
  barWrap: { position: 'absolute', left: 14, right: 14 },
  bar: {
    height: 70, borderRadius: 26, borderWidth: 1, borderColor: colors.line,
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  row: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%' },
  label: { fontFamily: fonts.bodySemi, fontSize: 10.5 },
  centerSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', paddingBottom: 6 },
  centerBtn: {
    width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', marginTop: -30,
    borderWidth: 4, borderColor: colors.bg,
    shadowColor: colors.em, shadowOpacity: 0.7, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 14,
  },
  centerOn: { shadowOpacity: 1, shadowRadius: 22 },
  dot: { width: 4, height: 4, borderRadius: 4 },
  dotOn: { backgroundColor: colors.em, shadowColor: colors.em, shadowOpacity: 1, shadowRadius: 6 },
});

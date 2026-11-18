import React from 'react';
import {
  ActivityIndicator, Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, fonts, gradients, radius, webNoOutline } from './theme';
import { Icon, type IconName } from './icons';
import { useSession } from '../lib/session';

export const TAB_BAR_SPACE = 112;

// ─── Text ────────────────────────────────────────────────────────────────
type Variant = 'hero' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny' | 'eyebrow' | 'num';
const variantStyle: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 38, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24 },
  h3: { fontFamily: fonts.display, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 12.5, lineHeight: 17 },
  tiny: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 15 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase' },
  num: { fontFamily: fonts.displayHeavy, fontSize: 24, letterSpacing: -0.5 },
};

export function Txt({ v = 'body', color, style, center, children, numberOfLines }: {
  v?: Variant; color?: string; style?: StyleProp<TextStyle>; center?: boolean; children: React.ReactNode; numberOfLines?: number;
}) {
  const { rtl } = useSession();
  const tone = color ?? (v === 'small' || v === 'tiny' ? colors.muted : v === 'eyebrow' ? colors.faint : colors.text);
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[variantStyle[v], { color: tone, textAlign: center ? 'center' : rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }, style]}
    >
      {children}
    </Text>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────
/** Horizontal row that mirrors in Arabic. */
export function Row({ children, style, gap = 10, between, center = true }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number; between?: boolean; center?: boolean;
}) {
  const { rtl } = useSession();
  return (
    <View style={[{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: center ? 'center' : 'flex-start', gap }, between && { justifyContent: 'space-between' }, style]}>
      {children}
    </View>
  );
}

export function Backdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={gradients.screen} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="g1" cx="12%" cy="0%" r="75%">
            <Stop offset="0" stopColor="#2BE38A" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#2BE38A" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="g2" cx="105%" cy="38%" r="60%">
            <Stop offset="0" stopColor="#12B866" stopOpacity={0.13} />
            <Stop offset="1" stopColor="#12B866" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#g1)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#g2)" />
      </Svg>
    </View>
  );
}

/** Full screen with backdrop, safe areas, optional pull-to-refresh. */
export function Screen({ children, scroll = true, onRefresh, tabs = false, padded = true, header }: {
  children: React.ReactNode; scroll?: boolean; onRefresh?: () => Promise<unknown> | void; tabs?: boolean; padded?: boolean; header?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);
  const pad: ViewStyle = { paddingTop: insets.top + 8, paddingHorizontal: padded ? 18 : 0, paddingBottom: (tabs ? TAB_BAR_SPACE : 24) + insets.bottom };
  return (
    <View style={styles.fill}>
      <Backdrop />
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={pad}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? (
            <RefreshControl
              tintColor={colors.em}
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }}
            />
          ) : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, pad]}>{children}</View>
      )}
    </View>
  );
}

export function Glass({ children, style, tone = 'default', onPress }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'default' | 'em' | 'blue' | 'amber' | 'red'; onPress?: () => void;
}) {
  const toneStyle: ViewStyle =
    tone === 'em' ? { backgroundColor: colors.emSoft, borderColor: colors.emLine }
      : tone === 'blue' ? { backgroundColor: colors.blueSoft, borderColor: colors.blueLine }
        : tone === 'amber' ? { backgroundColor: colors.amberSoft, borderColor: colors.amberLine }
          : tone === 'red' ? { backgroundColor: colors.redSoft, borderColor: colors.redLine }
            : {};
  const content = <View style={[styles.glass, toneStyle, style]}>{children}</View>;
  if (!onPress) return content;
  return <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}>{content}</Pressable>;
}

// ─── Controls ────────────────────────────────────────────────────────────
export function tap() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function Button({ title, onPress, kind = 'primary', icon, loading, disabled, style, small }: {
  title: string; onPress: () => void; kind?: 'primary' | 'blue' | 'ghost' | 'danger'; icon?: IconName;
  loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const { rtl } = useSession();
  const h = small ? 42 : 54;
  const fg = kind === 'primary' ? colors.emInk : kind === 'blue' ? colors.blueInk : kind === 'danger' ? colors.red : colors.text;
  const inner = (
    <View style={[styles.btnInner, { height: h, flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Icon name={icon} size={18} color={fg} stroke={2.1} /> : null}
          <Text style={[styles.btnText, { color: fg, fontSize: small ? 14 : 15.5 }]}>{title}</Text>
        </>
      )}
    </View>
  );
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [{ borderRadius: radius.lg, overflow: 'hidden', opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      {kind === 'primary' || kind === 'blue' ? (
        <LinearGradient colors={kind === 'primary' ? gradients.em : gradients.blue} style={[styles.btnGrad, kind === 'primary' ? styles.emShadow : styles.blueShadow]}>{inner}</LinearGradient>
      ) : (
        <View style={[styles.btnFlat, kind === 'danger' ? { backgroundColor: colors.redSoft, borderColor: colors.redLine } : null]}>{inner}</View>
      )}
    </Pressable>
  );
}

export function IconButton({ name, onPress, badge, size = 40 }: { name: IconName; onPress?: () => void; badge?: boolean; size?: number }) {
  return (
    <Pressable onPress={() => { tap(); onPress?.(); }} hitSlop={8} style={({ pressed }) => [styles.iconBtn, { width: size, height: size, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={name} size={19} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

export function Pill({ label, tone = 'default', live, icon }: { label: string; tone?: 'default' | 'em' | 'blue' | 'amber' | 'red'; live?: boolean; icon?: IconName }) {
  const { rtl } = useSession();
  const c = tone === 'em' ? colors.em : tone === 'blue' ? colors.blue : tone === 'amber' ? colors.amber : tone === 'red' ? colors.red : colors.text;
  const bg = tone === 'em' ? colors.emSoft : tone === 'blue' ? colors.blueSoft : tone === 'amber' ? colors.amberSoft : tone === 'red' ? colors.redSoft : colors.card2;
  const bd = tone === 'em' ? colors.emLine : tone === 'blue' ? colors.blueLine : tone === 'amber' ? colors.amberLine : tone === 'red' ? colors.redLine : colors.line;
  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: bd, flexDirection: rtl ? 'row-reverse' : 'row', alignSelf: rtl ? 'flex-end' : 'flex-start' }]}>
      {live ? <View style={[styles.liveDot, { backgroundColor: c }]} /> : null}
      {icon ? <Icon name={icon} size={12} color={c} stroke={2.2} /> : null}
      <Text style={[styles.pillText, { color: c }]}>{label}</Text>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange, tone = 'em' }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; tone?: 'em' | 'blue';
}) {
  const { rtl } = useSession();
  const on = tone === 'blue' ? { bg: colors.blueSoft, fg: colors.blue, bd: colors.blueLine } : { bg: colors.emSoft, fg: colors.em, bd: colors.emLine };
  return (
    <View style={[styles.seg, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => { tap(); onChange(o.value); }} style={[styles.segItem, active && { backgroundColor: on.bg, borderColor: on.bd }]}>
            <Text style={[styles.segText, { color: active ? on.fg : colors.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ icon, style, ...props }: TextInputProps & { icon?: IconName }) {
  const { rtl } = useSession();
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocus, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      {icon ? <Icon name={icon} size={18} color={focused ? colors.em : colors.faint} /> : null}
      <TextInput
        placeholderTextColor={colors.faint}
        selectionColor={colors.em}
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={[styles.fieldInput, { textAlign: rtl ? 'right' : 'left' }, style]}
      />
    </View>
  );
}

export function Avatar({ name, uri, size = 40, online }: { name: string; uri?: string | null; size?: number; online?: boolean }) {
  const initials = (name || '?').replace(/[^A-Za-z0-9؀-ۿ]/g, '').slice(0, 2).toUpperCase() || '?';
  return (
    <View>
      <LinearGradient colors={['#1D6B45', '#0B2A1D']} style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.34 }]}>
        {uri ? <Image source={uri} style={{ width: size, height: size }} contentFit="cover" /> : <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>}
      </LinearGradient>
      {online ? <View style={[styles.onlineDot, { width: size * 0.3, height: size * 0.3, borderRadius: size }]} /> : null}
    </View>
  );
}

export function Progress({ value, tone = 'em' }: { value: number; tone?: 'em' | 'blue' }) {
  return (
    <View style={styles.progress}>
      <LinearGradient
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        colors={tone === 'blue' ? ['#3B8EF0', '#8CC8FF'] : ['#12B866', '#2BE38A']}
        style={{ width: `${Math.max(2, Math.min(100, value * 100))}%`, height: '100%', borderRadius: 6 }}
      />
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <Row between style={{ marginTop: 22, marginBottom: 10 }}>
      <Txt v="h3">{title}</Txt>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Txt v="small" color={colors.faint}>{action}</Txt></Pressable> : null}
    </Row>
  );
}

export function Loading() {
  return <View style={{ paddingVertical: 48, alignItems: 'center' }}><ActivityIndicator color={colors.em} /></View>;
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const { t } = useSession();
  return (
    <Glass style={{ alignItems: 'center', gap: 10, paddingVertical: 22 }}>
      <Txt v="small" center>{text}</Txt>
      {onRetry ? <Button small kind="ghost" title={t('retry')} onPress={onRetry} /> : null}
    </Glass>
  );
}

export function Empty({ text, image }: { text: string; image?: number }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
      {image ? <Image source={image} style={{ width: 120, height: 120 }} contentFit="contain" /> : null}
      <Txt v="small" center>{text}</Txt>
    </View>
  );
}

/** Bottom sheet (modal). */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}>
          <View style={styles.grab} />
          {/* Tall sheets (admin panels) scroll instead of running off-screen. */}
          <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.82 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** App-wide toast, rendered once at the root. */
export function ToastHost() {
  const { toast } = useSession();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  const c = toast.tone === 'error' ? colors.red : toast.tone === 'info' ? colors.blue : colors.em;
  return (
    <View pointerEvents="none" style={[styles.toast, { top: insets.top + 10, borderColor: c }]}>
      <Icon name={toast.tone === 'error' ? 'close' : 'check'} size={16} color={c} stroke={2.4} />
      <Text style={[styles.toastText]}>{toast.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  glass: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.xl, padding: 16 },
  btnGrad: { borderRadius: radius.lg },
  btnFlat: { borderRadius: radius.lg, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.line },
  btnInner: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  btnText: { fontFamily: fonts.display },
  emShadow: { shadowColor: colors.em, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  blueShadow: { shadowColor: colors.blue, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  iconBtn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  badge: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 7, backgroundColor: colors.em },
  pill: { alignSelf: 'flex-start', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1 },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.3 },
  liveDot: { width: 7, height: 7, borderRadius: 7 },
  seg: { padding: 4, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.line },
  segItem: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  segText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  field: { height: 56, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.line, alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  fieldFocus: { borderColor: colors.emLine, backgroundColor: 'rgba(43,227,138,0.06)' },
  fieldInput: { flex: 1, minWidth: 0, height: '100%', color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 16, ...webNoOutline },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.line2 },
  avatarText: { color: colors.text, fontFamily: fonts.displayHeavy },
  onlineDot: { position: 'absolute', right: -2, bottom: -2, backgroundColor: colors.em, borderWidth: 2.5, borderColor: colors.bg },
  progress: { height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#09140F', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 1, borderColor: colors.line2, paddingHorizontal: 20, paddingTop: 12 },
  grab: { width: 40, height: 5, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 16 },
  toast: { position: 'absolute', left: 18, right: 18, zIndex: 999, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: 'rgba(9,20,15,0.96)', borderWidth: 1 },
  toastText: { flex: 1, color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13.5 },
});

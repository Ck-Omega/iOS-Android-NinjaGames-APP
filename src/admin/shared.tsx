import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { colors, radius } from '../ui/theme';
import { tap } from '../ui/primitives';

export type RunFn = (key: string, fn: () => Promise<unknown>, okText: string, refresh?: boolean) => Promise<void>;

export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.max(0, Math.round(m))}m`);
export const fmtSec = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
};
export const ago = (ms: number) => {
  if (!ms) return 'never';
  const s = Math.round((Date.now() - ms) / 1000);
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`;
};

export function confirm(title: string, body: string, ok = 'OK', destructive = false): Promise<boolean> {
  return new Promise((resolve) => Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: ok, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
  ]));
}

/** Big summary number tile. */
export function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
      <Text style={{ color: colors.faint, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: tone ?? colors.text, fontSize: 22, fontWeight: '800', marginTop: 2 }}>{value}</Text>
    </View>
  );
}

/** Compact action tile used in the device / PC control grids (2 per row). */
export function Action({ label, onPress, tone = 'default', busy, disabled }: {
  label: string; onPress: () => void; tone?: 'default' | 'red' | 'em' | 'blue' | 'amber'; busy?: boolean; disabled?: boolean;
}) {
  const c = tone === 'red' ? { bg: colors.redSoft, bd: colors.redLine, fg: colors.red }
    : tone === 'em' ? { bg: colors.emSoft, bd: colors.emLine, fg: colors.em }
      : tone === 'blue' ? { bg: colors.blueSoft, bd: colors.blueLine, fg: colors.blue }
        : tone === 'amber' ? { bg: colors.amberSoft, bd: colors.amberLine, fg: colors.amber }
          : { bg: colors.card2, bd: colors.line2, fg: colors.text };
  return (
    <Pressable
      disabled={disabled || busy}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({
        width: '48.5%', minHeight: 46, paddingHorizontal: 8, borderRadius: radius.sm, borderWidth: 1,
        backgroundColor: c.bg, borderColor: c.bd, alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.4 : busy ? 0.6 : pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ color: c.fg, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>{busy ? '…' : label}</Text>
    </Pressable>
  );
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>{children}</View>;
}

export function Chips<T extends string | number>({ options, value, onChange }: { options: { v: T; l: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Pressable key={String(o.v)} onPress={() => { tap(); onChange(o.v); }}
            style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center', borderWidth: 1,
              backgroundColor: on ? colors.emSoft : colors.card, borderColor: on ? colors.em : colors.line }}>
            <Text style={{ color: on ? colors.em : colors.muted, fontWeight: '700', fontSize: 12.5 }}>{o.l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Dot({ color }: { color: string }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />;
}

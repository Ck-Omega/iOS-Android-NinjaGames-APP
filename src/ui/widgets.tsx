import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { useNow } from '../lib/hooks';
import { clock, countdown, minutes, num } from '../lib/format';
import type { Me, OrderRow } from '../lib/types';
import { art } from './art';
import { Icon, type IconName } from './icons';
import { Button, Glass, Pill, Progress, Row, Sheet, Txt, tap } from './primitives';
import { colors, radius } from './theme';

// ─── Progress ring ───────────────────────────────────────────────────────
export function Ring({ value, size = 76, tone = 'em', children }: { value: number; size?: number; tone?: 'em' | 'blue'; children?: React.ReactNode }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const [a, b] = tone === 'blue' ? ['#8CC8FF', '#3B8EF0'] : ['#3CF09A', '#12B866'];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGrad id={`ring-${tone}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="1" stopColor={b} />
          </SvgGrad>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={`url(#ring-${tone})`} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c * v} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

// ─── Live PC hold (time drains every minute) ─────────────────────────────
export function liveHoldMinutes(me: Me, now: number): number {
  if (!me.hold) return me.pcTime.liveMinutes;
  const used = Math.max(0, Math.ceil((now - me.hold.createdAt) / 60_000));
  return Math.max(0, me.pcTime.storedMinutes - used);
}

export function HoldCard({ me }: { me: Me }) {
  const { t, lang, errText, showToast, refreshMe } = useSession();
  const now = useNow(1000);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!me.hold) return null;
  const left = liveHoldMinutes(me, now);
  const share = me.pcTime.storedMinutes > 0 ? left / me.pcTime.storedMinutes : 0;
  const heldFor = Math.max(0, Math.floor((now - me.hold.createdAt) / 60_000));

  const cancel = async () => {
    setBusy(true);
    try {
      const res = await api.del<{ chargedMinutes: number }>('/api/app/pc/hold');
      setConfirm(false);
      showToast(t('holdCancelled', { min: minutes(res.chargedMinutes, lang) }));
      await refreshMe();
    } catch (e) { showToast(errText(e), 'error'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <LinearGradient colors={['rgba(43,227,138,0.24)', 'rgba(43,227,138,0.04)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.liveCard}>
        <Row between center={false}>
          <View style={{ flex: 1, gap: 6 }}>
            <Pill tone="em" live label={t('pcHeldRunning')} />
            <Txt v="h2" style={{ marginTop: 4 }}>{t('isYours', { pc: me.hold.pcName })}</Txt>
            <Txt v="small">{t('unlockHint')}</Txt>
            <Txt v="tiny" color={colors.faint}>{`⏱ ${minutes(heldFor, lang)}`}</Txt>
          </View>
          <Ring value={share} size={78}>
            <Txt v="h3" center style={{ fontSize: 14 }}>{minutes(left, lang)}</Txt>
          </Ring>
        </Row>
        <Button kind="danger" small title={t('cancelHold')} icon="close" style={{ marginTop: 14 }} onPress={() => setConfirm(true)} />
      </LinearGradient>
      <Sheet visible={confirm} onClose={() => setConfirm(false)}>
        <Txt v="h2">{t('cancelHoldQ', { pc: me.hold.pcName })}</Txt>
        <Txt v="small" style={{ marginTop: 6 }}>{t('cancelHoldBody')}</Txt>
        <Row style={{ marginTop: 18 }}>
          <Button kind="ghost" title={t('keepHold')} onPress={() => setConfirm(false)} style={{ flex: 1 }} />
          <Button kind="danger" title={t('cancelHold')} onPress={cancel} loading={busy} style={{ flex: 1 }} />
        </Row>
      </Sheet>
    </>
  );
}

// ─── Stop a PlayStation session (TV goes back to the kiosk page) ─────────
let stoppingSessionId: string | null = null; // shared so the card and the bar agree

export function useStopPsSession() {
  const { me, t, errText, showToast, refreshMe } = useSession();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);
  const s = me?.psSession ?? null;
  const stopping = !!s && stoppingSessionId === s.id;

  const stop = async () => {
    if (!s) return;
    setBusy(true);
    try {
      await api.post('/api/app/ps/stop', {});
      stoppingSessionId = s.id;
      setConfirm(false);
      showToast(t('sessionStopped'));
      // The TV controller picks the command up within a few seconds.
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        await refreshMe();
      }
    } catch (e) { showToast(errText(e), 'error'); }
    finally { setBusy(false); force((x) => x + 1); }
  };

  const sheet = s ? (
    <Sheet visible={confirm} onClose={() => setConfirm(false)}>
      <Txt v="h2">{t('stopSessionQ', { station: s.stationName })}</Txt>
      <Txt v="small" style={{ marginTop: 6 }}>{t('stopSessionBody')}</Txt>
      <Row style={{ marginTop: 18 }}>
        <Button kind="ghost" title={t('keepPlaying')} onPress={() => setConfirm(false)} style={{ flex: 1 }} />
        <Button kind="danger" title={t('stopSession')} onPress={stop} loading={busy} style={{ flex: 1 }} />
      </Row>
    </Sheet>
  ) : null;

  return { session: s, stopping, ask: () => setConfirm(true), sheet };
}

/** Always-visible live session strip (rendered above the tab bar on every tab). */
export function LiveSessionBar() {
  const { me, t } = useSession();
  const now = useNow(1000);
  const { session: s, stopping, ask, sheet } = useStopPsSession();
  if (!me || !s) return null;
  const left = Math.max(0, s.endsAt - now);
  return (
    <>
      <Pressable
        onPress={() => { tap(); router.navigate({ pathname: '/play', params: { tab: 'ps' } }); }}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient colors={['rgba(59,142,240,0.96)', 'rgba(20,60,120,0.96)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.liveBar}>
          <Icon name="gamepad" size={18} color="#fff" />
          <View style={{ flex: 1 }}>
            <Txt v="tiny" color="rgba(255,255,255,0.8)" numberOfLines={1}>{s.status === 'starting' ? t('starting') : stopping ? t('stopping') : s.stationName}</Txt>
            <Txt v="h3" color="#fff">{s.status === 'starting' ? '…' : countdown(left)}</Txt>
          </View>
          {s.status === 'active' && !stopping ? (
            <Pressable onPress={() => { tap(); ask(); }} hitSlop={8} style={styles.liveStop}>
              <Txt v="tiny" color="#fff" style={{ fontWeight: '700' }}>{t('stopSession')}</Txt>
            </Pressable>
          ) : null}
        </LinearGradient>
      </Pressable>
      {sheet}
    </>
  );
}

// ─── Live PlayStation session ────────────────────────────────────────────
export function PsSessionCard({ me, compact }: { me: Me; compact?: boolean }) {
  const { t, lang } = useSession();
  const now = useNow(1000);
  const { stopping, ask, sheet } = useStopPsSession();
  const s = me.psSession;
  if (!s) return null;
  const starting = s.status === 'starting';
  const total = s.minutes * 60_000;
  const left = Math.max(0, s.endsAt - now);
  return (
    <>
    <LinearGradient colors={['rgba(99,179,255,0.24)', 'rgba(10,24,40,0.55)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.liveCard, { borderColor: colors.blueLine }]}>
      <Image source={art.cardConsole} style={styles.psArt} contentFit="contain" />
      <Pill tone="blue" live label={starting ? t('starting') : t('playingNow')} />
      <Txt v="h2" style={{ marginTop: 10 }}>{s.stationName}</Txt>
      {starting ? (
        <Txt v="small" style={{ marginTop: 6 }}>{t('startingHint')}</Txt>
      ) : (
        <>
          <Txt v="hero" style={{ fontSize: compact ? 34 : 46, lineHeight: compact ? 40 : 52, marginTop: 6 }}>{countdown(left)}</Txt>
          <Txt v="small">{t('leftEnds', { time: clock(s.endsAt, lang) })}</Txt>
          <View style={{ marginTop: 12 }}><Progress tone="blue" value={total ? left / total : 0} /></View>
          <Button
            kind="danger" small icon="close" style={{ marginTop: 14 }}
            title={stopping ? t('stopping') : t('stopSession')} disabled={stopping} onPress={ask}
          />
        </>
      )}
    </LinearGradient>
    {sheet}
    </>
  );
}

// ─── Wallet coins ────────────────────────────────────────────────────────
/** Absolute position on the "trailing" side — right in English, left in Arabic (art never covers text). */
export function trailing(rtl: boolean, offset: number) {
  return rtl ? { left: offset, transform: [{ scaleX: -1 }] } : { right: offset };
}

export function CoinTile({ kind, amount, sub, onPress }: { kind: 'pc' | 'ps'; amount: number; sub: string; onPress?: () => void }) {
  const { lang, rtl } = useSession();
  const pc = kind === 'pc';
  return (
    <Pressable onPress={() => { tap(); onPress?.(); }} style={({ pressed }) => [{ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <LinearGradient
        colors={pc ? ['rgba(43,227,138,0.16)', 'rgba(255,255,255,0.03)'] : ['rgba(99,179,255,0.16)', 'rgba(255,255,255,0.03)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.coinTile, { borderColor: pc ? colors.emLine : colors.blueLine }]}
      >
        <Image source={pc ? art.coinPc : art.coinPs} style={[styles.coinImg, trailing(rtl, -14)]} contentFit="contain" />
        <Txt v="eyebrow" color={pc ? colors.em : colors.blue}>{pc ? 'PC' : 'PS5'}</Txt>
        <Txt v="num" style={{ marginTop: 6 }}>{num(amount, lang)}</Txt>
        <Txt v="tiny" numberOfLines={1}>{sub}</Txt>
      </LinearGradient>
    </Pressable>
  );
}

// ─── Big 3D action card ──────────────────────────────────────────────────
export function ActionCard({ title, sub, image, tone, icon, onPress }: { title: string; sub: string; image: number; tone: 'em' | 'blue'; icon: IconName; onPress: () => void }) {
  const em = tone === 'em';
  const { rtl } = useSession();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [{ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <LinearGradient
        colors={em ? ['rgba(43,227,138,0.20)', 'rgba(6,18,13,0.9)'] : ['rgba(99,179,255,0.20)', 'rgba(6,14,24,0.9)']}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        style={[styles.action, { borderColor: em ? colors.emLine : colors.blueLine }]}
      >
        <Image source={image} style={[styles.actionArt, trailing(rtl, -20)]} contentFit="contain" />
        <View style={[styles.actionIcon, { backgroundColor: em ? colors.emSoft : colors.blueSoft }]}>
          <Icon name={icon} size={18} color={em ? colors.em : colors.blue} stroke={2.1} />
        </View>
        <View style={{ marginTop: 'auto' }}>
          <Txt v="h2">{title}</Txt>
          <Txt v="tiny" numberOfLines={1}>{sub}</Txt>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ─── Order tracker ───────────────────────────────────────────────────────
const ACTIVE = new Set(['pending', 'preparing', 'ready']);
export function activeOrders(rows: OrderRow[] | undefined | null): OrderRow[] {
  return (rows ?? []).filter((o) => ACTIVE.has(o.status));
}

export function OrderTracker({ orders }: { orders: OrderRow[] }) {
  const { t } = useSession();
  const now = useNow(5000);
  if (!orders.length) return null;
  return (
    <View style={{ gap: 8 }}>
      {orders.slice(0, 3).map((o) => {
        const ready = o.status === 'ready';
        const eta = Math.max(0, Math.ceil((o.createdAt + o.prepMinutes * 60_000 - now) / 60_000));
        const key = (`status_${o.status}` as const);
        const label = ['status_pending', 'status_preparing', 'status_ready', 'status_delivered', 'status_cancelled'].includes(key) ? t(key as any) : o.status;
        return (
          <Glass key={o.id} tone={ready ? 'em' : 'default'} style={{ paddingVertical: 12 }}>
            <Row>
              <View style={[styles.orderIcon, { backgroundColor: ready ? colors.em : colors.card2 }]}>
                <Icon name={o.kind === 'food' ? 'food' : 'smoke'} size={18} color={ready ? colors.emInk : colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt v="h3" numberOfLines={1}>{o.title}</Txt>
                <Txt v="tiny">{o.deliverTo ? t('deliverTo', { place: o.deliverTo }) : t('counter')}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Pill tone={ready ? 'em' : o.status === 'preparing' ? 'amber' : 'default'} label={label} live={!ready} />
                {!ready && eta > 0 ? <Txt v="tiny" style={{ marginTop: 4 }}>{`~${eta} ${t('min')}`}</Txt> : null}
              </View>
            </Row>
          </Glass>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  liveCard: { borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.emLine, overflow: 'hidden' },
  psArt: { position: 'absolute', right: -24, bottom: -26, width: 170, height: 170, opacity: 0.85 },
  coinTile: { borderRadius: radius.lg, padding: 14, borderWidth: 1, minHeight: 112, overflow: 'hidden' },
  coinImg: { position: 'absolute', top: -14, width: 74, height: 74, opacity: 0.95 },
  action: { borderRadius: radius.xxl, padding: 14, borderWidth: 1, height: 178, overflow: 'hidden' },
  actionArt: { position: 'absolute', top: -8, width: 140, height: 140 },
  actionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  orderIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  liveBar: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(140,200,255,0.5)' },
  liveStop: { paddingHorizontal: 12, height: 32, borderRadius: 12, justifyContent: 'center', backgroundColor: 'rgba(255,93,108,0.9)' },
});

import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { api, idemKey } from '../lib/api';
import { useApi } from '../lib/hooks';
import { useSession } from '../lib/session';
import { minutes, num } from '../lib/format';
import type { Stations } from '../lib/types';
import { art } from './art';
import { Button, Pill, Row, Txt, tap } from './primitives';
import { colors, radius } from './theme';

/** Extract { s, c } from a scanned TV QR (https://…/ps?s=…&c=… or ninjagames://ps?s=…&c=…). */
export function parsePsQr(data: string): { s: string; c: string } | null {
  const m = /^(?:https:\/\/(?:www\.)?ninjagamesjo\.com\/ps|ninjagames:\/\/ps)\/?\?(.+)$/i.exec(data.trim());
  if (!m) return null;
  const q: Record<string, string> = {};
  for (const part of m[1].split('&')) {
    const [k, v = ''] = part.split('=');
    q[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return q.s && q.c ? { s: q.s, c: q.c } : null;
}

/** Package picker + Start for one scanned station. */
export function PsStartPanel({ stationId, code, onDone }: { stationId: string; code: string; onDone?: () => void }) {
  const { me, t, lang, errText, showToast, refreshMe } = useSession();
  const stations = useApi<Stations>('/api/app/stations', { ttlMs: 10_000 });
  const packages = me?.pricing.psPackages ?? [30, 60, 120, 180];
  const [len, setLen] = useState(packages.includes(60) ? 60 : packages[0]);
  const [busy, setBusy] = useState(false);
  const key = useRef(idemKey('ps'));
  const station = stations.data?.ps.find((s) => s.id === stationId);
  const price = me?.pricing.psPricePerHour ?? 100;
  const cost = Math.ceil((price * len) / 60);
  const balance = me?.wallets.ps ?? 0;
  const enough = balance >= cost;
  const lenLabel = useMemo(() => (len % 60 === 0 ? (lang === 'ar' ? `${num(len / 60, lang)} ساعة` : `${len / 60} hour${len === 60 ? '' : 's'}`) : minutes(len, lang)), [len, lang]);

  const start = async () => {
    setBusy(true);
    try {
      await api.post('/api/app/ps/start', { stationId, code, minutes: len, idempotencyKey: key.current });
      showToast(t('psStarted', { station: station?.name ?? 'PS5' }));
      await refreshMe();
      onDone?.();
      router.dismissAll();
      router.navigate({ pathname: '/play', params: { tab: 'ps' } });
    } catch (e) {
      key.current = idemKey('ps');
      showToast(errText(e), 'error');
    } finally { setBusy(false); }
  };

  return (
    <View>
      <Row between>
        <View style={{ flex: 1 }}>
          <Pill tone="em" live label={t('stationFound')} />
          <Txt v="h2" style={{ marginTop: 8 }}>{station?.name ?? 'PS5'}</Txt>
        </View>
        <Image source={art.cardConsole} style={{ width: 84, height: 72 }} contentFit="contain" />
      </Row>
      <Row gap={8} style={{ marginTop: 14 }}>
        {packages.map((m) => {
          const on = m === len;
          return (
            <Pressable key={m} onPress={() => { tap(); setLen(m); }} style={[styles.pkg, on && styles.pkgOn]}>
              <Txt v="h2" center>{m % 60 === 0 ? `${num(m / 60, lang)}${lang === 'ar' ? 'س' : 'h'}` : `${num(m, lang)}${lang === 'ar' ? 'د' : 'm'}`}</Txt>
              <Txt v="tiny" center color={on ? colors.blue : colors.faint}>{num(Math.ceil((price * m) / 60), lang)}</Txt>
            </Pressable>
          );
        })}
      </Row>
      <Row between style={{ marginTop: 14 }}>
        <Txt v="small">{t('fromPsWallet')}</Txt>
        <Txt v="h3" color={enough ? colors.text : colors.red}>{t('leftAfter', { cost: num(cost, lang), left: num(Math.max(0, balance - cost), lang) })}</Txt>
      </Row>
      {enough ? (
        <Button kind="blue" title={t('startFor', { len: lenLabel })} style={{ marginTop: 14 }} loading={busy} onPress={start} />
      ) : (
        <>
          <Txt v="tiny" color={colors.amber} style={{ marginTop: 10 }}>{t('notEnoughPs')}</Txt>
          <Button kind="ghost" icon="swap" title={t('moveTokens')} style={{ marginTop: 10 }} onPress={() => { router.dismissAll(); router.navigate('/wallet'); }} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pkg: { flex: 1, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, gap: 2 },
  pkgOn: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
});

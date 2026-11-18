import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { api } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { useSession } from '../../lib/session';
import { minutes, num } from '../../lib/format';
import type { PcStation, Stations } from '../../lib/types';
import { art } from '../../ui/art';
import { Icon } from '../../ui/icons';
import {
  Button, Empty, ErrorState, Glass, Loading, Pill, Row, Screen, SectionHeader, Segmented, Sheet, Txt, tap,
} from '../../ui/primitives';
import { HoldCard, PsSessionCard } from '../../ui/widgets';
import { colors } from '../../ui/theme';

type Tab = 'pc' | 'ps';

export default function Play() {
  const { me, t, lang, errText, showToast, refreshMe } = useSession();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'ps' || me?.psSession ? 'ps' : 'pc');
  useEffect(() => { if (params.tab === 'ps' || params.tab === 'pc') setTab(params.tab); }, [params.tab]);
  // A running PS session lives on the PS tab: jump there when one appears (and on re-entry).
  const hasPsSession = !!me?.psSession;
  useEffect(() => { if (hasPsSession && params.tab !== 'pc') setTab('ps'); }, [hasPsSession]); // eslint-disable-line react-hooks/exhaustive-deps
  const stations = useApi<Stations>('/api/app/stations', { pollMs: 10_000 });
  const [selected, setSelected] = useState<PcStation | null>(null);
  const [busy, setBusy] = useState(false);

  const zones = useMemo(() => {
    const map = new Map<string, PcStation[]>();
    for (const pc of stations.data?.pcs ?? []) {
      const z = pc.zone || t('allPcs');
      map.set(z, [...(map.get(z) ?? []), pc]);
    }
    return Array.from(map.entries());
  }, [stations.data, t]);

  if (!me) return null;
  const psList = stations.data?.ps ?? [];
  const freePs = psList.filter((s) => s.state === 'available').length;

  const hold = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post('/api/app/pc/hold', { pcId: selected.id });
      setSelected(null);
      showToast(t('isYours', { pc: selected.name }));
      await Promise.all([refreshMe(), stations.refresh()]);
    } catch (e) {
      showToast(errText(e), 'error');
      void stations.refresh();
    } finally { setBusy(false); }
  };

  return (
    <Screen tabs onRefresh={() => Promise.all([stations.refresh(), refreshMe()])}>
      <Txt v="h1">{t('play')}</Txt>
      <View style={{ marginTop: 14 }}>
        <Segmented<Tab>
          tone={tab === 'ps' ? 'blue' : 'em'}
          value={tab}
          onChange={setTab}
          options={[{ value: 'pc', label: t('pcs') }, { value: 'ps', label: t('playstation') }]}
        />
      </View>

      {tab === 'pc' ? (
        <>
          {me.hold ? <View style={{ marginTop: 16 }}><HoldCard me={me} /></View> : null}
          <Row between style={{ marginTop: 16 }}>
            <Row gap={12}>
              <Legend color={colors.em} label={t('free')} />
              <Legend color={colors.amber} label={t('held')} />
              <Legend color={colors.red} label={t('busy')} />
            </Row>
            <Pill tone="em" live label={t('live')} />
          </Row>
          {stations.loading && !stations.data ? <Loading /> : null}
          {stations.error && !stations.data ? <View style={{ marginTop: 16 }}><ErrorState text={errText(stations.error)} onRetry={stations.refresh} /></View> : null}
          {zones.map(([zone, pcs]) => (
            <View key={zone}>
              <Txt v="eyebrow" style={{ marginTop: 18, marginBottom: 10 }}>{zone}</Txt>
              <View style={styles.grid}>
                {pcs.map((pc) => <Seat key={pc.id} pc={pc} selected={selected?.id === pc.id} disabled={!!me.hold} onPress={() => setSelected(pc)} />)}
              </View>
            </View>
          ))}
          {me.pcTime.storedMinutes <= 0 && !me.hold ? (
            <Glass tone="amber" style={{ marginTop: 16 }}><Txt v="small" color={colors.amber}>{t('noTime')}</Txt></Glass>
          ) : null}
        </>
      ) : (
        <>
          {me.psSession ? <View style={{ marginTop: 16 }}><PsSessionCard me={me} /></View> : null}
          {!me.psSession ? (
            <Glass tone="blue" style={{ marginTop: 16, overflow: 'hidden', minHeight: 160 }}>
              <Image source={art.cardConsole} style={styles.psArt} contentFit="contain" />
              <Txt v="eyebrow" color={colors.blue}>{t('psWallet')}</Txt>
              <Txt v="num" style={{ marginTop: 6 }}>{`${num(me.wallets.ps, lang)} `}<Txt v="tiny">{t('tokens')}</Txt></Txt>
              <Txt v="small" style={{ marginTop: 2, maxWidth: 190 }}>{t('perHour', { price: num(me.pricing.psPricePerHour, lang) })}</Txt>
              <Button kind="blue" icon="scan" title={t('scanQr')} style={{ marginTop: 16, alignSelf: 'flex-start', minWidth: 180 }} onPress={() => router.push('/scan')} />
            </Glass>
          ) : null}
          <SectionHeader title={t('stations')} action={t('freeOf', { n: num(freePs, lang), total: num(psList.length, lang) })} />
          {psList.length === 0 && !stations.loading ? <Empty text={t('noStations')} /> : null}
          <View style={{ gap: 10 }}>
            {psList.map((s) => {
              const busy = s.state === 'in-use';
              const off = s.state === 'offline';
              const freeIn = s.endsAt ? Math.max(1, Math.ceil((s.endsAt - Date.now()) / 60_000)) : 0;
              return (
                <Glass key={s.id} style={{ paddingVertical: 12, opacity: off ? 0.5 : 1 }} onPress={!busy && !off ? () => router.push('/scan') : undefined}>
                  <Row between>
                    <Row>
                      <View style={[styles.psIcon, { backgroundColor: busy ? colors.redSoft : colors.blueSoft }]}>
                        <Icon name="gamepad" size={18} color={busy ? colors.red : colors.blue} />
                      </View>
                      <View>
                        <Txt v="h3">{s.name}</Txt>
                        <Txt v="tiny">{off ? t('offlineState') : busy ? t('freeIn', { m: num(freeIn, lang) }) : t('scanToStart')}</Txt>
                      </View>
                    </Row>
                    <Pill tone={off ? 'default' : busy ? 'red' : 'em'} label={off ? t('offlineState') : busy ? t('busy') : t('free')} />
                  </Row>
                </Glass>
              );
            })}
          </View>
        </>
      )}

      <Sheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected ? (
          <>
            <Row between>
              <View>
                <Txt v="eyebrow">{t('holdNow')}</Txt>
                <Txt v="h2" style={{ marginTop: 4 }}>{selected.zone ? `${selected.name} · ${selected.zone}` : selected.name}</Txt>
              </View>
              <Image source={art.cardPc} style={{ width: 84, height: 70 }} contentFit="contain" />
            </Row>
            <Glass tone="amber" style={{ marginTop: 14, padding: 14 }}>
              <Row gap={8}><Icon name="clock" size={18} color={colors.amber} /><Txt v="h3" color={colors.amber}>{t('drainNow')}</Txt></Row>
              <Txt v="tiny" style={{ marginTop: 6 }}>{t('drainBody')}</Txt>
            </Glass>
            <Row between style={{ marginTop: 14 }}>
              <Txt v="small">{t('pcTimeLeft')}</Txt>
              <Txt v="h3">{minutes(me.pcTime.liveMinutes, lang)}</Txt>
            </Row>
            <Button
              title={t('holdPc', { pc: selected.name })} style={{ marginTop: 16 }} loading={busy}
              disabled={selected.state !== 'available' || me.pcTime.liveMinutes <= 0} onPress={hold}
            />
            {me.pcTime.liveMinutes <= 0 ? <Txt v="tiny" color={colors.amber} style={{ marginTop: 10 }}>{t('noTime')}</Txt> : null}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <Row gap={5}><View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: color }} /><Txt v="tiny">{label}</Txt></Row>;
}

function Seat({ pc, selected, disabled, onPress }: { pc: PcStation; selected: boolean; disabled: boolean; onPress: () => void }) {
  const { t } = useSession();
  const free = pc.state === 'available';
  const tone =
    pc.mine ? { bd: colors.em, bg: 'rgba(43,227,138,0.22)', fg: colors.em, label: t('you') }
      : selected ? { bd: colors.em, bg: 'rgba(43,227,138,0.2)', fg: colors.em, label: t('selected') }
        : free ? { bd: colors.emLine, bg: 'rgba(43,227,138,0.08)', fg: colors.em, label: t('free') }
          : pc.state === 'reserved' ? { bd: colors.amberLine, bg: colors.card, fg: colors.amber, label: t('held') }
            : pc.state === 'in-use' ? { bd: colors.line, bg: colors.card, fg: colors.red, label: t('busy') }
              : { bd: colors.line, bg: colors.card, fg: colors.faint, label: t('offlineState') };
  const dim = pc.state === 'offline' ? 0.35 : pc.state === 'in-use' ? 0.6 : 1;
  return (
    <Pressable
      disabled={!free || disabled}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [styles.seat, { borderColor: tone.bd, backgroundColor: tone.bg, opacity: dim, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
    >
      <Txt v="h3" center style={{ fontSize: 13.5 }} numberOfLines={1}>{pc.name}</Txt>
      <Txt v="eyebrow" center color={tone.fg} style={{ fontSize: 9, letterSpacing: 0.6, marginTop: 2 }}>{tone.label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seat: { width: '22.6%', height: 66, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  psArt: { position: 'absolute', right: -30, bottom: -36, width: 190, height: 190, opacity: 0.9 },
  psIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

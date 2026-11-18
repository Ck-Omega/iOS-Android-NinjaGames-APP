import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { api, idemKey } from '../lib/api';
import { assetUrl } from '../lib/config';
import { useApi } from '../lib/hooks';
import { useSession } from '../lib/session';
import { dayTime, minutes, num } from '../lib/format';
import type { LeaderRow, Tournament } from '../lib/types';
import { art } from '../ui/art';
import {
  Avatar, Button, Empty, ErrorState, IconButton, Loading, Pill, Row, Screen, Segmented, Sheet, Txt,
} from '../ui/primitives';
import { colors, radius } from '../ui/theme';

type Tab = 'tournaments' | 'leaderboard';
type By = 'playtime' | 'level';

export default function Events() {
  const { t, lang, errText, showToast, refreshMe } = useSession();
  const [tab, setTab] = useState<Tab>('tournaments');
  const [by, setBy] = useState<By>('playtime');
  const list = useApi<{ tournaments: Tournament[] }>('/api/app/tournaments', { ttlMs: 120_000 });
  const board = useApi<{ rows: LeaderRow[]; mine: LeaderRow | null }>(tab === 'leaderboard' ? `/api/app/leaderboard?by=${by}` : null);
  const [joining, setJoining] = useState<Tournament | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(idemKey('join'));

  const join = async () => {
    if (!joining) return;
    setBusy(true);
    try {
      await api.post('/api/tournament/join', { tournamentId: joining.id, idempotencyKey: key.current });
      showToast(t('joinedOk', { name: joining.name }));
      setJoining(null);
      key.current = idemKey('join');
      await Promise.all([list.refresh(), refreshMe()]);
    } catch (e) { key.current = idemKey('join'); showToast(errText(e), 'error'); }
    finally { setBusy(false); }
  };

  const statusPill = (s: string) =>
    s === 'active' ? <Pill tone="amber" live label={t('liveNow')} />
      : s === 'registration' ? <Pill tone="em" live label={t('open')} />
        : s === 'completed' ? <Pill label={t('ended')} />
          : <Pill tone="blue" label={t('upcoming')} />;

  const fmtValue = (row: LeaderRow) => (by === 'playtime' ? minutes(row.value, lang) : t('lv', { n: num(row.level, lang) }));

  return (
    <Screen onRefresh={() => (tab === 'tournaments' ? list.refresh() : board.refresh())}>
      <Row>
        <IconButton name="back" onPress={() => router.back()} />
        <Txt v="h1" style={{ fontSize: 26 }}>{t('events')}</Txt>
      </Row>
      <View style={{ marginTop: 14 }}>
        <Segmented<Tab> value={tab} onChange={setTab} options={[{ value: 'tournaments', label: t('tournaments') }, { value: 'leaderboard', label: t('leaderboard') }]} />
      </View>

      {tab === 'tournaments' ? (
        <View style={{ gap: 14, marginTop: 14 }}>
          {list.loading && !list.data ? <Loading /> : null}
          {list.error && !list.data ? <ErrorState text={errText(list.error)} onRetry={list.refresh} /> : null}
          {list.data && list.data.tournaments.length === 0 ? <Empty text={t('noEvents')} image={art.eventBanner} /> : null}
          {list.data?.tournaments.map((x) => {
            const full = !!x.maxPlayers && x.playerCount >= x.maxPlayers;
            const canJoin = x.status === 'registration' && !x.joined && !full;
            return (
              <View key={x.id} style={styles.card}>
                <Image source={x.banner ? assetUrl(x.banner) : art.eventBanner} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                <LinearGradient colors={['rgba(3,10,7,0.2)', 'rgba(3,10,7,0.97)']} locations={[0, 0.7]} style={StyleSheet.absoluteFill} />
                <View style={{ flex: 1, justifyContent: 'space-between', padding: 14 }}>
                  <Row between>
                    {statusPill(x.status)}
                    {x.maxPlayers ? <Pill label={`${num(x.playerCount, lang)} / ${num(x.maxPlayers, lang)}`} /> : null}
                  </Row>
                  <View>
                    <Txt v="h2">{x.name}</Txt>
                    <Txt v="small">{[x.gameName, x.format, x.startTime ? dayTime(x.startTime, lang) : null].filter(Boolean).join(' · ')}</Txt>
                    {x.winner ? <Txt v="small" color={colors.amber} style={{ marginTop: 4 }}>{t('winner', { name: x.winner })}</Txt> : null}
                    {x.joined ? <Pill tone="em" icon="check" label={t('joined')} /> : null}
                    {canJoin ? <Button small title={t('joinFor', { cost: num(x.myEntryCost, lang) })} style={{ marginTop: 10 }} onPress={() => setJoining(x)} /> : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ marginTop: 14 }}>
          <Segmented<By> value={by} onChange={setBy} options={[{ value: 'playtime', label: t('byPlaytime') }, { value: 'level', label: t('byLevel') }]} />
          {board.loading && !board.data ? <Loading /> : null}
          {board.error && !board.data ? <View style={{ marginTop: 12 }}><ErrorState text={errText(board.error)} onRetry={board.refresh} /></View> : null}
          <View style={{ marginTop: 12, gap: 4 }}>
            {board.data?.rows.map((r) => (
              <Row key={r.uid} style={[styles.lb, r.me && styles.lbMe]}>
                <Txt v="h3" center style={{ width: 26 }} color={r.rank <= 3 ? colors.amber : colors.faint}>{num(r.rank, lang)}</Txt>
                <Avatar name={r.username} uri={r.avatar} size={36} online={r.online} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3" numberOfLines={1}>{r.me ? t('you') : r.username}</Txt>
                  <Txt v="tiny">{t('lv', { n: num(r.level, lang) })}</Txt>
                </View>
                <Txt v="h3">{fmtValue(r)}</Txt>
              </Row>
            ))}
            {board.data?.mine && !board.data.rows.some((r) => r.me) ? (
              <Row style={[styles.lb, styles.lbMe, { marginTop: 8 }]}>
                <Txt v="h3" center style={{ width: 26 }} color={colors.em}>—</Txt>
                <Avatar name={board.data.mine.username} uri={board.data.mine.avatar} size={36} />
                <View style={{ flex: 1 }}><Txt v="h3">{t('you')}</Txt></View>
                <Txt v="h3">{fmtValue(board.data.mine)}</Txt>
              </Row>
            ) : null}
          </View>
        </View>
      )}

      <Sheet visible={!!joining} onClose={() => setJoining(null)}>
        {joining ? (
          <>
            <Txt v="eyebrow">{joining.gameName}</Txt>
            <Txt v="h2" style={{ marginTop: 4 }}>{joining.name}</Txt>
            <Row between style={{ marginTop: 14 }}>
              <Txt v="small">{t('pcWallet')}</Txt>
              <Txt v="h3">{`−${num(joining.myEntryCost, lang)} ${t('tokens')}`}</Txt>
            </Row>
            {joining.rules ? <Txt v="tiny" style={{ marginTop: 10 }} numberOfLines={6}>{joining.rules}</Txt> : null}
            <Button title={t('joinFor', { cost: num(joining.myEntryCost, lang) })} style={{ marginTop: 16 }} loading={busy} onPress={join} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { height: 210, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.line2 },
  lb: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: radius.lg, gap: 12 },
  lbMe: { backgroundColor: colors.emSoft, borderWidth: 1, borderColor: colors.emLine },
});

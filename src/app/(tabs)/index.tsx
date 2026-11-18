import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../lib/session';
import { useApi } from '../../lib/hooks';
import { assetUrl } from '../../lib/config';
import { dayTime, minutes, num } from '../../lib/format';
import type { FriendsData, OrderRow, Stations, Tournament } from '../../lib/types';
import { art } from '../../ui/art';
import { Avatar, Backdrop, Glass, IconButton, Pill, Row, SectionHeader, TAB_BAR_SPACE, Txt, tap } from '../../ui/primitives';
import { ActionCard, CoinTile, HoldCard, OrderTracker, PsSessionCard, activeOrders, liveHoldMinutes, trailing } from '../../ui/widgets';
import { colors, radius } from '../../ui/theme';
import { useNow } from '../../lib/hooks';

export default function Home() {
  const { me, t, lang, rtl, refreshMe } = useSession();
  const insets = useSafeAreaInsets();
  const now = useNow(30_000);
  const stations = useApi<Stations>('/api/app/stations', { pollMs: 30_000 });
  const orders = useApi<{ orders: OrderRow[] }>('/api/app/orders', { pollMs: (d: any) => (d?.orders ?? []).some((o: any) => !['delivered','completed','cancelled','rejected','done'].includes(String(o.status))) ? 15_000 : 90_000 });
  const events = useApi<{ tournaments: Tournament[] }>('/api/app/tournaments', { ttlMs: 120_000 });
  const friends = useApi<FriendsData>('/api/app/friends', { pollMs: 120_000, ttlMs: 60_000 });
  const [refreshing, setRefreshing] = useState(false);
  if (!me) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening');
  const pcs = stations.data?.pcs ?? [];
  const ps = stations.data?.ps ?? [];
  const freePcs = pcs.filter((p) => p.state === 'available').length;
  const freePs = ps.filter((p) => p.state === 'available').length;
  const pcLive = liveHoldMinutes(me, now);
  const psHours = me.pricing.psPricePerHour > 0 ? (me.wallets.ps / me.pricing.psPricePerHour) * 60 : 0;
  const nextEvent = (events.data?.tournaments ?? []).find((x) => x.status === 'active' || x.status === 'registration' || x.status === 'upcoming');
  const online = (friends.data?.friends ?? []).filter((f) => f.online);
  const myOrders = activeOrders(orders.data?.orders);
  const busyState = me.psSession || me.hold;

  const refresh = async () => { await Promise.all([refreshMe(), stations.refresh(), orders.refresh(), events.refresh(), friends.refresh()]); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Backdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom }}
        refreshControl={<RefreshControl tintColor={colors.em} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } }} />}
      >
        {/* ── Cinematic hero ─────────────────────────────── */}
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <Image source={art.homeHero} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={['rgba(4,9,10,0.55)', 'rgba(4,9,10,0.15)', 'rgba(4,9,10,0.85)', colors.bg]} locations={[0, 0.35, 0.8, 1]} style={StyleSheet.absoluteFill} />
          <Image source={art.heroNinja} style={[styles.heroNinja, trailing(rtl, -30)]} contentFit="contain" transition={300} />

          <Row between style={{ paddingHorizontal: 18 }}>
            <Pressable onPress={() => { tap(); router.push('/profile'); }}>
              <Row>
                <Avatar name={me.player.username} uri={me.player.avatar} size={42} />
                <View>
                  <Txt v="tiny" color={colors.muted}>{greeting}</Txt>
                  <Txt v="h3">{me.player.displayName || me.player.username}</Txt>
                </View>
              </Row>
            </Pressable>
            <Row gap={8}>
              {me.player.vip ? <Pill tone="amber" icon="crown" label="VIP" /> : null}
              <IconButton name="user" onPress={() => router.push('/profile')} />
            </Row>
          </Row>

          <View style={styles.heroCopy}>
            <Pill tone="em" live label={`${t('live')} · ${num(freePcs, lang)} PC · ${num(freePs, lang)} PS5`} />
            <Txt v="hero" style={{ marginTop: 12, maxWidth: 260 }}>
              {busyState ? (me.psSession ? me.psSession.stationName : t('isYours', { pc: me.hold!.pcName })) : lang === 'ar' ? 'جاهز\nللّعب؟' : 'Ready to\nplay, ninja?'}
            </Txt>
            <Txt v="small" style={{ marginTop: 6, maxWidth: 240 }}>
              {`${t('pcTimeLeft')}: ${minutes(pcLive, lang)}`}
            </Txt>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, marginTop: -26, gap: 12 }}>
          {/* Live states first */}
          <PsSessionCard me={me} />
          <HoldCard me={me} />

          {/* Wallets */}
          <Row gap={10}>
            <CoinTile kind="pc" amount={me.wallets.pc} sub={t('pcTokens', { time: minutes(pcLive, lang) })} onPress={() => router.push('/wallet')} />
            <CoinTile kind="ps" amount={me.wallets.ps} sub={t('psApprox', { time: minutes(psHours, lang) })} onPress={() => router.push('/wallet')} />
          </Row>

          {/* Big actions */}
          <Row gap={10}>
            <ActionCard
              tone="em" icon="monitor" image={art.cardPc} title={t('holdAPc')}
              sub={t('freeNow', { n: num(freePcs, lang), total: num(pcs.length, lang) })}
              onPress={() => router.push({ pathname: '/play', params: { tab: 'pc' } })}
            />
            <ActionCard
              tone="blue" icon="scan" image={art.cardConsole} title={t('startPs5')} sub={t('scanTvCode')}
              onPress={() => router.push('/scan')}
            />
          </Row>
        </View>

        <View style={{ paddingHorizontal: 18 }}>
          {/* Orders */}
          {myOrders.length ? (
            <>
              <SectionHeader title={t('activeOrders')} action={t('seeAll')} onAction={() => router.push('/order')} />
              <OrderTracker orders={myOrders} />
            </>
          ) : null}

          {/* Squad online */}
          {online.length ? (
            <>
              <SectionHeader title={t('onlineN', { n: num(online.length, lang) })} action={t('seeAll')} onAction={() => router.push('/social?tab=friends')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 8 }}>
                {online.map((f) => (
                  <Pressable key={f.uid} onPress={() => router.push({ pathname: '/chat/[uid]', params: { uid: f.uid, name: f.username } })} style={{ width: 64, alignItems: 'center', gap: 6 }}>
                    <Avatar name={f.username} uri={f.avatar} size={54} online />
                    <Txt v="tiny" center numberOfLines={1} color={colors.text}>{f.username}</Txt>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* Next event */}
          <SectionHeader title={t('nextUp')} action={t('seeAll')} onAction={() => router.push('/events')} />
          <Pressable onPress={() => { tap(); router.push('/events'); }} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <View style={styles.eventCard}>
              <Image source={nextEvent?.banner ? assetUrl(nextEvent.banner) : art.eventBanner} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
              <LinearGradient colors={['rgba(3,10,7,0.1)', 'rgba(3,10,7,0.95)']} style={StyleSheet.absoluteFill} />
              <View style={{ flex: 1, justifyContent: 'space-between', padding: 16 }}>
                <Row between>
                  <Pill tone="em" live label={nextEvent ? (nextEvent.status === 'active' ? t('liveNow') : t('open')) : t('events')} />
                  {nextEvent?.maxPlayers ? <Pill label={`${num(nextEvent.playerCount, lang)} / ${num(nextEvent.maxPlayers, lang)}`} /> : null}
                </Row>
                <View>
                  <Txt v="h2">{nextEvent ? nextEvent.name : t('noEvents')}</Txt>
                  {nextEvent ? (
                    <Txt v="small">{[nextEvent.gameName, nextEvent.startTime ? dayTime(nextEvent.startTime, lang) : null, `${num(nextEvent.myEntryCost, lang)} ${t('tokens')}`].filter(Boolean).join(' · ')}</Txt>
                  ) : null}
                </View>
              </View>
            </View>
          </Pressable>

          {/* Food promo */}
          <Pressable onPress={() => { tap(); router.push('/order'); }} style={({ pressed }) => [{ marginTop: 12, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <View style={styles.promo}>
              <Image source={art.promoFood} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={['rgba(4,9,10,0.95)', 'rgba(4,9,10,0.35)']} style={StyleSheet.absoluteFill} />
              <View style={{ padding: 16, gap: 4, maxWidth: 220 }}>
                <Txt v="eyebrow" color={colors.em}>{t('order')}</Txt>
                <Txt v="h2">{lang === 'ar' ? 'جائع؟ نوصلك لجهازك' : 'Hungry? We bring it to your seat'}</Txt>
                <Txt v="tiny">{`${t('food')} · ${t('hookah')} · ${t('tobacco')}`}</Txt>
              </View>
            </View>
          </Pressable>

          <Txt v="tiny" center color={colors.faint} style={{ marginTop: 18 }}>{t('topUpHint')}</Txt>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 420, overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroNinja: { position: 'absolute', bottom: 6, width: 250, height: 320 },
  heroCopy: { position: 'absolute', left: 18, right: 18, bottom: 48 },
  eventCard: { height: 176, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.line2 },
  promo: { height: 128, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
});

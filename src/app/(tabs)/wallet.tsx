import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { api, idemKey } from '../../lib/api';
import { useSession } from '../../lib/session';
import { minutes, num } from '../../lib/format';
import { TIME_PACKAGES, type TimePackage } from '../../lib/time-packages';
import { art } from '../../ui/art';
import { Icon } from '../../ui/icons';
import { Button, Glass, Pill, Row, Screen, Sheet, Txt, tap } from '../../ui/primitives';
import { colors, fonts, gradients, radius, webNoOutline } from '../../ui/theme';

export default function Wallet() {
  const { me, t, lang, errText, showToast, refreshMe, rtl } = useSession();
  const [from, setFrom] = useState<'pc' | 'ps'>('pc');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(idemKey('convert'));
  const [pkg, setPkg] = useState<TimePackage | null>(null);
  const [buying, setBuying] = useState(false);
  // Same key is reused while the same package purchase is pending/retried.
  const buyKey = useRef<{ id: string; key: string } | null>(null);
  if (!me) return null;

  const to = from === 'pc' ? 'ps' : 'pc';
  const n = Math.floor(Number(amount) || 0);
  const balance = me.wallets[from];
  const feePct = me.pricing.convertFeePercent;
  const fee = Math.ceil((n * feePct) / 100);
  const receives = Math.max(0, n - fee);
  const allowed = from === 'pc' ? me.pricing.pcToPs : me.pricing.psToPc;
  const valid = allowed && n > 0 && n <= balance && receives > 0;
  const label = (w: 'pc' | 'ps') => (w === 'pc' ? 'PC' : 'PS');

  const convert = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ received: number }>('/api/app/wallet/convert', { from, amount: n, idempotencyKey: key.current });
      showToast(t('moved', { n: num(res.received, lang) }));
      setAmount('');
      key.current = idemKey('convert');
      await refreshMe();
    } catch (e) {
      key.current = idemKey('convert');
      showToast(errText(e), 'error');
    } finally { setBusy(false); }
  };

  const live = me.pricing.timePackages;
  const packages: TimePackage[] = live && live.length
    ? live.map((p) => ({ id: p.id, hours: p.hours, coins: p.coins, vipBonusHours: p.vipBonusHours }))
    : TIME_PACKAGES;
  const bestId = 'time_gold'; // featured tag stays on Gold, as on the kiosk
  const vip = !!me.player.vip && me.player.vip.expiresAt > Date.now();
  const bonusOf = (p: TimePackage) => (vip ? p.vipBonusHours : 0);
  const buy = async () => {
    if (!pkg) return;
    if (!buyKey.current || buyKey.current.id !== pkg.id) buyKey.current = { id: pkg.id, key: idemKey('buytime') };
    setBuying(true);
    try {
      await api.post('/api/time/buy', { packageId: pkg.id, idempotencyKey: buyKey.current.key });
      buyKey.current = null;
      showToast(t('timeBought', { h: t('hoursN', { n: num(pkg.hours + bonusOf(pkg), lang) }) }));
      setPkg(null);
      await refreshMe();
    } catch (e) {
      // Definitive server answers end this attempt; network errors keep the key for a safe retry.
      if ((e as { code?: string }).code) buyKey.current = null;
      showToast(errText(e), 'error');
    } finally { setBuying(false); }
  };

  const psHours = me.pricing.psPricePerHour > 0 ? (me.wallets.ps / me.pricing.psPricePerHour) * 60 : 0;

  return (
    <Screen tabs onRefresh={refreshMe}>
      <Txt v="h1">{t('wallet')}</Txt>

      <WalletCard kind="pc" amount={me.wallets.pc} sub={t('pcTokens', { time: minutes(me.pcTime.liveMinutes, lang) })} active={from === 'pc'} />
      <Pressable
        onPress={() => { tap(); setFrom(to); setAmount(''); }}
        style={({ pressed }) => [styles.swapWrap, { transform: [{ scale: pressed ? 0.92 : 1 }, { rotate: from === 'pc' ? '0deg' : '180deg' }] }]}
        accessibilityLabel="swap direction"
      >
        <LinearGradient colors={gradients.em} style={styles.swap}>
          <Icon name="swap" size={20} color={colors.emInk} stroke={2.3} />
        </LinearGradient>
      </Pressable>
      <WalletCard kind="ps" amount={me.wallets.ps} sub={`${t('perHour', { price: num(me.pricing.psPricePerHour, lang) })} · ≈ ${minutes(psHours, lang)}`} active={from === 'ps'} />

      <Glass style={{ marginTop: 14 }}>
        <Row between>
          <Txt v="h3">{t('move', { from: label(from), to: label(to) })}</Txt>
          <Pill label="1 : 1" />
        </Row>
        <View style={[styles.amountBox, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          <TextInput
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.faint}
            selectionColor={colors.em}
            style={[styles.amountInput, { textAlign: rtl ? 'right' : 'left' }]}
          />
          <Pressable onPress={() => { tap(); setAmount(String(balance)); }} hitSlop={8}>
            <Txt v="tiny" color={colors.em}>{`${t('max')} ${num(balance, lang)}`}</Txt>
          </Pressable>
        </View>
        <Row gap={8} style={{ marginTop: 10 }}>
          {[100, 250, 500].map((q) => (
            <Pressable key={q} disabled={q > balance} onPress={() => { tap(); setAmount(String(q)); }} style={[styles.chip, q > balance && { opacity: 0.35 }]}>
              <Txt v="small" center color={colors.text}>{num(q, lang)}</Txt>
            </Pressable>
          ))}
        </Row>
        <View style={{ marginTop: 12, gap: 6 }}>
          <Row between><Txt v="small">{t('fee', { p: num(feePct, lang) })}</Txt><Txt v="h3">{n ? `−${num(fee, lang)}` : '—'}</Txt></Row>
          <Row between>
            <Txt v="small">{t('receives', { to: label(to) })}</Txt>
            <Txt v="h3" color={to === 'ps' ? colors.blue : colors.em}>{n ? `+${num(receives, lang)}` : '—'}</Txt>
          </Row>
        </View>
        {!allowed ? <Txt v="tiny" color={colors.amber} style={{ marginTop: 8 }}>{t('directionOff')}</Txt> : null}
      </Glass>
      <Button title={t('moveN', { n: num(n || 0, lang) })} style={{ marginTop: 12 }} disabled={!valid} loading={busy} onPress={convert} />

      <Row between style={{ marginTop: 26 }}>
        <View style={{ flex: 1 }}>
          <Txt v="h2">{t('buyTime')}</Txt>
          <Txt v="tiny" color={colors.muted}>{t('buyTimeSub')}</Txt>
        </View>
        <Pill tone="em" icon="clock" label={`${t('timeLeftNow')}: ${minutes(me.pcTime.liveMinutes, lang)}`} />
      </Row>
      <View style={{ marginTop: 10, gap: 10 }}>
        {packages.map((p) => {
          const short = p.coins - me.wallets.pc;
          const can = short <= 0;
          const bonus = bonusOf(p);
          return (
            <Pressable key={p.id} onPress={() => { tap(); setPkg(p); }} disabled={!can} style={{ opacity: can ? 1 : 0.45 }}>
              <Glass tone={p.id === bestId ? 'em' : undefined} style={{ paddingVertical: 14 }}>
                <Row between>
                  <View style={{ flex: 1 }}>
                    <Row gap={8}>
                      <Txt v="h2">{t('hoursN', { n: num(p.hours, lang) })}</Txt>
                      {p.id === bestId ? <Pill tone="em" label={t('bestValue')} /> : null}
                    </Row>
                    {bonus ? <Txt v="tiny" color={colors.amber}>{t('vipBonusH', { n: num(bonus, lang) })}</Txt> : null}
                    {!can ? <Txt v="tiny" color={colors.faint}>{t('needMore', { n: num(short, lang) })}</Txt> : null}
                  </View>
                  <Txt v="h2" color={colors.em}>{`${num(p.coins, lang)} ${t('tok')}`}</Txt>
                </Row>
              </Glass>
            </Pressable>
          );
        })}
      </View>
      <Txt v="tiny" center color={colors.faint} style={{ marginTop: 14 }}>{t('topUpHint')}</Txt>

      <Sheet visible={!!pkg} onClose={() => !buying && setPkg(null)}>
        {pkg ? (
          <>
            <Txt v="h2">{t('buyConfirmTitle')}</Txt>
            <Row between style={{ marginTop: 14 }}>
              <Txt v="small">{t('youPay')}</Txt>
              <Txt v="h3" color={colors.amber}>{`−${num(pkg.coins, lang)} ${t('tok')}`}</Txt>
            </Row>
            <Row between style={{ marginTop: 8 }}>
              <Txt v="small">{t('youGet')}</Txt>
              <Txt v="h3" color={colors.em}>{`+${t('hoursN', { n: num(pkg.hours + bonusOf(pkg), lang) })}`}</Txt>
            </Row>
            {bonusOf(pkg) ? <Txt v="tiny" color={colors.amber} style={{ marginTop: 6 }}>{t('vipBonusH', { n: num(bonusOf(pkg), lang) })}</Txt> : null}
            <Button
              style={{ marginTop: 16 }} loading={buying} disabled={pkg.coins > me.wallets.pc}
              title={t('buyNow', { h: t('hoursN', { n: num(pkg.hours + bonusOf(pkg), lang) }), n: num(pkg.coins, lang) })}
              onPress={buy}
            />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function WalletCard({ kind, amount, sub, active }: { kind: 'pc' | 'ps'; amount: number; sub: string; active: boolean }) {
  const { t, lang } = useSession();
  const pc = kind === 'pc';
  return (
    <LinearGradient
      colors={pc ? ['rgba(43,227,138,0.26)', 'rgba(10,40,26,0.55)'] : ['rgba(99,179,255,0.24)', 'rgba(10,24,40,0.55)']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: active ? (pc ? colors.em : colors.blue) : colors.line2, marginTop: pc ? 14 : 0 }]}
    >
      <Image source={pc ? art.cardPc : art.cardConsole} style={styles.cardArt} contentFit="contain" />
      <Image source={pc ? art.coinPc : art.coinPs} style={styles.coin} contentFit="contain" />
      <Row gap={8}>
        <Icon name={pc ? 'monitor' : 'gamepad'} size={16} color={pc ? colors.em : colors.blue} />
        <Txt v="eyebrow" color={pc ? colors.em : colors.blue}>{pc ? t('pcWallet') : t('psWallet')}</Txt>
      </Row>
      <Txt v="hero" style={{ marginTop: 8, fontSize: 40, lineHeight: 46 }}>{num(amount, lang)}</Txt>
      <Txt v="small" style={{ maxWidth: 200 }}>{sub}</Txt>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xxl, padding: 18, borderWidth: 1.5, overflow: 'hidden', minHeight: 150 },
  cardArt: { position: 'absolute', right: -22, bottom: -24, width: 150, height: 150, opacity: 0.85 },
  coin: { position: 'absolute', right: 18, top: 16, width: 34, height: 34 },
  swapWrap: { alignSelf: 'center', marginVertical: -12, zIndex: 3 },
  swap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.bg },
  amountBox: { marginTop: 12, height: 58, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.emLine, backgroundColor: 'rgba(43,227,138,0.05)', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  amountInput: { flex: 1, minWidth: 0, width: '100%', height: '100%', color: colors.text, fontFamily: fonts.displayHeavy, fontSize: 26, ...webNoOutline },
  chip: { flex: 1, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: 'center' },
});

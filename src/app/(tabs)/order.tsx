import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError, idemKey } from '../../lib/api';
import { assetUrl } from '../../lib/config';
import { useApi } from '../../lib/hooks';
import { useSession } from '../../lib/session';
import { num } from '../../lib/format';
import type { FoodItem, Menu, OrderRow } from '../../lib/types';
import { Icon } from '../../ui/icons';
import {
  Button, ErrorState, Glass, Loading, Pill, Row, Screen, SectionHeader, Segmented, TAB_BAR_SPACE, Txt, tap,
} from '../../ui/primitives';
import { OrderTracker, activeOrders } from '../../ui/widgets';
import { colors, gradients, radius } from '../../ui/theme';

type Tab = 'food' | 'hookah' | 'tobacco';
type Cat = 'all' | 'drinks' | 'snacks' | 'food';

export default function Order() {
  const { me, t, lang, errText, showToast, refreshMe } = useSession();
  const insets = useSafeAreaInsets();
  const menu = useApi<Menu>('/api/app/menu', { ttlMs: 600_000 });
  const orders = useApi<{ orders: OrderRow[] }>('/api/app/orders', { pollMs: (d: any) => (d?.orders ?? []).some((o: any) => !['delivered','completed','cancelled','rejected','done'].includes(String(o.status))) ? 15_000 : 90_000 });
  const [tab, setTab] = useState<Tab>('food');
  const [cat, setCat] = useState<Cat>('all');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [flavor, setFlavor] = useState<string | null>(null);
  const [ice, setIce] = useState<boolean | null>(null);
  const [tobacco, setTobacco] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(idemKey('order'));

  const place = me?.psSession?.stationName ?? me?.hold?.pcName ?? null;
  const food = useMemo(() => (menu.data?.food ?? []).filter((f) => cat === 'all' || f.category === cat), [menu.data, cat]);
  const cartLines = Object.entries(cart).filter(([, q]) => q > 0);
  const cartCount = cartLines.reduce((s, [, q]) => s + q, 0);
  const cartTotal = cartLines.reduce((s, [id, q]) => s + (menu.data?.food.find((f) => f.id === id)?.price ?? 0) * q, 0);
  const myOrders = activeOrders(orders.data?.orders);

  const change = (id: string, d: number) => { tap(); setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(20, (c[id] ?? 0) + d)) })); };

  const after = async (msg: string) => {
    key.current = idemKey('order');
    showToast(msg);
    await Promise.all([refreshMe(), orders.refresh()]);
  };

  const placeFood = async () => {
    setBusy(true);
    try {
      await api.post('/api/order/create', {
        items: cartLines.map(([menuItemId, quantity]) => ({ menuItemId, quantity })),
        idempotencyKey: key.current, source: 'mobile',
      });
      setCart({});
      await after(t('orderPlaced', { place: place ?? t('counter') }));
    } catch (e) { key.current = idemKey('order'); showToast(errText(e), 'error'); }
    finally { setBusy(false); }
  };

  const placeHookah = async (type: 'hookah' | 'tobacco') => {
    setBusy(true);
    try {
      await api.post('/api/app/hookah/order', type === 'hookah'
        ? { type, flavorId: flavor, iceInWater: ice, idempotencyKey: key.current }
        : { type, cigaretteId: tobacco, idempotencyKey: key.current });
      setFlavor(null); setIce(null); setTobacco(null);
      await after(t('orderPlaced', { place: place ?? t('counter') }));
    } catch (e) { key.current = idemKey('order'); showToast(errText(e), 'error'); }
    finally { setBusy(false); }
  };

  if (!me) return null;
  const selectedFlavor = menu.data?.hookah.flavors.find((f) => f.id === flavor);
  const selectedTobacco = menu.data?.hookah.tobacco.find((c) => c.id === tobacco);

  return (
    <View style={{ flex: 1 }}>
      <Screen tabs onRefresh={() => Promise.all([menu.refresh(), orders.refresh()])}>
        <Row between>
          <Txt v="h1">{t('order')}</Txt>
          <Pill tone="em" icon="pin" label={t('deliverTo', { place: place ?? t('counter') })} />
        </Row>
        {myOrders.length ? <View style={{ marginTop: 14 }}><OrderTracker orders={myOrders} /></View> : null}
        <View style={{ marginTop: 14 }}>
          <Segmented<Tab> value={tab} onChange={setTab} options={[
            { value: 'food', label: t('food') }, { value: 'hookah', label: t('hookah') }, { value: 'tobacco', label: t('tobacco') },
          ]} />
        </View>

        {menu.loading && !menu.data ? <Loading /> : null}
        {menu.error && !menu.data ? <View style={{ marginTop: 14 }}><ErrorState text={`${errText(menu.error)}${menu.error instanceof ApiError ? ` (${menu.error.code}${menu.error.status ? ` · ${menu.error.status}` : ''})` : ''}`} onRetry={menu.refresh} /></View> : null}

        {menu.data && !menu.error && !menu.data.food?.length && !menu.data.hookah?.flavors?.length ? (
          <View style={{ marginTop: 14 }}><ErrorState text={errText(new Error('empty'))} onRetry={menu.refresh} /></View>
        ) : null}

        {tab === 'food' && menu.data ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
              {(['all', 'drinks', 'snacks', 'food'] as Cat[]).map((c) => (
                <Pressable key={c} onPress={() => { tap(); setCat(c); }}>
                  <Pill tone={cat === c ? 'em' : 'default'} label={t(c === 'all' ? 'all' : c === 'food' ? 'meals' : c)} />
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.grid}>
              {food.map((item) => <FoodCard key={item.id} item={item} qty={cart[item.id] ?? 0} onAdd={() => change(item.id, 1)} onRemove={() => change(item.id, -1)} />)}
            </View>
            {cartCount ? <View style={{ height: 70 }} /> : null}
          </>
        ) : null}

        {tab === 'hookah' && menu.data ? (
          <>
            <SectionHeader title={t('chooseFlavor')} />
            <View style={styles.grid}>
              {(menu.data.hookah?.flavors ?? []).map((f) => {
                const on = f.id === flavor;
                return (
                  <Pressable key={f.id} onPress={() => { tap(); setFlavor(f.id); }} style={[styles.flavor, on && { borderColor: f.color, backgroundColor: `${f.color}22` }]}>
                    <Txt v="h1" center style={{ fontSize: 30, lineHeight: 36 }}>{f.icon}</Txt>
                    <Txt v="h3" center numberOfLines={1}>{f.name}</Txt>
                    <Txt v="tiny" center>{`${num(f.price, lang)} ${t('tok')}`}</Txt>
                    {f.popular ? <View style={styles.popular}><Icon name="fire" size={12} color={colors.amber} /></View> : null}
                  </Pressable>
                );
              })}
            </View>
            {flavor ? (
              <>
                <SectionHeader title={t('iceQ')} />
                <Row gap={10}>
                  <Choice label={t('withIce')} icon="❄️" on={ice === true} onPress={() => setIce(true)} />
                  <Choice label={t('noIce')} icon="💧" on={ice === false} onPress={() => setIce(false)} />
                </Row>
                <Button
                  style={{ marginTop: 16 }} loading={busy} disabled={ice === null || (selectedFlavor?.price ?? 0) > me.wallets.pc}
                  title={t('orderHookah', { price: `${num(selectedFlavor?.price ?? 0, lang)} ${t('tok')}` })}
                  onPress={() => placeHookah('hookah')}
                />
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'tobacco' && menu.data ? (
          <View style={{ gap: 10, marginTop: 14 }}>
            {(menu.data.hookah?.tobacco ?? []).map((c) => {
              const on = c.id === tobacco;
              return (
                <Glass key={c.id} onPress={() => setTobacco(c.id)} style={[{ paddingVertical: 14 }, on && { borderColor: c.color, backgroundColor: `${c.color}1F` }]}>
                  <Row between>
                    <Row>
                      <View style={[styles.swatch, { backgroundColor: c.color }]} />
                      <View>
                        <Txt v="h3">{c.name}</Txt>
                        {c.badge ? <Txt v="tiny">{c.badge}</Txt> : null}
                      </View>
                    </Row>
                    <Txt v="h3">{`${num(c.price, lang)} ${t('tok')}`}</Txt>
                  </Row>
                </Glass>
              );
            })}
            <Button
              style={{ marginTop: 6 }} loading={busy} disabled={!tobacco || (selectedTobacco?.price ?? 0) > me.wallets.pc}
              title={t('orderTobacco', { price: `${num(selectedTobacco?.price ?? 0, lang)} ${t('tok')}` })}
              onPress={() => placeHookah('tobacco')}
            />
          </View>
        ) : null}
      </Screen>

      {tab === 'food' && cartCount > 0 ? (
        <Pressable onPress={placeFood} disabled={busy || cartTotal > me.wallets.pc} style={[styles.cartWrap, { bottom: TAB_BAR_SPACE + insets.bottom - 34 }]}>
          <LinearGradient colors={gradients.em} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.cart, (busy || cartTotal > me.wallets.pc) && { opacity: 0.6 }]}>
            <Txt v="h3" color={colors.emInk}>{t('itemsTotal', { n: num(cartCount, lang), total: num(cartTotal, lang) })}</Txt>
            <View style={styles.cartGo}>
              <Txt v="h3" color={colors.em}>{busy ? '…' : t('placeOrder')}</Txt>
            </View>
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}

function FoodCard({ item, qty, onAdd, onRemove }: { item: FoodItem; qty: number; onAdd: () => void; onRemove: () => void }) {
  const { t, lang } = useSession();
  const name = lang === 'ar' && item.nameAr ? item.nameAr : item.name;
  return (
    <View style={[styles.fcard, item.outOfStock && { opacity: 0.45 }]}>
      <View style={styles.photo}>
        {item.image ? <Image source={assetUrl(item.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        <View style={styles.photoBadge}>
          <Txt v="tiny" color={item.outOfStock ? colors.red : colors.text} style={{ fontSize: 10.5 }}>
            {item.outOfStock ? t('outOfStock') : `${num(item.prepMinutes, lang)} ${t('min')}`}
          </Txt>
        </View>
      </View>
      <View style={{ padding: 10 }}>
        <Txt v="h3" numberOfLines={1}>{name}</Txt>
        <Row between style={{ marginTop: 8 }}>
          <Txt v="h3">{num(item.price, lang)} <Txt v="tiny">{t('tok')}</Txt></Txt>
          {qty > 0 ? (
            <Row gap={6}>
              <Pressable onPress={onRemove} style={styles.qtyBtn}><Icon name="minus" size={14} color={colors.em} stroke={2.4} /></Pressable>
              <Txt v="h3" style={{ minWidth: 14 }} center>{num(qty, lang)}</Txt>
              <Pressable onPress={onAdd} style={styles.qtyBtn}><Icon name="plus" size={14} color={colors.em} stroke={2.4} /></Pressable>
            </Row>
          ) : (
            <Pressable disabled={item.outOfStock} onPress={onAdd} style={styles.qtyBtn}><Icon name="plus" size={15} color={colors.em} stroke={2.4} /></Pressable>
          )}
        </Row>
      </View>
    </View>
  );
}

function Choice({ label, icon, on, onPress }: { label: string; icon: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={[styles.choice, on && { borderColor: colors.em, backgroundColor: colors.emSoft }]}>
      <Txt v="h2" center>{icon}</Txt>
      <Txt v="h3" center color={on ? colors.em : colors.text}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  fcard: { width: '48.3%', borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  photo: { height: 104, backgroundColor: colors.bg2 },
  photoBadge: { position: 'absolute', left: 8, top: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(4,9,10,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  qtyBtn: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.emSoft, borderWidth: 1, borderColor: colors.emLine },
  flavor: { width: '31.5%', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingVertical: 12, paddingHorizontal: 6, gap: 2 },
  popular: { position: 'absolute', top: 6, right: 6 },
  choice: { flex: 1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingVertical: 14, gap: 4 },
  swatch: { width: 34, height: 34, borderRadius: 10 },
  cartWrap: { position: 'absolute', left: 16, right: 16 },
  cart: { height: 60, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8 },
  cartGo: { height: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: 'rgba(3,32,19,0.92)', justifyContent: 'center' },
});

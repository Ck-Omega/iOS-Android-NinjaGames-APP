// Mobile admin shell. Data: one cached overview route (PCs + pending requests).
// Requests feel instant: a free "pending version" counter is polled every 4 s and the
// overview is refetched only when it changes; PCs refresh every 30 s. No Firestore listeners.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSession } from '../lib/session';
import { adminApi, type Overview } from '../lib/admin';
import { Button, Row, Screen, Segmented, Txt } from '../ui/primitives';
import { colors } from '../ui/theme';
import { PcsTab } from '../admin/pcs';
import { StationsTab } from '../admin/stations';
import { PlayersTab } from '../admin/players';
import { RequestsTab } from '../admin/requests';

type Tab = 'pcs' | 'ps' | 'players' | 'requests';
const PC_POLL_MS = 30_000;
const VER_POLL_MS = 4_000;

export default function AdminHome() {
  const { signOut, showToast, errText } = useSession();
  const [tab, setTab] = useState<Tab>('pcs');
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const ver = useRef(0);
  const pendingCount = useRef(-1);

  const load = useCallback(async (fresh = false) => {
    try {
      const d = await adminApi.overview(fresh);
      const n = d.topups.length + d.guests.length + d.registrations.length;
      if (pendingCount.current >= 0 && n > pendingCount.current) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        showToast(`New request · ${n} pending`, 'info');
      }
      pendingCount.current = n;
      if (d.pendingVer) ver.current = d.pendingVer;
      setData(d); setErr('');
    } catch (e) { setErr(errText(e)); }
  }, [errText, showToast]);

  useEffect(() => {
    void load();
    const pcs = setInterval(() => { if (AppState.currentState === 'active') void load(); }, PC_POLL_MS);
    const v = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const { v: nv } = await adminApi.pendingVersion();
        if (nv && nv !== ver.current) { ver.current = nv; await load(); }
      } catch { /* offline: next tick */ }
    }, VER_POLL_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void load(); });
    return () => { clearInterval(pcs); clearInterval(v); sub.remove(); };
  }, [load]);

  const run = useCallback(async (key: string, fn: () => Promise<unknown>, okText: string, refresh = true) => {
    setBusy(key);
    try { await fn(); showToast(okText, 'ok'); if (refresh) await load(true); }
    catch (e) { showToast(e instanceof Error && !(e as any).code ? e.message : errText(e), 'error'); }
    finally { setBusy(null); }
  }, [showToast, errText, load]);

  const pending = (data?.topups.length ?? 0) + (data?.guests.length ?? 0) + (data?.registrations.length ?? 0);

  return (
    <Screen onRefresh={() => load(true)}>
      <Row between>
        <View>
          <Txt v="eyebrow">NINJA GAMES</Txt>
          <Txt v="h1">Admin</Txt>
        </View>
        <Button small kind="ghost" title="Sign out" icon="logout" onPress={() => void signOut()} />
      </Row>
      <View style={{ marginTop: 12 }}>
        <Segmented<Tab> value={tab} onChange={setTab} options={[
          { value: 'pcs', label: 'PCs' },
          { value: 'ps', label: 'TV/PS5' },
          { value: 'players', label: 'Players' },
          { value: 'requests', label: pending ? `Requests ${pending}` : 'Requests' },
        ]} />
      </View>
      {err ? <Txt v="small" color={colors.red} style={{ marginTop: 10 }}>{err}</Txt> : null}
      <View style={{ marginTop: 14, gap: 10 }}>
        {tab === 'pcs' ? <PcsTab pcs={data?.pcs ?? null} busy={busy} run={run} /> : null}
        {tab === 'ps' ? <StationsTab busy={busy} run={run} /> : null}
        {tab === 'players' ? <PlayersTab busy={busy} run={run} /> : null}
        {tab === 'requests' ? <RequestsTab data={data} busy={busy} run={run} /> : null}
      </View>
    </Screen>
  );
}

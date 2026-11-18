// Mobile admin shell. Data: one cached overview route (PCs + pending requests).
// Requests feel instant: a free "pending version" counter is polled every 4 s and the
// overview is refetched only when it changes; PCs refresh every 30 s. No Firestore listeners.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSession } from '../lib/session';
import { adminApi, type Overview, type PsAlert } from '../lib/admin';
import { playAlarm } from '../lib/alarm';
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
  const seenAlerts = useRef<Set<string> | null>(null);
  const [alarms, setAlarms] = useState<PsAlert[]>([]);
  const [, setTick] = useState(0);

  const load = useCallback(async (fresh = false) => {
    try {
      const d = await adminApi.overview(fresh);
      const n = d.topups.length + d.guests.length + d.registrations.length;
      if (pendingCount.current >= 0 && n > pendingCount.current) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        showToast(`New request · ${n} pending`, 'info');
      }
      pendingCount.current = n;
      // PS5 session alarms (5-min warning / ended): ring + popup that stays until closed.
      const list = d.psAlerts ?? [];
      if (!seenAlerts.current) seenAlerts.current = new Set(list.map((a) => a.id)); // don't replay on open
      const newAlerts = list.filter((a) => !seenAlerts.current!.has(a.id));
      if (newAlerts.length) {
        newAlerts.forEach((a) => seenAlerts.current!.add(a.id));
        setAlarms((o) => [...o, ...newAlerts]);
        void playAlarm(5);
      }
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

  useEffect(() => {
    if (!alarms.length) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    const ring = setInterval(() => void playAlarm(2), 20_000); // keep ringing until acknowledged
    return () => { clearInterval(t); clearInterval(ring); };
  }, [alarms.length]);

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
      <Modal visible={alarms.length > 0} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20, gap: 12 }}>
          {alarms.map((a) => {
            const warn = a.kind === 'warning';
            const left = Math.max(0, Math.round((a.endsAt - Date.now()) / 1000));
            return (
              <View key={a.id} style={{ backgroundColor: '#10151d', borderRadius: 16, padding: 18, borderWidth: 2, borderColor: warn ? colors.amber : colors.red }}>
                <Txt v="eyebrow" color={warn ? colors.amber : colors.red}>{warn ? '⏰ 5-MINUTE WARNING' : '⛔ SESSION ENDED'}</Txt>
                <Txt v="h2" style={{ marginTop: 4 }}>{a.stationName}</Txt>
                <Txt v="body" style={{ marginTop: 4 }}>Player: {a.playerName || '—'}</Txt>
                <Txt v="body">{warn ? (left > 0 ? `Time left ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Time is up') : `Ended ${new Date(a.endsAt).toLocaleTimeString()}`}</Txt>
                <Button title="Close" style={{ marginTop: 12 }} onPress={() => setAlarms((o) => o.filter((x) => x.id !== a.id))} />
              </View>
            );
          })}
        </View>
      </Modal>
    </Screen>
  );
}

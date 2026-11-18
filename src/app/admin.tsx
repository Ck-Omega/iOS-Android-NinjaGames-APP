// Mobile admin — a small subset of the WPF admin for staff on the floor.
// Cloud data comes from one cached overview route polled every 30 s while the app is
// in the foreground (no Firestore listeners). TV/PS5 control talks to TVSession on the LAN.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../lib/session';
import { adminApi, ctl, getControllerUrl, setControllerUrl, type AdminPc, type AdminPlayer, type CtlTv, type Overview } from '../lib/admin';
import { Button, Empty, Field, Glass, Pill, Row, Screen, Segmented, Sheet, Txt } from '../ui/primitives';
import { colors } from '../ui/theme';

type Tab = 'pcs' | 'ps' | 'players' | 'requests';
const POLL_MS = 30_000;

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.max(0, Math.round(m))}m`);
const ago = (ms: number) => { const s = Math.round((Date.now() - ms) / 1000); return s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${Math.round(s / 3600)}h`; };

function confirm(title: string, body: string): Promise<boolean> {
  return new Promise((resolve) => Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: 'OK', onPress: () => resolve(true) },
  ]));
}

export default function AdminHome() {
  const { signOut, showToast, errText } = useSession();
  const [tab, setTab] = useState<Tab>('pcs');
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (fresh = false) => {
    try { setData(await adminApi.overview(fresh)); setErr(''); } catch (e) { setErr(errText(e)); }
  }, [errText]);

  useEffect(() => {
    void load();
    const id = setInterval(() => { if (AppState.currentState === 'active') void load(); }, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void load(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [load]);

  /** Run an action, toast the result, then refresh the overview past the cache. */
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
        <Txt v="h1">Admin</Txt>
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

type RunFn = (key: string, fn: () => Promise<unknown>, okText: string, refresh?: boolean) => Promise<void>;

// ─── PCs ────────────────────────────────────────────────────────────────
function PcsTab({ pcs, busy, run }: { pcs: AdminPc[] | null; busy: string | null; run: RunFn }) {
  const [addFor, setAddFor] = useState<AdminPc | null>(null);
  const [minutes, setMinutes] = useState('60');
  if (!pcs) return <Txt v="small">Loading…</Txt>;
  if (!pcs.length) return <Empty text="No PCs registered." />;
  return (
    <>
      {pcs.map((pc) => {
        const tone = !pc.online ? 'red' : pc.inUse ? 'amber' : 'em';
        return (
          <Glass key={pc.id}>
            <Row between>
              <Txt v="h3">{pc.name}</Txt>
              <Row gap={6}>
                {pc.locked ? <Pill icon="lock" label="Locked" tone="red" /> : null}
                <Pill tone={tone} live={pc.online} label={!pc.online ? `Offline ${pc.lastSeen ? ago(pc.lastSeen) : ''}` : pc.inUse ? (pc.guest ? 'Guest' : 'In use') : 'Free'} />
              </Row>
            </Row>
            {pc.inUse ? <Txt v="small" style={{ marginTop: 4 }}>{pc.playerName || pc.playerId || 'Player'}{pc.timeRemaining ? ` · ${fmtMin(pc.timeRemaining)} left` : ''}</Txt> : null}
            <Row gap={8} style={{ marginTop: 10, flexWrap: 'wrap' }}>
              <Button small kind="ghost" title={pc.locked ? 'Unlock' : 'Lock'} icon="lock" loading={busy === `lock-${pc.id}`}
                onPress={() => void run(`lock-${pc.id}`, () => adminApi.pcCommand(pc.id, pc.locked ? 'unlock' : 'lock'), `${pc.name}: ${pc.locked ? 'unlock' : 'lock'} sent`)} />
              {pc.inUse ? <Button small kind="danger" title="End session" loading={busy === `end-${pc.id}`}
                onPress={async () => { if (await confirm('End session', `Log the player out of ${pc.name}?`)) void run(`end-${pc.id}`, () => adminApi.pcCommand(pc.id, 'force-logout'), `${pc.name}: session ended`); }} /> : null}
              {pc.inUse && pc.playerId && !pc.guest ? <Button small kind="blue" title="Add time" icon="clock" onPress={() => setAddFor(pc)} /> : null}
            </Row>
          </Glass>
        );
      })}
      <Sheet visible={!!addFor} onClose={() => setAddFor(null)}>
        <Txt v="h2">Add time · {addFor?.playerName || addFor?.playerId}</Txt>
        <Row gap={8} style={{ marginTop: 12 }}>
          {['30', '60', '120'].map((m) => <Button key={m} small kind={minutes === m ? 'primary' : 'ghost'} title={`${m}m`} onPress={() => setMinutes(m)} style={{ flex: 1 }} />)}
        </Row>
        <View style={{ marginTop: 10 }}><Field icon="clock" keyboardType="number-pad" value={minutes} onChangeText={(v) => setMinutes(v.replace(/\D/g, ''))} placeholder="Minutes" /></View>
        <Button style={{ marginTop: 12 }} title="Add" loading={busy === 'addtime'} onPress={() => {
          const pc = addFor; const m = Number(minutes); if (!pc?.playerId || !(m > 0)) return;
          void run('addtime', () => adminApi.playerAction(pc.playerId!, 'add-time', m), `+${m} min for ${pc.playerName || pc.playerId}`).then(() => setAddFor(null));
        }} />
      </Sheet>
    </>
  );
}

// ─── TV / PS5 (LAN, TVSession.exe) ──────────────────────────────────────
function StationsTab({ busy, run }: { busy: string | null; run: RunFn }) {
  const [base, setBase] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [tvs, setTvs] = useState<CtlTv[] | null>(null);
  const [err, setErr] = useState('');
  const [sessionFor, setSessionFor] = useState<CtlTv | null>(null);
  const [user, setUser] = useState('Guest');
  const [minutes, setMinutes] = useState('60');
  const baseRef = useRef('');

  const refresh = useCallback(async () => {
    try { const s = await ctl<{ tvs?: CtlTv[] }>(baseRef.current, 'GET', '/api/state'); setTvs(s.tvs ?? []); setErr(''); }
    catch (e) { setErr(e instanceof Error ? e.message : 'TVSession error'); }
  }, []);

  useEffect(() => { void getControllerUrl().then((u) => { baseRef.current = u; setBase(u); setDraft(u); if (u) void refresh(); }); }, [refresh]);
  useEffect(() => {
    if (!base) return;
    const id = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 15_000);
    return () => clearInterval(id);
  }, [base, refresh]);

  const act = (key: string, fn: () => Promise<unknown>, text: string) => run(key, fn, text, false).then(refresh);
  const post = (path: string, body: unknown) => ctl(baseRef.current, 'POST', path, body);

  return (
    <>
      <Glass>
        <Txt v="small">TVSession address (admin PC on shop Wi-Fi)</Txt>
        <Row gap={8} style={{ marginTop: 8 }}>
          <View style={{ flex: 1 }}><Field placeholder="192.168.1.10:8765" value={draft} onChangeText={setDraft} autoCapitalize="none" autoCorrect={false} /></View>
          <Button small title="Save" onPress={async () => { await setControllerUrl(draft); const u = await getControllerUrl(); baseRef.current = u; setBase(u); void refresh(); }} />
        </Row>
      </Glass>
      {err ? <Txt v="small" color={colors.red}>{err}</Txt> : null}
      {tvs && !tvs.length ? <Empty text="No TVs configured in TVSession." /> : null}
      {(tvs ?? []).map((tv) => (
        <Glass key={tv.id}>
          <Row between>
            <Txt v="h3">{tv.label}</Txt>
            <Pill tone={tv.session ? 'amber' : tv.paired ? 'em' : 'red'} label={tv.session ? `${tv.session.user} · ${fmtMin(tv.session.remaining / 60)}` : tv.paired ? (tv.status || 'Idle') : 'Not paired'} />
          </Row>
          {tv.ps5?.state ? <Txt v="small" style={{ marginTop: 4 }}>PS5: {tv.ps5.state}</Txt> : null}
          <Row gap={8} style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <Button small kind="ghost" title="TV on" loading={busy === `tvon-${tv.id}`} onPress={() => void act(`tvon-${tv.id}`, () => post('/api/tv/power', { tv_id: tv.id, action: 'on' }), `${tv.label}: TV on`)} />
            <Button small kind="ghost" title="TV off" loading={busy === `tvoff-${tv.id}`} onPress={() => void act(`tvoff-${tv.id}`, () => post('/api/tv/power', { tv_id: tv.id, action: 'off' }), `${tv.label}: TV off`)} />
            <Button small kind="ghost" title="PS5 wake" loading={busy === `pson-${tv.id}`} onPress={() => void act(`pson-${tv.id}`, () => post('/api/ps5/power', { tv_id: tv.id, action: 'on' }), `${tv.label}: PS5 waking`)} />
            <Button small kind="ghost" title="PS5 rest" loading={busy === `psoff-${tv.id}`} onPress={() => void act(`psoff-${tv.id}`, () => post('/api/ps5/power', { tv_id: tv.id, action: 'off' }), `${tv.label}: PS5 resting`)} />
          </Row>
          <Row gap={8} style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <Button small kind="blue" title="Both on" loading={busy === `bon-${tv.id}`} onPress={() => void act(`bon-${tv.id}`, async () => {
              await post('/api/ps5/power', { tv_id: tv.id, action: 'on' }); await post('/api/tv/power', { tv_id: tv.id, action: 'on' });
            }, `${tv.label}: TV + PS5 on`)} />
            <Button small kind="ghost" title="TV off + PS5 rest" loading={busy === `boff-${tv.id}`} onPress={() => void act(`boff-${tv.id}`, async () => {
              await post('/api/ps5/power', { tv_id: tv.id, action: 'off' }); await post('/api/tv/power', { tv_id: tv.id, action: 'off' });
            }, `${tv.label}: TV off, PS5 resting`)} />
          </Row>
          <Row gap={8} style={{ marginTop: 8 }}>
            {tv.session
              ? <Button small kind="danger" title="End session" loading={busy === `send-${tv.id}`} onPress={async () => {
                if (await confirm('End session', `End ${tv.session?.user}'s session on ${tv.label}?`)) void act(`send-${tv.id}`, () => post('/api/session/end', { tv_id: tv.id }), `${tv.label}: session ended`);
              }} />
              : <Button small title="Start timed session" icon="play" onPress={() => setSessionFor(tv)} />}
            <Button small kind="blue" title="Remote play" icon="gamepad" onPress={() => router.push({ pathname: '/ps-remote' as any, params: { tv: tv.id, label: tv.label } })} />
          </Row>
        </Glass>
      ))}
      <Sheet visible={!!sessionFor} onClose={() => setSessionFor(null)}>
        <Txt v="h2">Start session · {sessionFor?.label}</Txt>
        <View style={{ marginTop: 12, gap: 10 }}>
          <Field icon="user" placeholder="Player name" value={user} onChangeText={setUser} />
          <Row gap={8}>
            {['30', '60', '120', '180'].map((m) => <Button key={m} small kind={minutes === m ? 'primary' : 'ghost'} title={`${m}m`} onPress={() => setMinutes(m)} style={{ flex: 1 }} />)}
          </Row>
          <Button title="Start now" loading={busy === 'pstart'} onPress={() => {
            const tv = sessionFor; const m = Number(minutes); if (!tv || !(m > 0)) return;
            void act('pstart', () => post('/api/session/new-code', { tv_id: tv.id, user: user.trim() || 'Guest', minutes: m, start_now: true }), `${tv.label}: ${m} min started`).then(() => setSessionFor(null));
          }} />
        </View>
      </Sheet>
    </>
  );
}

// ─── Players ────────────────────────────────────────────────────────────
function PlayersTab({ busy, run }: { busy: string | null; run: RunFn }) {
  const { errText } = useSession();
  const [q, setQ] = useState('');
  const [list, setList] = useState<AdminPlayer[] | null>(null);
  const [sel, setSel] = useState<AdminPlayer | null>(null);
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const [reg, setReg] = useState(false);
  const [form, setForm] = useState({ username: '', pin: '', phone: '', firstName: '', lastName: '' });

  const search = async () => {
    setErr('');
    try { setList((await adminApi.searchPlayers(q.trim().toLowerCase())).players); } catch (e) { setErr(errText(e)); }
  };
  const reload = async (id: string) => { try { setSel((await adminApi.player(id)).player); } catch { /* keep */ } };
  const topup = (action: 'add-coins' | 'add-time') => {
    const p = sel; const n = Number(amount); if (!p || !(n > 0)) return;
    void run(`${action}`, () => adminApi.playerAction(p.id, action, n), action === 'add-coins' ? `+${n} coins → ${p.username}` : `+${n} min → ${p.username}`, false)
      .then(() => { setAmount(''); void reload(p.id); });
  };

  return (
    <>
      <Row gap={8}>
        <View style={{ flex: 1 }}><Field icon="user" placeholder="Search username" value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} onSubmitEditing={search} returnKeyType="search" /></View>
        <Button small title="Search" onPress={search} />
      </Row>
      <Button small kind="ghost" icon="plus" title="Register new player" onPress={() => setReg(true)} />
      {err ? <Txt v="small" color={colors.red}>{err}</Txt> : null}
      {list && !list.length ? <Empty text="No players found." /> : null}
      {(list ?? []).map((p) => (
        <Glass key={p.id} onPress={() => { setSel(p); setAmount(''); }}>
          <Row between>
            <Txt v="h3">{p.username}</Txt>
            {p.banned ? <Pill tone="red" label="Banned" /> : p.vip ? <Pill tone="amber" icon="crown" label="VIP" /> : null}
          </Row>
          <Txt v="small" style={{ marginTop: 4 }}>{p.coins} coins · {fmtMin(p.remainingPlaytime)} · PS {p.psCoins}</Txt>
        </Glass>
      ))}

      <Sheet visible={!!sel} onClose={() => setSel(null)}>
        {sel ? (
          <View style={{ gap: 8 }}>
            <Txt v="h2">{sel.username}</Txt>
            <Txt v="small">{[sel.firstName, sel.lastName].filter(Boolean).join(' ') || '—'} · {sel.phone || 'no phone'}</Txt>
            <Txt v="body">{sel.coins} coins · {fmtMin(sel.remainingPlaytime)} play time · {sel.psCoins} PS tokens</Txt>
            <Txt v="tiny">Last login {sel.lastLogin ? ago(sel.lastLogin) + ' ago' : 'never'}</Txt>
            <Field icon="plus" keyboardType="number-pad" placeholder="Amount (coins or minutes)" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} />
            <Row gap={8}>
              <Button small style={{ flex: 1 }} title="Add coins" loading={busy === 'add-coins'} onPress={() => topup('add-coins')} />
              <Button small kind="blue" style={{ flex: 1 }} title="Add minutes" loading={busy === 'add-time'} onPress={() => topup('add-time')} />
            </Row>
          </View>
        ) : null}
      </Sheet>

      <Sheet visible={reg} onClose={() => setReg(false)}>
        <Txt v="h2">Register player</Txt>
        <View style={{ gap: 8, marginTop: 10 }}>
          <Field icon="user" placeholder="Username (a-z, 0-9, _)" autoCapitalize="none" value={form.username} onChangeText={(v) => setForm({ ...form, username: v.toLowerCase() })} />
          <Row gap={8}>
            <View style={{ flex: 1 }}><Field placeholder="First name" value={form.firstName} onChangeText={(v) => setForm({ ...form, firstName: v })} /></View>
            <View style={{ flex: 1 }}><Field placeholder="Last name" value={form.lastName} onChangeText={(v) => setForm({ ...form, lastName: v })} /></View>
          </Row>
          <Field placeholder="Phone (+962…)" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
          <Field icon="key" placeholder="6-digit PIN" keyboardType="number-pad" secureTextEntry value={form.pin} onChangeText={(v) => setForm({ ...form, pin: v.replace(/\D/g, '').slice(0, 6) })} />
          <Button title="Create account" loading={busy === 'register'} onPress={() => void run('register', () => adminApi.registerPlayer({ ...form, username: form.username.trim() }), `Registered ${form.username}`, false).then(() => {
            setQ(form.username); setReg(false); setForm({ username: '', pin: '', phone: '', firstName: '', lastName: '' });
          })} />
        </View>
      </Sheet>
    </>
  );
}

// ─── Requests (top-ups, guest play, guest registration) ──────────────────
function RequestsTab({ data, busy, run }: { data: Overview | null; busy: string | null; run: RunFn }) {
  const [guestMin, setGuestMin] = useState(30);
  if (!data) return <Txt v="small">Loading…</Txt>;
  const none = !data.topups.length && !data.guests.length && !data.registrations.length;
  return (
    <>
      {none ? <Empty text="No pending requests." /> : null}
      {data.topups.length ? <Txt v="eyebrow">TOP-UPS</Txt> : null}
      {data.topups.map((r) => (
        <Glass key={r.id} tone="amber">
          <Row between><Txt v="h3">{r.playerName || r.playerId}</Txt><Txt v="tiny">{ago(r.createdAt)}</Txt></Row>
          <Txt v="small" style={{ marginTop: 4 }}>{r.coins} coins{r.price ? ` · ${r.price} JOD` : ''}</Txt>
          <Row gap={8} style={{ marginTop: 10 }}>
            <Button small style={{ flex: 1 }} title="Approve" loading={busy === `ta-${r.id}`} onPress={() => void run(`ta-${r.id}`, () => adminApi.resolveTopup(r.id, 'approve'), 'Top-up approved')} />
            <Button small kind="danger" style={{ flex: 1 }} title="Reject" loading={busy === `tr-${r.id}`} onPress={() => void run(`tr-${r.id}`, () => adminApi.resolveTopup(r.id, 'reject'), 'Top-up rejected')} />
          </Row>
        </Glass>
      ))}
      {data.guests.length ? (
        <Row between><Txt v="eyebrow">GUEST PLAY</Txt>
          <Row gap={6}>{[15, 30, 60, 120].map((m) => <Button key={m} small kind={guestMin === m ? 'primary' : 'ghost'} title={`${m}m`} onPress={() => setGuestMin(m)} />)}</Row>
        </Row>
      ) : null}
      {data.guests.map((r) => (
        <Glass key={r.id} tone="blue">
          <Row between><Txt v="h3">Guest · {r.pcName || r.pcId || 'PC'}</Txt><Txt v="tiny">{ago(r.createdAt)}</Txt></Row>
          <Row gap={8} style={{ marginTop: 10 }}>
            <Button small style={{ flex: 1 }} title={`Approve ${guestMin}m`} loading={busy === `ga-${r.id}`} onPress={() => void run(`ga-${r.id}`, () => adminApi.resolveGuest(r.id, 'approve', guestMin), 'Guest approved')} />
            <Button small kind="danger" style={{ flex: 1 }} title="Reject" loading={busy === `gr-${r.id}`} onPress={() => void run(`gr-${r.id}`, () => adminApi.resolveGuest(r.id, 'reject'), 'Guest rejected')} />
          </Row>
        </Glass>
      ))}
      {data.registrations.length ? <Txt v="eyebrow">REGISTRATIONS</Txt> : null}
      {data.registrations.map((r) => (
        <Glass key={r.id}>
          <Row between><Txt v="h3">{r.username || 'New player'}</Txt><Txt v="tiny">{ago(r.createdAt)}</Txt></Row>
          <Txt v="small" style={{ marginTop: 4 }}>{[r.firstName, r.lastName].filter(Boolean).join(' ')}{r.phone ? ` · ${r.phone}` : ''}{r.pcName ? ` · ${r.pcName}` : ''}</Txt>
          <Row gap={8} style={{ marginTop: 10 }}>
            <Button small style={{ flex: 1 }} title="Approve (send code)" loading={busy === `ra-${r.id}`} onPress={() => void run(`ra-${r.id}`, async () => {
              const res = await adminApi.resolveRegistration(r.id, 'approve');
              if (res.code) Alert.alert('Approval code', `Code ${res.code} was sent to the kiosk (valid 15 min).`);
            }, 'Registration approved')} />
            <Button small kind="danger" style={{ flex: 1 }} title="Reject" loading={busy === `rr-${r.id}`} onPress={() => void run(`rr-${r.id}`, () => adminApi.resolveRegistration(r.id, 'reject'), 'Registration dismissed')} />
          </Row>
        </Glass>
      ))}
    </>
  );
}

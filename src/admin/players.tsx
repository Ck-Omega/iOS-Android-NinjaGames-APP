import React, { useState } from 'react';
import { View } from 'react-native';
import { useSession } from '../lib/session';
import { adminApi, type AdminPlayer } from '../lib/admin';
import { Button, Empty, Field, Glass, Pill, Row, Sheet, Txt } from '../ui/primitives';
import { colors } from '../ui/theme';
import { Action, Chips, Grid, ago, confirm, fmtMin, type RunFn } from './shared';
import { pinProblem, PIN_HINT } from './pin';

export function PlayersTab({ busy, run }: { busy: string | null; run: RunFn }) {
  const { errText } = useSession();
  const [q, setQ] = useState('');
  const [list, setList] = useState<AdminPlayer[] | null>(null);
  const [sel, setSel] = useState<AdminPlayer | null>(null);
  const [err, setErr] = useState('');
  const [reg, setReg] = useState(false);

  const search = async (term = q) => {
    setErr('');
    const t = term.trim().toLowerCase();
    if (t.length < 2) { setErr('Type at least 2 letters of the username.'); return; }
    try { setList((await adminApi.searchPlayers(t)).players); } catch (e) { setErr(errText(e)); }
  };
  const reload = async (id: string) => { try { const p = (await adminApi.player(id)).player; setSel(p); setList((l) => l?.map((x) => (x.id === id ? p : x)) ?? l); } catch { /* keep */ } };

  return (
    <>
      <Row gap={8}>
        <View style={{ flex: 1 }}><Field icon="user" placeholder="Search username" value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} onSubmitEditing={() => void search()} returnKeyType="search" /></View>
        <Button small title="Search" onPress={() => void search()} />
      </Row>
      <Button small kind="blue" icon="plus" title="Register new player" onPress={() => setReg(true)} />
      {err ? <Txt v="small" color={colors.red}>{err}</Txt> : null}
      {list && !list.length ? <Empty text="No players found." /> : null}
      {(list ?? []).map((p) => (
        <Glass key={p.id} onPress={() => setSel(p)}>
          <Row between>
            <Txt v="h3">{p.username}</Txt>
            {p.banned ? <Pill tone="red" label="Banned" /> : p.vip ? <Pill tone="amber" icon="crown" label="VIP" /> : null}
          </Row>
          <Txt v="small" style={{ marginTop: 4 }}>{p.coins} coins · {fmtMin(p.remainingPlaytime)} · PS {p.psCoins}</Txt>
        </Glass>
      ))}

      <Sheet visible={!!sel} onClose={() => setSel(null)}>
        {sel ? <PlayerPanel p={sel} busy={busy} run={run} reload={reload} /> : null}
      </Sheet>
      <Sheet visible={reg} onClose={() => setReg(false)}>
        <RegisterForm busy={busy} run={run} done={(u) => { setReg(false); setQ(u); void search(u); }} />
      </Sheet>
    </>
  );
}

function PlayerPanel({ p, busy, run, reload }: { p: AdminPlayer; busy: string | null; run: RunFn; reload: (id: string) => Promise<void> }) {
  const [mode, setMode] = useState<'coins' | 'time'>('coins');
  const [amount, setAmount] = useState('');
  const presets = mode === 'coins' ? [100, 250, 575, 1200] : [30, 60, 120, 180];
  const go = (sign: 1 | -1, n = Number(amount)) => {
    if (!(n > 0)) return;
    const action = mode === 'coins' ? (sign > 0 ? 'add-coins' : 'deduct-coins') : (sign > 0 ? 'add-time' : 'deduct-time');
    void run(action, () => adminApi.playerAction(p.id, action, n), `${sign > 0 ? '+' : '−'}${n} ${mode === 'coins' ? 'coins' : 'min'} → ${p.username}`, false)
      .then(() => { setAmount(''); void reload(p.id); });
  };
  return (
    <View style={{ gap: 10 }}>
      <Row between><Txt v="h2">{p.username}</Txt>{p.banned ? <Pill tone="red" label="Banned" /> : p.vip ? <Pill tone="amber" label="VIP" /> : null}</Row>
      <Txt v="small">{[p.firstName, p.lastName].filter(Boolean).join(' ') || '—'} · {p.phone || 'no phone'}</Txt>
      <Row gap={8}>
        <Glass style={{ flex: 1 }}><Txt v="tiny">COINS</Txt><Txt v="h2">{p.coins}</Txt></Glass>
        <Glass style={{ flex: 1 }}><Txt v="tiny">PC TIME</Txt><Txt v="h2">{fmtMin(p.remainingPlaytime)}</Txt></Glass>
        <Glass style={{ flex: 1 }}><Txt v="tiny">PS TOKENS</Txt><Txt v="h2">{p.psCoins}</Txt></Glass>
      </Row>
      <Txt v="tiny">Last login {ago(p.lastLogin)} · joined {ago(p.createdAt)}</Txt>

      <Chips value={mode} onChange={(m) => { setMode(m); setAmount(''); }} options={[{ v: 'coins', l: 'Coins' }, { v: 'time', l: 'PC time (min)' }]} />
      <Chips value={Number(amount) || 0} onChange={(v) => setAmount(String(v))} options={presets.map((n) => ({ v: n, l: mode === 'coins' ? `${n}` : n < 60 ? `${n}m` : `${n / 60}h` }))} />
      <Field keyboardType="number-pad" placeholder={mode === 'coins' ? 'Coins' : 'Minutes'} value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} />
      <Row gap={8}>
        <Button small style={{ flex: 1 }} title="Add" loading={busy === (mode === 'coins' ? 'add-coins' : 'add-time')} onPress={() => go(1)} />
        <Button small kind="danger" style={{ flex: 1 }} title="Deduct" loading={busy === (mode === 'coins' ? 'deduct-coins' : 'deduct-time')} onPress={async () => {
          if (await confirm('Deduct', `Remove ${amount} ${mode === 'coins' ? 'coins' : 'minutes'} from ${p.username}?`, 'Deduct', true)) go(-1);
        }} />
      </Row>
      <Grid>
        <Action label={p.banned ? 'Unban' : 'Ban'} tone={p.banned ? 'em' : 'red'} busy={busy === 'ban'} onPress={async () => {
          if (await confirm(p.banned ? 'Unban' : 'Ban', `${p.banned ? 'Unban' : 'Ban'} ${p.username}?`, p.banned ? 'Unban' : 'Ban', !p.banned)) {
            void run('ban', () => adminApi.banPlayer(p.id, !p.banned), `${p.username} ${p.banned ? 'unbanned' : 'banned'}`, false).then(() => reload(p.id));
          }
        }} />
        <Action label="Refresh" onPress={() => void reload(p.id)} />
      </Grid>
    </View>
  );
}

function RegisterForm({ busy, run, done }: { busy: string | null; run: RunFn; done: (username: string) => void }) {
  const [f, setF] = useState({ username: '', pin: '', phone: '', firstName: '', lastName: '' });
  const [err, setErr] = useState('');
  const submit = () => {
    const u = f.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { setErr('Username: 3–20 of a-z, 0-9, _'); return; }
    const pe = pinProblem(f.pin); if (pe) { setErr(pe); return; }
    if (f.phone.replace(/\D/g, '').length < 7) { setErr('Enter a valid phone number.'); return; }
    setErr('');
    void run('register', () => adminApi.registerPlayer({ ...f, username: u }), `Registered ${u} — they sign in with this password`, false).then(() => done(u));
  };
  return (
    <View style={{ gap: 8 }}>
      <Txt v="h2">Register player</Txt>
      <Field icon="user" placeholder="Username (a-z, 0-9, _)" autoCapitalize="none" value={f.username} onChangeText={(v) => setF({ ...f, username: v.toLowerCase() })} />
      <Row gap={8}>
        <View style={{ flex: 1 }}><Field placeholder="First name" value={f.firstName} onChangeText={(v) => setF({ ...f, firstName: v })} /></View>
        <View style={{ flex: 1 }}><Field placeholder="Last name" value={f.lastName} onChangeText={(v) => setF({ ...f, lastName: v })} /></View>
      </Row>
      <Field placeholder="Phone (07… or +962…)" keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
      <Field icon="key" placeholder="Password" autoCapitalize="none" autoCorrect={false} secureTextEntry value={f.pin} onChangeText={(v) => setF({ ...f, pin: v.slice(0, 64) })} />
      <Txt v="tiny">{PIN_HINT}</Txt>
      {err ? <Txt v="small" color={colors.red}>{err}</Txt> : null}
      <Button title="Create account" loading={busy === 'register'} onPress={submit} />
    </View>
  );
}

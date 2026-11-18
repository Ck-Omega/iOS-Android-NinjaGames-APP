// PC fleet — status, filters, per-PC control panel and bulk actions.
// Commands go through /api/pc/command (server allowlist), time through player-actions.
import React, { useState } from 'react';
import { View } from 'react-native';
import { adminApi, type AdminPc } from '../lib/admin';
import { Button, Empty, Field, Glass, Pill, Row, Sheet, Txt } from '../ui/primitives';
import { colors } from '../ui/theme';
import { Action, Chips, Grid, Stat, ago, confirm, fmtMin, type RunFn } from './shared';

type Filter = 'all' | 'inuse' | 'free' | 'offline' | 'locked';

const state = (pc: AdminPc) => (!pc.online ? 'offline' : pc.inUse ? 'inuse' : 'free');

export function PcsTab({ pcs, busy, run }: { pcs: AdminPc[] | null; busy: string | null; run: RunFn }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sel, setSel] = useState<string | null>(null);
  if (!pcs) return <Txt v="small">Loading…</Txt>;
  if (!pcs.length) return <Empty text="No PCs registered." />;

  const counts = {
    inuse: pcs.filter((p) => state(p) === 'inuse').length,
    free: pcs.filter((p) => state(p) === 'free').length,
    offline: pcs.filter((p) => state(p) === 'offline').length,
    locked: pcs.filter((p) => p.locked).length,
  };
  const shown = pcs.filter((p) => filter === 'all' || (filter === 'locked' ? p.locked : state(p) === filter));
  const current = pcs.find((p) => p.id === sel) ?? null;
  const online = pcs.filter((p) => p.online);

  const bulk = async (label: string, targets: AdminPc[], command: string, payload?: string) => {
    if (!targets.length) return;
    if (!(await confirm(label, `${label} on ${targets.length} PC${targets.length === 1 ? '' : 's'}?`))) return;
    void run(`bulk-${command}`, async () => {
      const bad: string[] = [];
      for (const pc of targets) { try { await adminApi.pcCommand(pc.id, command, payload); } catch { bad.push(pc.name); } }
      if (bad.length) throw new Error(`Failed on: ${bad.join(', ')}`);
    }, `${label}: sent to ${targets.length}`);
  };

  return (
    <>
      <Row gap={8}>
        <Stat label="In use" value={counts.inuse} tone={colors.amber} />
        <Stat label="Free" value={counts.free} tone={colors.em} />
        <Stat label="Offline" value={counts.offline} tone={colors.red} />
        <Stat label="Locked" value={counts.locked} />
      </Row>
      <Chips value={filter} onChange={setFilter} options={[
        { v: 'all', l: `All ${pcs.length}` }, { v: 'inuse', l: 'In use' }, { v: 'free', l: 'Free' }, { v: 'offline', l: 'Offline' }, { v: 'locked', l: 'Locked' },
      ]} />
      <Grid>
        <Action label="Lock free PCs" onPress={() => void bulk('Lock free PCs', pcs.filter((p) => state(p) === 'free' && !p.locked), 'lock')} busy={busy === 'bulk-lock'} />
        <Action label="Unlock all" onPress={() => void bulk('Unlock all', pcs.filter((p) => p.online && p.locked), 'unlock')} busy={busy === 'bulk-unlock'} />
        <Action label="Message all" tone="blue" onPress={() => setSel('__all__')} />
        <Action label="Restart all apps" tone="amber" onPress={() => void bulk('Restart kiosk app', online.filter((p) => !p.inUse), 'restart-app')} busy={busy === 'bulk-restart-app'} />
      </Grid>

      {shown.map((pc) => {
        const st = state(pc);
        return (
          <Glass key={pc.id} onPress={() => setSel(pc.id)} tone={st === 'inuse' ? 'amber' : 'default'}>
            <Row between>
              <View style={{ flex: 1 }}>
                <Txt v="h3">{pc.name}</Txt>
                <Txt v="tiny">{[pc.zone, pc.ip, pc.version && `v${pc.version}`].filter(Boolean).join(' · ') || pc.id}</Txt>
              </View>
              <Row gap={6}>
                {pc.locked ? <Pill icon="lock" tone="red" label="Locked" /> : null}
                <Pill tone={st === 'offline' ? 'red' : st === 'inuse' ? 'amber' : 'em'} live={pc.online}
                  label={st === 'offline' ? 'Offline' : st === 'inuse' ? (pc.guest ? 'Guest' : 'In use') : 'Free'} />
              </Row>
            </Row>
            {st === 'inuse' ? (
              <Row between style={{ marginTop: 6 }}>
                <Txt v="small">{pc.playerName || pc.playerId || 'Player'}</Txt>
                {pc.timeRemaining ? <Txt v="small" color={pc.timeRemaining < 10 ? colors.red : colors.amber}>{fmtMin(pc.timeRemaining)} left</Txt> : null}
              </Row>
            ) : st === 'offline' ? <Txt v="tiny" style={{ marginTop: 4 }}>Last seen {ago(pc.lastSeen)}</Txt> : null}
          </Glass>
        );
      })}

      <Sheet visible={!!sel} onClose={() => setSel(null)}>
        {sel === '__all__'
          ? <MessageAll pcs={online} busy={busy} run={run} done={() => setSel(null)} />
          : current ? <PcPanel pc={current} busy={busy} run={run} /> : null}
      </Sheet>
    </>
  );
}

function PcPanel({ pc, busy, run }: { pc: AdminPc; busy: string | null; run: RunFn }) {
  const [mins, setMins] = useState(60);
  const [custom, setCustom] = useState('');
  const [msg, setMsg] = useState('');
  const k = (s: string) => `${s}-${pc.id}`;
  const cmd = (key: string, command: string, text: string, payload?: string) => void run(k(key), () => adminApi.pcCommand(pc.id, command, payload), `${pc.name}: ${text}`);
  const danger = async (key: string, command: string, title: string, body: string, text: string) => {
    if (await confirm(title, body, title, true)) cmd(key, command, text);
  };

  return (
    <View style={{ gap: 12 }}>
      <View>
        <Row between><Txt v="h2">{pc.name}</Txt>
          <Pill tone={!pc.online ? 'red' : pc.inUse ? 'amber' : 'em'} label={!pc.online ? 'Offline' : pc.inUse ? 'In use' : 'Free'} />
        </Row>
        <Txt v="tiny">{[pc.ip, pc.version && `Kiosk v${pc.version}`, `seen ${ago(pc.lastSeen)}`].filter(Boolean).join(' · ')}</Txt>
      </View>

      {pc.inUse ? (
        <Glass tone="amber">
          <Txt v="eyebrow">SESSION</Txt>
          <Row between style={{ marginTop: 4 }}>
            <Txt v="h3">{pc.playerName || pc.playerId || 'Player'}{pc.guest ? ' (guest)' : ''}</Txt>
            <Txt v="h3" color={colors.amber}>{fmtMin(pc.timeRemaining)}</Txt>
          </Row>
          {pc.playerId && !pc.guest ? (
            <View style={{ gap: 8, marginTop: 10 }}>
              <Chips value={mins} onChange={(v) => { setMins(v); setCustom(''); }} options={[15, 30, 60, 120, 180].map((m) => ({ v: m, l: m < 60 ? `+${m}m` : `+${m / 60}h` }))} />
              <Row gap={8}>
                <View style={{ flex: 1 }}><Field placeholder="Custom min" keyboardType="number-pad" value={custom} onChangeText={(v) => setCustom(v.replace(/\D/g, ''))} /></View>
                <Button small title="Add time" loading={busy === k('time')} onPress={() => {
                  const m = Number(custom) || mins;
                  void run(k('time'), () => adminApi.playerAction(pc.playerId!, 'add-time', m), `+${m} min for ${pc.playerName || pc.playerId}`);
                }} />
              </Row>
            </View>
          ) : null}
          <Button small kind="danger" title="End session (log out)" style={{ marginTop: 10 }} loading={busy === k('end')}
            onPress={() => void danger('end', 'force-logout', 'End session', `Log the player out of ${pc.name}?`, 'session ended')} />
        </Glass>
      ) : null}

      <Glass>
        <Txt v="eyebrow">CONTROL</Txt>
        <View style={{ marginTop: 8 }}>
          <Grid>
            <Action label={pc.locked ? 'Unlock' : 'Lock'} tone={pc.locked ? 'em' : 'default'} busy={busy === k('lock')} disabled={!pc.online}
              onPress={() => cmd('lock', pc.locked ? 'unlock' : 'lock', pc.locked ? 'unlocked' : 'locked')} />
            <Action label="Restart kiosk app" tone="amber" busy={busy === k('rapp')} disabled={!pc.online} onPress={() => cmd('rapp', 'restart-app', 'restarting kiosk app')} />
            <Action label="Rescan games" busy={busy === k('scan')} disabled={!pc.online} onPress={() => cmd('scan', 'rescan-games', 'rescanning games')} />
            <Action label="Update kiosk" busy={busy === k('upd')} disabled={!pc.online} onPress={() => cmd('upd', 'update-app', 'update requested')} />
            <Action label="System info" busy={busy === k('info')} disabled={!pc.online} onPress={() => cmd('info', 'system-info', 'system info requested (see admin EXE)')} />
            <Action label="Restart PC" tone="red" busy={busy === k('rpc')} disabled={!pc.online}
              onPress={() => void danger('rpc', 'restart-pc', 'Restart PC', `Restart ${pc.name}${pc.inUse ? ' while a player is on it' : ''}?`, 'restarting')} />
            <Action label="Shut down" tone="red" busy={busy === k('off')} disabled={!pc.online}
              onPress={() => void danger('off', 'shutdown', 'Shut down', `Shut down ${pc.name}?`, 'shutting down')} />
          </Grid>
        </View>
      </Glass>

      <Glass>
        <Txt v="eyebrow">MESSAGE ON SCREEN</Txt>
        <Row gap={8} style={{ marginTop: 8 }}>
          <View style={{ flex: 1 }}><Field placeholder="e.g. Your time ends in 5 minutes" value={msg} onChangeText={setMsg} /></View>
          <Button small title="Send" disabled={!msg.trim() || !pc.online} loading={busy === k('msg')} onPress={() => { cmd('msg', 'show-message', 'message shown', msg.trim()); setMsg(''); }} />
        </Row>
      </Glass>
    </View>
  );
}

function MessageAll({ pcs, busy, run, done }: { pcs: AdminPc[]; busy: string | null; run: RunFn; done: () => void }) {
  const [msg, setMsg] = useState('');
  return (
    <View style={{ gap: 10 }}>
      <Txt v="h2">Message all online PCs ({pcs.length})</Txt>
      <Field placeholder="Message" value={msg} onChangeText={setMsg} />
      <Button title="Send to all" disabled={!msg.trim()} loading={busy === 'bulk-msg'} onPress={() => void run('bulk-msg', async () => {
        for (const pc of pcs) { await adminApi.pcCommand(pc.id, 'show-message', msg.trim()).catch(() => {}); }
      }, `Message sent to ${pcs.length} PCs`).then(done)} />
    </View>
  );
}

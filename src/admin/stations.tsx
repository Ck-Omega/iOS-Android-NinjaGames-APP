// TV + PS5 stations — everything the admin EXE's PS5 page does, driven from the phone
// over the shop LAN via TVSession.exe (auto-located through the cloud bridge).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SvgUri } from 'react-native-svg';
import { ctlBase } from '../lib/admin';
import { ctl, getControllerUrl, setControllerUrl, type CtlTv } from '../lib/admin';
import { Button, Empty, Field, Glass, Pill, Row, Sheet, Txt } from '../ui/primitives';
import { colors } from '../ui/theme';
import { Action, Chips, Dot, Grid, Stat, confirm, fmtSec, type RunFn } from './shared';

type Bridge = { configured?: boolean; online?: boolean; last_error?: string };
type Found = {
  subnet: string;
  ps5: { ip: string; name: string; status: string; registered?: boolean; linked_tv?: string | null }[];
  tvs: { ip: string; kind: string; station?: string | null }[];
};

const tvMode = (tv: CtlTv) => (tv.session ? 'session' : !tv.paired ? 'unpaired' : /off|disconnected|unreachable|offline/i.test(tv.status || '') ? 'off' : 'ready');
const psColor = (s?: string) => (s === 'on' ? colors.em : s === 'rest' ? colors.amber : s === 'waking' || s === 'resting' ? colors.blue : colors.red);
const psLabel = (s?: string) => (s === 'on' ? 'On' : s === 'rest' ? 'Rest mode' : s === 'waking' ? 'Waking…' : s === 'resting' ? 'Resting…' : 'Offline');

export function StationsTab({ busy, run }: { busy: string | null; run: RunFn }) {
  const [base, setBase] = useState('');
  const [draft, setDraft] = useState('');
  const [editAddr, setEditAddr] = useState(false);
  const [tvs, setTvs] = useState<(CtlTv & { ip?: string; hdmi?: string; kind?: string })[] | null>(null);
  const [bridge, setBridge] = useState<Bridge | null>(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [, tick] = useState(0);
  const baseRef = useRef('');

  const refresh = useCallback(async () => {
    if (!baseRef.current) return;
    try {
      const s = await ctl<{ tvs?: any[]; bridge?: Bridge }>(baseRef.current, 'GET', '/api/state');
      setTvs(s.tvs ?? []); setBridge(s.bridge ?? null); setErr('');
    } catch (e) { setErr(e instanceof Error ? e.message : 'TVSession error'); }
  }, []);

  useEffect(() => {
    void getControllerUrl().then((u) => { baseRef.current = u; setBase(u); setDraft(u); if (u) void refresh(); else setEditAddr(true); });
  }, [refresh]);
  useEffect(() => {
    const id = setInterval(() => { if (AppState.currentState === 'active') { void refresh(); } }, 5_000);
    const t = setInterval(() => tick((n) => n + 1), 1000); // session countdowns
    return () => { clearInterval(id); clearInterval(t); };
  }, [refresh]);

  const post = (path: string, body: unknown) => ctl(baseRef.current, 'POST', path, body);
  const act = (key: string, fn: () => Promise<unknown>, text: string) => run(key, fn, text, false).then(refresh);

  const scan = async () => {
    setShowScan(true); setScanning(true);
    try { setFound(await ctl<Found>(baseRef.current, 'GET', '/api/discover')); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Scan failed'); }
    finally { setScanning(false); }
  };

  const list = tvs ?? [];
  const inSession = list.filter((t) => t.session).length;
  const ready = list.filter((t) => tvMode(t) === 'ready').length;
  const off = list.filter((t) => ['off', 'unpaired'].includes(tvMode(t))).length;
  const current = list.find((t) => t.id === sel) ?? null;
  const paired = list.filter((t) => t.paired);

  const bulk = (key: string, label: string, call: (t: CtlTv) => Promise<unknown>) => void (async () => {
    if (!paired.length) return;
    if (!(await confirm(label, `${label} on ${paired.length} station${paired.length === 1 ? '' : 's'}?`))) return;
    void act(key, async () => {
      const bad: string[] = [];
      for (const t of paired) { try { await call(t); } catch { bad.push(t.label); } }
      if (bad.length) throw new Error(`Failed on: ${bad.join(', ')}`);
    }, `${label}: done`);
  })();

  return (
    <>
      <Glass>
        <Row between>
          <Row gap={8}>
            <Dot color={err ? colors.red : tvs ? colors.em : colors.faint} />
            <Txt v="small">{err ? 'Controller unreachable' : tvs ? 'Local controller online' : 'Connecting…'}</Txt>
          </Row>
          <Row gap={8}>
            {bridge ? <Pill tone={bridge.online ? 'em' : 'red'} label={bridge.online ? 'Cloud bridge online' : 'Bridge offline'} /> : null}
          </Row>
        </Row>
        <Pressable onPress={() => setEditAddr(!editAddr)}>
          <Txt v="tiny" style={{ marginTop: 6 }}>{base ? `TVSession · ${base} (auto)` : 'TVSession address not found'} · tap to change</Txt>
        </Pressable>
        {editAddr ? (
          <Row gap={8} style={{ marginTop: 8 }}>
            <View style={{ flex: 1 }}><Field placeholder="192.168.1.16:8765" value={draft} onChangeText={setDraft} autoCapitalize="none" autoCorrect={false} /></View>
            <Button small title="Save" onPress={async () => { await setControllerUrl(draft); const u = await getControllerUrl(); baseRef.current = u; setBase(u); setEditAddr(false); void refresh(); }} />
          </Row>
        ) : null}
        {err ? <Txt v="small" color={colors.red} style={{ marginTop: 6 }}>{err}</Txt> : null}
      </Glass>

      <Row gap={8}>
        <Stat label="Stations" value={list.length} />
        <Stat label="In session" value={inSession} tone={colors.amber} />
        <Stat label="Ready" value={ready} tone={colors.em} />
        <Stat label="Off" value={off} tone={colors.red} />
      </Row>

      <Grid>
        <Action label="Scan network" tone="blue" busy={scanning} onPress={() => void scan()} />
        <Action label="All → kiosk" onPress={() => bulk('bulk-kiosk', 'Open kiosk on all', (t) => post('/api/tv/app', { tv_id: t.id, app: 'tv browser' }))} />
        <Action label="All → PS5 input" onPress={() => bulk('bulk-ps5', 'Switch all to PS5', (t) => post('/api/tv/game', { tv_id: t.id }))} />
        <Action label="All off + PS5 rest" tone="red" onPress={() => bulk('bulk-off', 'TV off + PS5 rest', async (t) => {
          await post('/api/ps5/power', { tv_id: t.id, action: 'off' }).catch(() => {});
          await post('/api/tv/power', { tv_id: t.id, action: 'off' });
        })} />
      </Grid>

      {tvs && !list.length ? <Empty text="No stations yet. Tap Scan network to find TVs and PS5s." /> : null}
      {list.map((tv) => {
        const mode = tvMode(tv);
        const left = tv.session ? tv.session.ends_at - Date.now() / 1000 : 0;
        return (
          <Glass key={tv.id} onPress={() => setSel(tv.id)} tone={tv.session ? 'amber' : 'default'}>
            <Row between>
              <View style={{ flex: 1 }}>
                <Txt v="h3">{tv.label}</Txt>
                <Txt v="tiny">{tv.kind === 'googletv' ? 'Google TV' : 'VIDAA TV'} · {tv.ip || 'no IP'} · {(tv.hdmi || 'hdmi1').toUpperCase()}</Txt>
              </View>
              <Pill tone={mode === 'session' ? 'amber' : mode === 'ready' ? 'em' : 'red'}
                label={mode === 'session' ? `${tv.session!.user} · ${fmtSec(left)}` : mode === 'ready' ? 'Ready' : mode === 'unpaired' ? 'Not paired' : 'TV off'} />
            </Row>
            <Row gap={6} style={{ marginTop: 8 }}>
              <Dot color={psColor(tv.ps5?.state)} />
              <Txt v="small">PS5 {tv.ps5?.ip ? `${psLabel(tv.ps5?.state)} · ${tv.ps5.ip}` : 'not linked'}</Txt>
            </Row>
          </Glass>
        );
      })}

      {/* ── Station detail ── */}
      <Sheet visible={!!current} onClose={() => setSel(null)}>
        {current ? <StationDetail base={base} tv={current} busy={busy} act={act} post={post} found={found} onScan={scan} onClose={() => setSel(null)} /> : null}
      </Sheet>

      {/* ── Discovery ── */}
      <Sheet visible={showScan} onClose={() => setShowScan(false)}>
        <DiscoverySheet found={found} scanning={scanning} stations={list} busy={busy} act={act} post={post} onRescan={scan} />
      </Sheet>
    </>
  );
}

function StationDetail({ base, tv, busy, act, post, found, onScan, onClose }: {
  base: string;
  tv: CtlTv & { ip?: string; hdmi?: string; kind?: string }; busy: string | null;
  act: (k: string, f: () => Promise<unknown>, t: string) => Promise<void>;
  post: (p: string, b: unknown) => Promise<unknown>; found: Found | null; onScan: () => void; onClose: () => void;
}) {
  const [user, setUser] = useState('Guest');
  const [minutes, setMinutes] = useState(60);
  const [custom, setCustom] = useState('');
  const [pin, setPin] = useState('');
  const [ip, setIp] = useState(tv.ip ?? '');
  const id = tv.id;
  const k = (s: string) => `${s}-${id}`;
  const left = tv.session ? tv.session.ends_at - Date.now() / 1000 : 0;
  const ps5Ip = tv.ps5?.ip;

  const tvOnThenKiosk = async () => {
    await post('/api/tv/power', { tv_id: id, action: 'on' });
    setTimeout(() => { void post('/api/tv/app', { tv_id: id, app: 'tv browser' }).catch(() => {}); }, 12_000);
  };

  return (
    <View style={{ gap: 12 }}>
      <View>
        <Txt v="h2">{tv.label}</Txt>
        <Txt v="tiny">{tv.kind === 'googletv' ? 'Google TV' : 'VIDAA TV'} · {tv.ip || 'no IP'} · {tv.status || ''}</Txt>
      </View>

      {/* Session */}
      <Glass tone={tv.session ? 'amber' : 'default'}>
        <Txt v="eyebrow">TIMED PLAY</Txt>
        {tv.session ? (
          <View style={{ marginTop: 6, gap: 8 }}>
            <Row between><Txt v="h3">{tv.session.user}</Txt><Text style={{ color: colors.amber, fontSize: 22, fontWeight: '800' }}>{fmtSec(left)}</Text></Row>
            <Button small kind="danger" title="End session" loading={busy === k('end')} onPress={async () => {
              if (await confirm('End session', `End ${tv.session?.user}'s session? The TV returns to the kiosk and the PS5 rests.`, 'End', true)) {
                void act(k('end'), () => post('/api/session/end', { tv_id: id }), 'Session ended');
              }
            }} />
          </View>
        ) : (
          <View style={{ marginTop: 6, gap: 8 }}>
            <Field icon="user" placeholder="Player name" value={user} onChangeText={setUser} />
            <Chips value={minutes} onChange={(v) => { setMinutes(v); setCustom(''); }} options={[30, 60, 90, 120, 180, 240].map((m) => ({ v: m, l: m < 60 ? `${m}m` : `${m / 60}h` }))} />
            <Field icon="clock" placeholder="Custom minutes" keyboardType="number-pad" value={custom} onChangeText={(v) => setCustom(v.replace(/\D/g, ''))} />
            <Button small title="Start timed session" icon="play" loading={busy === k('start')} onPress={() => {
              const m = Number(custom) || minutes;
              void act(k('start'), () => post('/api/session/new-code', { tv_id: id, user: user.trim() || 'Guest', minutes: m, start_now: true }), `${tv.label}: ${m} min started`);
            }} />
            <Button small kind="ghost" title="Issue QR code (player scans)" loading={busy === k('qr')} onPress={() => {
              const m = Number(custom) || minutes;
              void act(k('qr'), () => post('/api/session/new-code', { tv_id: id, user: user.trim() || 'Guest', minutes: m }), 'QR code issued');
            }} />
            {tv.claim ? (
              <View style={{ alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Txt v="small">Code for {tv.claim.user} · {tv.claim.minutes} min · expires {fmtSec(tv.claim.expires_at - Date.now() / 1000)}</Txt>
                <View style={{ backgroundColor: '#fff', padding: 8, borderRadius: 12 }}>
                  <SvgUri key={`${tv.claim.expires_at}`} uri={`${ctlBase(base)}/api/qr.svg?tv_id=${encodeURIComponent(id)}&t=${Math.round(tv.claim.expires_at)}`} width={190} height={190} />
                </View>
                <Row gap={8}>
                  <Button small title="Reissue QR" loading={busy === k('reissue')} onPress={() => void act(k('reissue'), () => post('/api/session/new-code', { tv_id: id, user: tv.claim!.user, minutes: tv.claim!.minutes }), 'New QR code issued')} />
                  <Button small kind="danger" title="Cancel code" loading={busy === k('cancel')} onPress={() => void act(k('cancel'), () => post('/api/session/cancel-code', { tv_id: id }), 'Code cancelled')} />
                </Row>
              </View>
            ) : null}
          </View>
        )}
      </Glass>

      {/* Devices */}
      <Glass>
        <Row between style={{ marginBottom: 8 }}>
          <Txt v="eyebrow">TV & PS5</Txt>
          <Row gap={6}><Dot color={psColor(tv.ps5?.state)} /><Txt v="tiny">PS5 {psLabel(tv.ps5?.state)}</Txt></Row>
        </Row>
        <Grid>
          <Action label="Turn on both" tone="em" busy={busy === k('both-on')} onPress={() => void act(k('both-on'), async () => {
            await post('/api/ps5/power', { tv_id: id, action: 'on' }).catch(() => {}); await tvOnThenKiosk();
          }, 'TV + PS5 turning on')} />
          <Action label="TV off + PS5 rest" tone="red" busy={busy === k('both-off')} onPress={() => void act(k('both-off'), async () => {
            await post('/api/ps5/power', { tv_id: id, action: 'off' }).catch(() => {}); await post('/api/tv/power', { tv_id: id, action: 'off' });
          }, 'TV off, PS5 resting')} />
          <Action label="TV on" busy={busy === k('tv-on')} onPress={() => void act(k('tv-on'), tvOnThenKiosk, 'TV on')} />
          <Action label="TV off" tone="red" busy={busy === k('tv-off')} onPress={() => void act(k('tv-off'), () => post('/api/tv/power', { tv_id: id, action: 'off' }), 'TV off')} />
          <Action label="PS5 on" disabled={!ps5Ip} busy={busy === k('ps-on')} onPress={() => void act(k('ps-on'), () => post('/api/ps5/power', { tv_id: id, action: 'on' }), 'PS5 waking')} />
          <Action label="PS5 rest mode" tone="red" disabled={!ps5Ip} busy={busy === k('ps-off')} onPress={() => void act(k('ps-off'), () => post('/api/ps5/power', { tv_id: id, action: 'off' }), 'PS5 resting')} />
          <Action label="NG Play" tone="blue" disabled={!ps5Ip} onPress={() => { onClose(); router.push({ pathname: '/ps-remote' as any, params: { tv: id, label: tv.label } }); }} />
          <Action label="Open kiosk" busy={busy === k('kiosk')} onPress={() => void act(k('kiosk'), () => post('/api/tv/app', { tv_id: id, app: 'tv browser' }), 'Kiosk opened')} />
          <Action label="Switch to PS5" busy={busy === k('game')} onPress={() => void act(k('game'), () => post('/api/tv/game', { tv_id: id }), 'Switched to PS5 input')} />
          <Action label="Connect / reconnect" busy={busy === k('conn')} onPress={() => void act(k('conn'), () => post('/api/tv/connect', { tv_id: id, ip: ip.trim() }), 'Connect sent')} />
        </Grid>
      </Glass>

      {/* Setup */}
      <Glass>
        <Txt v="eyebrow">SETUP</Txt>
        <Txt v="tiny" style={{ marginTop: 8 }}>PS5 HDMI input</Txt>
        <View style={{ marginTop: 6 }}>
          <Chips value={(tv.hdmi || 'hdmi1') as string} onChange={(h) => void act(k('hdmi'), () => post('/api/config', { tv_id: id, hdmi: h }), `HDMI ${h.slice(-1)} set`)}
            options={['hdmi1', 'hdmi2', 'hdmi3', 'hdmi4'].map((h) => ({ v: h, l: `HDMI ${h.slice(-1)}` }))} />
        </View>
        <Txt v="tiny" style={{ marginTop: 10 }}>TV IP address</Txt>
        <Row gap={8} style={{ marginTop: 6 }}>
          <View style={{ flex: 1 }}><Field placeholder="192.168.1.x" keyboardType="numbers-and-punctuation" value={ip} onChangeText={setIp} /></View>
          <Button small title="Connect" loading={busy === k('ip')} onPress={() => void act(k('ip'), () => post('/api/tv/connect', { tv_id: id, ip: ip.trim() }), 'Connecting – enter the code on the TV')} />
        </Row>
        <Txt v="tiny" style={{ marginTop: 10 }}>Pairing code shown on the TV</Txt>
        <Row gap={8} style={{ marginTop: 6 }}>
          <View style={{ flex: 1 }}><Field placeholder="Code" autoCapitalize="characters" value={pin} onChangeText={setPin} /></View>
          <Button small title="Pair" loading={busy === k('pair')} onPress={() => void act(k('pair'), () => post('/api/tv/pair', { tv_id: id, pin: pin.trim() }), 'Paired')} />
        </Row>
        <Txt v="tiny" style={{ marginTop: 10 }}>Linked PS5 {ps5Ip ? `· ${ps5Ip}` : ''}</Txt>
        <View style={{ marginTop: 6, gap: 6 }}>
          {found?.ps5.length ? (
            <Chips value={ps5Ip ?? ''} onChange={(v) => void act(k('link'), () => post('/api/ps5/link', { tv_id: id, ip: v }), v ? `PS5 ${v} linked` : 'PS5 unlinked')}
              options={[{ v: '', l: 'None' }, ...found.ps5.map((p) => ({ v: p.ip, l: `${p.name || p.ip}${p.status === 'offline' ? ' (off)' : ''}` }))]} />
          ) : <Button small kind="ghost" title="Scan for PS5s to link" onPress={onScan} />}
        </View>
        <Button small kind="danger" title="Remove station" style={{ marginTop: 12 }} loading={busy === k('rm')} onPress={async () => {
          if (await confirm('Remove station', `Remove ${tv.label} from TVSession?`, 'Remove', true)) {
            void act(k('rm'), () => post('/api/tvs/remove', { tv_id: id }), `${tv.label} removed`).then(onClose);
          }
        }} />
      </Glass>
    </View>
  );
}

function DiscoverySheet({ found, scanning, stations, busy, act, post, onRescan }: {
  found: Found | null; scanning: boolean; stations: CtlTv[]; busy: string | null;
  act: (k: string, f: () => Promise<unknown>, t: string) => Promise<void>; post: (p: string, b: unknown) => Promise<any>; onRescan: () => void;
}) {
  const [names, setNames] = useState<Record<string, string>>({});
  const addTv = (ip: string, kind: string) => {
    const label = (names[ip] || `Station ${stations.length + 1}`).trim();
    void act(`add-${ip}`, async () => {
      const r = await post('/api/tvs/add', { label, kind });
      await post('/api/tv/connect', { tv_id: r.tv_id, ip });
    }, `${label} added – enter the pairing code shown on the TV`);
  };
  return (
    <View style={{ gap: 10 }}>
      <Row between>
        <Txt v="h2">Network scan</Txt>
        <Button small kind="ghost" title={scanning ? 'Scanning…' : 'Rescan'} loading={scanning} onPress={onRescan} />
      </Row>
      {found ? <Txt v="tiny">{found.subnet}</Txt> : null}
      <Txt v="eyebrow">PLAYSTATIONS</Txt>
      {found && !found.ps5.length ? <Txt v="small">No PS5 answered. Consoles fully powered off can't be found — turn them on or into rest mode.</Txt> : null}
      {(found?.ps5 ?? []).map((p) => (
        <Glass key={p.ip}>
          <Row between>
            <View><Txt v="h3">{p.name || 'PS5'}</Txt><Txt v="tiny">{p.ip}{p.registered ? ' · registered' : ' · not registered (register once in NG Play on the admin PC)'}</Txt></View>
            <Pill tone={p.status === 'on' ? 'em' : p.status === 'rest' ? 'amber' : 'red'} label={p.status === 'on' ? 'On' : p.status === 'rest' ? 'Rest' : 'Off'} />
          </Row>
          <Txt v="tiny" style={{ marginTop: 6 }}>{p.linked_tv ? `Linked to ${stations.find((s) => s.id === p.linked_tv)?.label ?? p.linked_tv}` : 'Not linked — open a station → Setup → Linked PS5'}</Txt>
        </Glass>
      ))}
      <Txt v="eyebrow" style={{ marginTop: 6 }}>TVS</Txt>
      {found && !found.tvs.length ? <Txt v="small">No TVs found.</Txt> : null}
      {(found?.tvs ?? []).map((tv) => (
        <Glass key={tv.ip}>
          <Row between>
            <View><Txt v="h3">{tv.kind === 'googletv' ? 'Google TV' : 'VIDAA TV'}</Txt><Txt v="tiny">{tv.ip}</Txt></View>
            {tv.station ? <Pill tone="em" label={stations.find((s) => s.id === tv.station)?.label ?? 'Added'} /> : null}
          </Row>
          {!tv.station ? (
            <Row gap={8} style={{ marginTop: 8 }}>
              <View style={{ flex: 1 }}><Field placeholder={`Station ${stations.length + 1}`} value={names[tv.ip] ?? ''} onChangeText={(v) => setNames({ ...names, [tv.ip]: v })} /></View>
              <Button small title="Add" loading={busy === `add-${tv.ip}`} onPress={() => addTv(tv.ip, tv.kind)} />
            </Row>
          ) : null}
        </Glass>
      ))}
    </View>
  );
}

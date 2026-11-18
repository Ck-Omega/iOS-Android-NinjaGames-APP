// Admin-only PS5 remote view over the shop LAN.
// TVSession.exe on the admin PC runs NG Play (chiaki-ng) against the station's PS5 and
// relays it: JPEG frames of the NG Play window down, controller buttons up (chiaki-ng's
// keyboard map). It's a monitor-and-navigate tool (~5-10 fps), not a game stream.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ctl, ctlBase, getControllerUrl, remoteHeaders } from '../lib/admin';
import { Button, Row, Txt } from '../ui/primitives';
import { colors } from '../ui/theme';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function toBase64(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return out;
}

export default function PsRemote() {
  const { tv, label } = useLocalSearchParams<{ tv: string; label?: string }>();
  const insets = useSafeAreaInsets();
  const [frame, setFrame] = useState<string | null>(null);
  const [aspect, setAspect] = useState(16 / 9);
  const [msg, setMsg] = useState('Starting NG Play on the admin PC…');
  const [fps, setFps] = useState(0);
  const base = useRef('');
  const alive = useRef(true);

  const close = useCallback(async () => {
    alive.current = false;
    try { await ctl(base.current, 'POST', '/api/ps5/relay/stop', {}); } catch { /* ignore */ }
    router.back();
  }, []);

  useEffect(() => {
    alive.current = true;
    let frames = 0;
    const fpsTimer = setInterval(() => { setFps(frames); frames = 0; }, 1000);
    (async () => {
      try {
        base.current = await getControllerUrl();
        const r = await ctl(base.current, 'POST', '/api/ps5/relay/start', { tv_id: tv });
        setMsg(r.message ?? 'Connecting…');
      } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not start NG Play.'); return; }
      // Sequential frame pull: the next request starts when the last one lands (self-throttling).
      while (alive.current) {
        if (AppState.currentState !== 'active') { await new Promise((r) => setTimeout(r, 500)); continue; }
        try {
          const res = await fetch(`${ctlBase(base.current)}/api/ps5/relay/frame?w=960&q=55`, { headers: remoteHeaders() });
          if (res.status === 200) {
            const uri = `data:image/jpeg;base64,${toBase64(await res.arrayBuffer())}`;
            if (!alive.current) break;
            setFrame(uri); setMsg(''); frames += 1;
          } else {
            const j = await res.json().catch(() => ({}));
            setMsg(j?.error || `Waiting for NG Play (${res.status})…`);
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch {
          setMsg('Lost connection to TVSession. Retrying…');
          await new Promise((r) => setTimeout(r, 1500));
        }
        await new Promise((r) => setTimeout(r, 60));
      }
    })();
    return () => { alive.current = false; clearInterval(fpsTimer); };
  }, [tv]);

  const sized = useRef(false);
  useEffect(() => {
    if (!frame || sized.current) return;
    sized.current = true;
    Image.getSize(frame, (w, h) => { if (h) setAspect(w / h); }, () => {});
  }, [frame]);

  const send = (button: string, down: boolean) => { void ctl(base.current, 'POST', '/api/ps5/relay/input', { button, down }).catch((e) => setMsg(e.message)); };

  return (
    <View style={[styles.fill, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 10 }]}>
      <Row between style={{ paddingHorizontal: 14 }}>
        <Txt v="h3">{label || 'PS5'} · Remote</Txt>
        <Row gap={8}><Txt v="tiny">{fps} fps</Txt><Button small kind="danger" title="Close" onPress={() => void close()} /></Row>
      </Row>
      <View style={[styles.screen, { aspectRatio: aspect }]}>
        {frame ? <Image source={{ uri: frame }} style={StyleSheet.absoluteFill} resizeMode="contain" fadeDuration={0} /> : null}
        {msg ? <View style={styles.msg}><Txt v="small" center>{msg}</Txt></View> : null}
      </View>

      <Row between style={{ paddingHorizontal: 14, marginTop: 8 }}>
        <Row gap={6}>{(['l2', 'l1'] as const).map((b) => <Key key={b} b={b} label={b.toUpperCase()} send={send} small />)}</Row>
        <Row gap={6}>
          <Key b="share" label="CREATE" send={send} small />
          <Key b="ps" label="PS" send={send} small />
          <Key b="options" label="OPTIONS" send={send} small />
        </Row>
        <Row gap={6}>{(['r1', 'r2'] as const).map((b) => <Key key={b} b={b} label={b.toUpperCase()} send={send} small />)}</Row>
      </Row>

      <Row between style={{ paddingHorizontal: 22, marginTop: 14 }}>
        <Cross a="up" b="down" c="left" d="right" labels={['▲', '▼', '◀', '▶']} send={send} />
        <Key b="touchpad" label="PAD" send={send} small />
        <Cross a="triangle" b="cross" c="square" d="circle" labels={['△', '✕', '□', '○']} send={send} />
      </Row>
    </View>
  );
}

function Key({ b, label, send, small }: { b: string; label: string; send: (b: string, d: boolean) => void; small?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <Pressable
      onPressIn={() => { setOn(true); send(b, true); }}
      onPressOut={() => { setOn(false); send(b, false); }}
      style={[small ? styles.small : styles.key, on && styles.on]}
    >
      <Text style={[styles.keyText, small && { fontSize: 11 }]}>{label}</Text>
    </Pressable>
  );
}

function Cross({ a, b, c, d, labels, send }: { a: string; b: string; c: string; d: string; labels: string[]; send: (b: string, d: boolean) => void }) {
  return (
    <View style={{ width: 150, height: 150 }}>
      <View style={[styles.pos, { left: 50, top: 0 }]}><Key b={a} label={labels[0]} send={send} /></View>
      <View style={[styles.pos, { left: 50, top: 100 }]}><Key b={b} label={labels[1]} send={send} /></View>
      <View style={[styles.pos, { left: 0, top: 50 }]}><Key b={c} label={labels[2]} send={send} /></View>
      <View style={[styles.pos, { left: 100, top: 50 }]}><Key b={d} label={labels[3]} send={send} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.black },
  screen: { width: '100%', backgroundColor: '#000', marginTop: 8, justifyContent: 'center' },
  msg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 20 },
  pos: { position: 'absolute' },
  key: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.line2, alignItems: 'center', justifyContent: 'center' },
  small: { paddingHorizontal: 10, height: 34, borderRadius: 17, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.line2, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: colors.emSoft, borderColor: colors.em },
  keyText: { color: colors.text, fontSize: 18, fontWeight: '700' },
});

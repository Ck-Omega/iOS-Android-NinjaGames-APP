import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { adminApi, type Overview } from '../lib/admin';
import { Button, Empty, Glass, Row, Txt } from '../ui/primitives';
import { Chips, ago, type RunFn } from './shared';

export function RequestsTab({ data, busy, run }: { data: Overview | null; busy: string | null; run: RunFn }) {
  const [guestMin, setGuestMin] = useState(30);
  if (!data) return <Txt v="small">Loading…</Txt>;
  const none = !data.topups.length && !data.guests.length && !data.registrations.length;
  return (
    <>
      {none ? <Empty text="No pending requests. New ones appear within a few seconds." /> : null}

      {data.topups.length ? <Txt v="eyebrow">TOP-UPS · {data.topups.length}</Txt> : null}
      {data.topups.map((r) => (
        <Glass key={r.id} tone="amber">
          <Row between><Txt v="h3">{r.playerName || r.playerId}</Txt><Txt v="tiny">{ago(r.createdAt)}</Txt></Row>
          <Txt v="body" style={{ marginTop: 4 }}>{r.coins} coins{r.price ? ` · ${r.price} JOD` : ''}{r.packageId ? ` · ${r.packageId}` : ''}</Txt>
          <Row gap={8} style={{ marginTop: 10 }}>
            <Button small style={{ flex: 1 }} title="Approve" loading={busy === `ta-${r.id}`} onPress={() => void run(`ta-${r.id}`, () => adminApi.resolveTopup(r.id, 'approve'), `+${r.coins} coins → ${r.playerName}`)} />
            <Button small kind="danger" style={{ flex: 1 }} title="Reject" loading={busy === `tr-${r.id}`} onPress={() => void run(`tr-${r.id}`, () => adminApi.resolveTopup(r.id, 'reject'), 'Top-up rejected')} />
          </Row>
        </Glass>
      ))}

      {data.guests.length ? (
        <View style={{ gap: 6 }}>
          <Txt v="eyebrow">GUEST PLAY · {data.guests.length}</Txt>
          <Chips value={guestMin} onChange={setGuestMin} options={[15, 30, 45, 60, 90, 120].map((m) => ({ v: m, l: `${m}m` }))} />
        </View>
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

      {data.registrations.length ? <Txt v="eyebrow">REGISTRATIONS · {data.registrations.length}</Txt> : null}
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

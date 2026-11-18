import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { useSession } from '../../lib/session';
import { clock, num } from '../../lib/format';
import type { ChatMessage, FriendsData, PublicPlayer } from '../../lib/types';
import { art } from '../../ui/art';
import { Icon } from '../../ui/icons';
import {
  Avatar, Button, Empty, ErrorState, Field, Glass, IconButton, Loading, Pill, Row, Screen, SectionHeader, Segmented, Sheet, Txt, tap,
} from '../../ui/primitives';
import { colors } from '../../ui/theme';

type Convo = { friend: string; last: ChatMessage | null };

export default function Social() {
  const { t, lang, errText, showToast } = useSession();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [seg, setSeg] = useState<'chats' | 'friends'>(params.tab === 'friends' ? 'friends' : 'chats');
  React.useEffect(() => { if (params.tab === 'friends' || params.tab === 'chats') setSeg(params.tab); }, [params.tab]); // applies only when the param changes
  const data = useApi<FriendsData>('/api/app/friends', { pollMs: 60_000, ttlMs: 30_000 });
  const convos = useApi<{ conversations: Convo[] }>('/api/app/chat', { pollMs: 45_000, ttlMs: 20_000 });
  const [adding, setAdding] = useState(false);
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (body: Record<string, unknown>, okText?: string) => {
    setBusy(String(body.requestId ?? body.uid ?? body.username ?? 'x'));
    try {
      const res = await api.post<{ status: string }>('/api/app/friends', body);
      if (okText) showToast(res.status === 'accepted' ? t('accept') + ' ✓' : okText);
      await data.refresh();
      return true;
    } catch (e) { showToast(errText(e), 'error'); return false; }
    finally { setBusy(null); }
  };

  const friends = data.data?.friends ?? [];
  const online = friends.filter((f) => f.online);
  const offline = friends.filter((f) => !f.online);
  const lastBy = new Map((convos.data?.conversations ?? []).map((c) => [c.friend, c.last]));
  const chatRows = friends
    .map((f) => ({ f, last: lastBy.get(f.uid) ?? null }))
    .sort((a, b) => (b.last?.createdAt ?? 0) - (a.last?.createdAt ?? 0) || Number(b.f.online) - Number(a.f.online));

  return (
    <Screen tabs onRefresh={async () => { await Promise.all([data.refresh(), convos.refresh()]); }}>
      <Row between>
        <Txt v="h1">{t('tabChat')}</Txt>
        <IconButton name="plus" onPress={() => { setSeg('friends'); setAdding(true); }} />
      </Row>
      <View style={{ marginTop: 12 }}>
        <Segmented value={seg} onChange={setSeg} options={[{ value: 'chats', label: t('chats') }, { value: 'friends', label: t('friends') }]} />
      </View>

      {seg === 'chats' ? (
        <View key="chats-pane">
          {(data.loading && !data.data) ? <Loading /> : null}
          {data.error && !data.data ? <View style={{ marginTop: 14 }}><ErrorState text={errText(data.error)} onRetry={data.refresh} /></View> : null}
          {data.data && friends.length === 0 ? (
            <>
              <Empty text={t('noChats')} image={art.ninjaEmpty} />
              <Button title={t('friends')} icon="squad" onPress={() => setSeg('friends')} />
            </>
          ) : null}
          {chatRows.map(({ f, last }) => (
            <Pressable key={f.uid} onPress={() => { tap(); router.push({ pathname: '/chat/[uid]', params: { uid: f.uid, name: f.username } }); }}>
              <Row style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <Avatar name={f.username} uri={f.avatar} size={46} online={f.online} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3">{f.username}</Txt>
                  <Txt v="tiny" color={last ? colors.muted : colors.faint} numberOfLines={1}>
                    {last ? (last.mine ? `${t('you')}: ` : '') + last.text : t('sayHi')}
                  </Txt>
                </View>
                {last ? <Txt v="tiny" color={colors.faint}>{clock(last.createdAt, lang)}</Txt> : null}
              </Row>
            </Pressable>
          ))}
        </View>
      ) : null}

      {seg === 'friends' ? <View key="friends-pane">
      {data.loading && !data.data ? <Loading /> : null}
      {data.error && !data.data ? <View style={{ marginTop: 14 }}><ErrorState text={errText(data.error)} onRetry={data.refresh} /></View> : null}

      {data.data?.incoming.map((r) => (
        <Glass key={r.requestId} tone="em" style={{ marginTop: 12, paddingVertical: 12 }}>
          <Row>
            <Avatar name={r.player.username} uri={r.player.avatar} size={38} />
            <Txt v="h3" style={{ flex: 1 }} numberOfLines={2}>{t('wantsToJoin', { name: r.player.username })}</Txt>
            <Pressable onPress={() => act({ action: 'decline', requestId: r.requestId })} hitSlop={8} style={{ padding: 6 }}>
              <Icon name="close" size={18} color={colors.faint} />
            </Pressable>
            <Button small title={t('accept')} loading={busy === r.requestId} onPress={() => act({ action: 'accept', requestId: r.requestId }, t('accept'))} />
          </Row>
        </Glass>
      ))}

      {data.data && friends.length === 0 && !data.data.incoming.length ? (
        <>
          <Empty text={t('noFriends')} image={art.ninjaEmpty} />
          <Button title={t('addFriend')} icon="plus" onPress={() => setAdding(true)} />
        </>
      ) : null}

      {online.length ? <SectionHeader title={t('onlineN', { n: num(online.length, lang) })} /> : null}
      {online.map((f) => <FriendRow key={f.uid} f={f} />)}
      {offline.length ? <SectionHeader title={t('offlineN', { n: num(offline.length, lang) })} /> : null}
      {offline.map((f) => <FriendRow key={f.uid} f={f} />)}
      {data.data?.outgoing.length ? (
        <Txt v="tiny" color={colors.faint} style={{ marginTop: 16 }}>{t('pendingN', { n: num(data.data.outgoing.length, lang) })}</Txt>
      ) : null}
      </View> : null}

      <Sheet visible={adding} onClose={() => setAdding(false)}>
        <Txt v="h2">{t('addFriend')}</Txt>
        <Txt v="small" style={{ marginTop: 4 }}>{t('addFriendHint')}</Txt>
        <View style={{ marginTop: 14 }}>
          <Field icon="user" placeholder={t('username')} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoFocus />
        </View>
        <Button
          style={{ marginTop: 14 }} title={t('sendRequest')} loading={busy === username.trim().toLowerCase()}
          disabled={username.trim().length < 3}
          onPress={async () => {
            const ok = await act({ action: 'request', username: username.trim().toLowerCase() }, t('requestSent'));
            if (ok) { setUsername(''); setAdding(false); }
          }}
        />
      </Sheet>
    </Screen>
  );
}

function FriendRow({ f }: { f: PublicPlayer }) {
  const { t } = useSession();
  const playing = f.activity && /play|يلعب|ps5/i.test(f.activity);
  return (
    <Pressable onPress={() => { tap(); router.push({ pathname: '/chat/[uid]', params: { uid: f.uid, name: f.username } }); }}>
      <Row style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <Avatar name={f.username} uri={f.avatar} size={44} online={f.online} />
        <View style={{ flex: 1 }}>
          <Txt v="h3">{f.username}</Txt>
          <Txt v="tiny" color={f.online ? (playing ? colors.em : colors.muted) : colors.faint} numberOfLines={1}>
            {f.online ? (f.activity || t('inApp')) : t('lv', { n: f.level })}
          </Txt>
        </View>
        {f.online && playing ? <Pill tone="em" icon="gamepad" label={t('live')} /> : null}
        <Icon name="chat" size={18} color={colors.faint} />
      </Row>
    </Pressable>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { useSession } from '../../lib/session';
import { clock } from '../../lib/format';
import type { ChatMessage } from '../../lib/types';
import { Icon } from '../../ui/icons';
import { Avatar, Backdrop, Empty, IconButton, Row, Txt, tap } from '../../ui/primitives';
import { colors, fonts, radius, webNoOutline } from '../../ui/theme';

export default function Chat() {
  const { uid, name } = useLocalSearchParams<{ uid: string; name?: string }>();
  const { t, lang, errText, showToast, rtl } = useSession();
  const insets = useSafeAreaInsets();
  const thread = useApi<{ messages: ChatMessage[] }>(uid ? `/api/app/chat?with=${encodeURIComponent(String(uid))}` : null, { pollMs: 5000 });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const messages = thread.data?.messages ?? [];

  useEffect(() => { setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50); }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    tap();
    setSending(true);
    try {
      const res = await api.post<{ message: ChatMessage }>('/api/app/chat', { to: uid, text: body });
      setText('');
      thread.setData({ messages: [...messages, res.message] });
    } catch (e) { showToast(errText(e), 'error'); }
    finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Backdrop />
      <Row style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="back" onPress={() => router.back()} />
        <Avatar name={String(name ?? '?')} size={38} />
        <Txt v="h2" style={{ flex: 1 }} numberOfLines={1}>{String(name ?? '')}</Txt>
      </Row>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
        ListEmptyComponent={thread.loading ? undefined : <Empty text={t('noMessages')} />}
        renderItem={({ item }) => {
          const right = item.mine !== rtl;
          return (
            <View style={[styles.bubble, item.mine ? styles.me : styles.them, { alignSelf: right ? 'flex-end' : 'flex-start' }]}>
              <Txt v="body" color={item.mine ? colors.emInk : colors.text} style={{ fontSize: 14.5 }}>{item.text}</Txt>
              <Txt v="tiny" color={item.mine ? 'rgba(3,32,19,0.6)' : colors.faint} style={{ marginTop: 2, fontSize: 10 }}>{clock(item.createdAt, lang)}</Txt>
            </View>
          );
        }}
      />
      <Row style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('message')}
          placeholderTextColor={colors.faint}
          selectionColor={colors.em}
          style={[styles.input, { textAlign: rtl ? 'right' : 'left' }]}
          multiline
          maxLength={500}
        />
        <Pressable onPress={send} disabled={!text.trim() || sending} style={[styles.send, (!text.trim() || sending) && { opacity: 0.4 }]}>
          <Icon name="send" size={18} color={colors.emInk} stroke={2.2} />
        </Pressable>
      </Row>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  bubble: { maxWidth: '78%', paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18 },
  me: { backgroundColor: colors.em, borderBottomRightRadius: 6 },
  them: { backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6 },
  composer: { paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: 'rgba(6,14,11,0.9)' },
  input: { flex: 1, minWidth: 0, ...webNoOutline, minHeight: 44, maxHeight: 120, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  send: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.em, alignItems: 'center', justifyContent: 'center' },
});

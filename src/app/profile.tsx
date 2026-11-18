import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../lib/session';
import { SUPPORT_EMAIL } from '../lib/config';
import { num } from '../lib/format';
import { Avatar, Button, Glass, IconButton, Pill, Row, Screen, Segmented, Sheet, Txt } from '../ui/primitives';
import { colors } from '../ui/theme';
import type { Lang } from '../lib/i18n';

export default function Profile() {
  const { me, t, lang, setLang, signOut } = useSession();
  const [deleting, setDeleting] = useState(false);
  if (!me) return null;
  const p = me.player;
  return (
    <Screen>
      <Row between>
        <Txt v="h1" style={{ fontSize: 26 }}>{t('profile')}</Txt>
        <IconButton name="close" onPress={() => router.back()} />
      </Row>

      <Glass style={{ marginTop: 18, alignItems: 'center', paddingVertical: 24 }}>
        <Avatar name={p.username} uri={p.avatar} size={84} />
        <Txt v="h2" center style={{ marginTop: 12 }}>{p.displayName || p.username}</Txt>
        <Txt v="small" center>@{p.username}</Txt>
        <Row gap={8} style={{ marginTop: 12 }}>
          <Pill tone="em" label={`${t('level')} ${num(p.level, lang)}`} />
          {p.vip ? <Pill tone="amber" icon="crown" label={t('vip')} /> : null}
        </Row>
      </Glass>

      <Txt v="eyebrow" style={{ marginTop: 22, marginBottom: 10 }}>{t('language')}</Txt>
      <Segmented<Lang> value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]} />

      <View style={{ gap: 10, marginTop: 26 }}>
        <Button kind="ghost" icon="logout" title={t('signOut')} onPress={signOut} />
        <Button kind="danger" title={t('deleteAccount')} onPress={() => setDeleting(true)} />
      </View>

      <Sheet visible={deleting} onClose={() => setDeleting(false)}>
        <Txt v="h2">{t('deleteAccount')}</Txt>
        <Txt v="small" style={{ marginTop: 8 }}>{t('deleteAccountBody')}</Txt>
        {SUPPORT_EMAIL ? (
          <>
            <Button
              kind="danger" style={{ marginTop: 16 }} title={t('deleteAccount')}
              onPress={() => { void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my account')}&body=${encodeURIComponent(`Username: ${p.username}`)}`); }}
            />
            <Txt v="tiny" center color={colors.faint} style={{ marginTop: 12 }}>{SUPPORT_EMAIL}</Txt>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

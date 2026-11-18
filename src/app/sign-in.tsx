import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSession } from '../lib/session';
import { ApiError } from '../lib/api';
import { art } from '../ui/art';
import { Button, Field, Pill, Row, Screen, Txt } from '../ui/primitives';
import { colors } from '../ui/theme';

// Arabic-Indic (٠-٩) and Persian (۰-۹) digits → ASCII, so an Arabic keyboard works.
function asciiDigits(v: string): string {
  return v.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

export default function SignIn() {
  const { t, signIn, signInAdmin, errText, lang, setLang } = useSession();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [legacy, setLegacy] = useState(false);
  // Staff: typing the kiosk's admin phrase as the username turns the PIN box into the admin password.
  const staff = username.trim().toLowerCase() === 'ghanemadmin';

  const submit = async () => {
    setError(''); setLegacy(false);
    const u = asciiDigits(username).trim().toLowerCase();
    if (staff) {
      if (!pin) return;
      setBusy(true);
      try { await signInAdmin(pin); } catch (e) { setError(e instanceof ApiError ? e.message : errText(e)); } finally { setBusy(false); }
      return;
    }
    if (!u || pin.length < 4) { setError(t('pinTooShort')); return; }
    setBusy(true);
    try {
      await signIn(u, pin);
    } catch (e) {
      if (__DEV__) console.warn('[sign-in] failed', e instanceof ApiError ? `${e.code} (${e.status})` : String(e), `username=${u} pinLength=${pin.length}`);
      if (e instanceof ApiError && (e.code === 'ACCOUNT_NEEDS_RESET')) { setLegacy(true); setError(t('legacyNeedsMove')); }
      else setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.heroWrap} pointerEvents="none">
        <Image source={art.loginAmbience} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['rgba(4,9,10,0)', 'rgba(4,9,10,0.6)', colors.bg]} style={StyleSheet.absoluteFill} />
      </View>
      <Row between style={{ marginTop: 4 }}>
        <View />
        <Pressable onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} hitSlop={10}>
          <Pill icon="globe" label={lang === 'ar' ? 'English' : 'عربي'} />
        </Pressable>
      </Row>
      <View style={{ height: 120 }} />
      <Image source={art.logo} style={styles.logo} contentFit="contain" />
      <Txt v="hero" style={{ marginTop: 16 }}>{t('welcomeBack')}</Txt>
      <Txt v="small" style={{ marginTop: 8 }}>{t('signInHint')}</Txt>

      <View style={{ gap: 12, marginTop: 24 }}>
        <Field icon="user" placeholder={t('username')} value={username} onChangeText={setUsername}
          autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" returnKeyType="next" />
        <Field icon="key" placeholder={staff ? 'Admin password' : t('pin')} value={pin}
          onChangeText={(v) => setPin(staff ? v : asciiDigits(v).replace(/\D/g, '').slice(0, 6))}
          keyboardType={staff ? 'default' : 'number-pad'} autoCapitalize="none" secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit} returnKeyType="go" />
        {error ? <Txt v="small" color={colors.red}>{error}</Txt> : null}
        <Button title={t('signIn')} onPress={submit} loading={busy} />
      </View>

      <Pressable onPress={() => router.push({ pathname: '/easycafe', params: { u: username.trim().toLowerCase() } })} style={{ marginTop: 18 }}>
        <Row gap={6}>
          <Txt v="small">{t('easyCafeQ')}</Txt>
          <Txt v="small" color={colors.em} style={{ fontWeight: '700' }}>{t('moveAccount')}</Txt>
        </Row>
      </Pressable>
      {legacy ? <Button kind="ghost" small title={t('moveAccount')} style={{ marginTop: 12 }} onPress={() => router.push({ pathname: '/easycafe', params: { u: username.trim().toLowerCase() } })} /> : null}

      <Pressable onPress={() => router.push('/register')} style={{ marginTop: 28 }}>
        <Row gap={6}>
          <Txt v="small" color={colors.faint}>{t('newHere')}</Txt>
          <Txt v="small" color={colors.text}>{t('createAccount')}</Txt>
        </Row>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 420, opacity: 0.6 },
  logo: { width: 86, height: 86 },
});

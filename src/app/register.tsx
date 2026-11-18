import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { Button, Field, IconButton, Row, Screen, Txt } from '../ui/primitives';
import { colors } from '../ui/theme';

// Mirrors server/src/lib/pin-policy.ts
const PIN_RULES = ['At least 8 characters', 'One capital letter', 'One special character (!@#$%...)'];
function pinError(pw: string): string | null {
  if (pw.length < 8 || pw.length > 64) return PIN_RULES[0];
  if (!/[A-Z]/.test(pw)) return PIN_RULES[1];
  if (!/[^A-Za-z0-9\s]/.test(pw)) return PIN_RULES[2];
  return null;
}

export default function Register() {
  const { t, errText, signInWithCustomToken } = useSession();
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const u = username.trim().toLowerCase();
    if (!/^\d{6}$/.test(code)) { setError(t('registerHint')); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { setError(t('usernameRule')); return; }
    { const pe = pinError(pin); if (pe) { setError('Password: ' + pe); return; } }
    if (phone.replace(/\D/g, '').length < 9) { setError('Invalid phone number'); return; }
    if (pin !== pin2) { setError(t('pinsDontMatch')); return; }
    setBusy(true);
    try {
      const res = await api.post<{ customToken: string }>('/api/auth/register', {
        approvalCode: code, username: u, displayName: u, firstName: first.trim(), lastName: last.trim(), phone: phone.trim(), pin,
      }, { auth: false });
      await signInWithCustomToken(res.customToken);
    } catch (e: any) { setError(e?.code === 'PHONE_TAKEN' ? 'This number is already registered' : errText(e)); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <IconButton name="back" onPress={() => router.back()} />
      <Txt v="h1" style={{ marginTop: 24 }}>{t('registerTitle')}</Txt>
      <Txt v="small" style={{ marginTop: 8 }}>{t('registerHint')}</Txt>
      <View style={{ gap: 12, marginTop: 22 }}>
        <Field icon="check" placeholder={t('approvalCode')} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" />
        <Field icon="user" placeholder={t('username')} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
        <Txt v="tiny" style={{ marginTop: -6, marginHorizontal: 6 }}>{t('usernameRule')}</Txt>
        <Row gap={10}>
          <View style={{ flex: 1 }}><Field placeholder={t('firstName')} value={first} onChangeText={setFirst} /></View>
          <View style={{ flex: 1 }}><Field placeholder={t('lastName')} value={last} onChangeText={setLast} /></View>
        </Row>
        <Field placeholder={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field icon="key" placeholder="Password" value={pin} onChangeText={(v) => setPin(v.slice(0, 64))} autoCapitalize="none" secureTextEntry />
        <Txt v="tiny" style={{ marginTop: -6, marginHorizontal: 6 }}>{PIN_RULES.join(' · ')}</Txt>
        <Field icon="key" placeholder="Confirm password" value={pin2} onChangeText={(v) => setPin2(v.slice(0, 64))} autoCapitalize="none" secureTextEntry />
        {error ? <Txt v="small" color={colors.red}>{error}</Txt> : null}
        <Button title={t('register')} onPress={submit} loading={busy} />
      </View>
      <Pressable onPress={() => router.back()} style={{ marginTop: 22 }}>
        <Row gap={6}><Txt v="small" color={colors.faint}>{t('haveAccount')}</Txt><Txt v="small" color={colors.text}>{t('signIn')}</Txt></Row>
      </Pressable>
    </Screen>
  );
}

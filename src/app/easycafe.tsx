import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { Button, Field, IconButton, Row, Screen, Txt } from '../ui/primitives';
import { pinProblem, PIN_HINT } from '../admin/pin';
import { colors } from '../ui/theme';

export default function EasyCafeMove() {
  const { t, errText, signIn, showToast } = useSession();
  const params = useLocalSearchParams<{ u?: string }>();
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState(params.u ?? '');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const verify = async () => {
    setError('');
    setBusy(true);
    try {
      await api.post('/api/auth/easycafe-migrate', { mode: 'verify', username: username.trim().toLowerCase(), password }, { auth: false });
      setStep(2);
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };

  const setNewPin = async () => {
    setError('');
    { const pe = pinProblem(pin); if (pe) { setError(pe); return; } }
    if (pin !== pin2) { setError(t('pinsDontMatch')); return; }
    setBusy(true);
    try {
      const u = username.trim().toLowerCase();
      await api.post('/api/auth/easycafe-migrate', { mode: 'set-pin', username: u, password, newPin: pin }, { auth: false });
      await signIn(u, pin);
      showToast('✓');
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <IconButton name="back" onPress={() => router.back()} />
      <Txt v="h1" style={{ marginTop: 24 }}>{t('easyTitle')}</Txt>
      <Txt v="small" style={{ marginTop: 8 }}>{t('easyHint')}</Txt>
      <Row gap={6} style={{ marginTop: 20 }}>
        <View style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: colors.em }} />
        <View style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: step === 2 ? colors.em : colors.line }} />
      </Row>
      {step === 1 ? (
        <View style={{ gap: 12, marginTop: 22 }}>
          <Field icon="user" placeholder={t('username')} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          <Field icon="lock" placeholder={t('oldPassword')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" onSubmitEditing={verify} />
          {error ? <Txt v="small" color={colors.red}>{error}</Txt> : null}
          <Button title={t('continue')} onPress={verify} loading={busy} disabled={!username || !password} />
        </View>
      ) : (
        <View style={{ gap: 12, marginTop: 22 }}>
          <Field icon="key" placeholder="New password" value={pin} onChangeText={(v) => setPin(v.slice(0, 64))} autoCapitalize="none" autoCorrect={false} secureTextEntry />
          <Field icon="key" placeholder="Confirm password" value={pin2} onChangeText={(v) => setPin2(v.slice(0, 64))} autoCapitalize="none" autoCorrect={false} secureTextEntry onSubmitEditing={setNewPin} />
          <Txt v="tiny">{PIN_HINT}</Txt>
          {error ? <Txt v="small" color={colors.red}>{error}</Txt> : null}
          <Button title={t('setPinAndSignIn')} onPress={setNewPin} loading={busy} />
        </View>
      )}
    </Screen>
  );
}

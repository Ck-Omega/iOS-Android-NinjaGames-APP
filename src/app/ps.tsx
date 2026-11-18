// Deep link target: ninjagames://ps?s=<station>&c=<code> or
// https://www.ninjagamesjo.com/ps?s=…&c=… (phone camera scanned the TV QR).
import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../lib/session';
import { Backdrop, Glass, IconButton, Row, Txt } from '../ui/primitives';
import { PsStartPanel } from '../ui/PsStart';

export default function PsDeepLink() {
  const { t } = useSession();
  const insets = useSafeAreaInsets();
  const { s, c } = useLocalSearchParams<{ s?: string; c?: string }>();
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 18 }}>
      <Backdrop />
      <Row between>
        <IconButton name="close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </Row>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {s && c ? (
          <Glass style={{ padding: 20 }}>
            <PsStartPanel stationId={String(s)} code={String(c)} />
          </Glass>
        ) : (
          <Txt v="h2" center>{t('notNinjaQr')}</Txt>
        )}
      </View>
    </View>
  );
}

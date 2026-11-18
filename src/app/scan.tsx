import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSession } from '../lib/session';
import { num } from '../lib/format';
import { Button, IconButton, Pill, Row, Sheet, Txt } from '../ui/primitives';
import { PsStartPanel, parsePsQr } from '../ui/PsStart';
import { colors } from '../ui/theme';

export default function Scan() {
  const { me, t, lang, showToast } = useSession();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [found, setFound] = useState<{ s: string; c: string } | null>(null);
  const [torch, setTorch] = useState(false);
  const lastBad = useRef(0);

  const onScan = ({ data }: { data: string }) => {
    if (found) return;
    const qr = parsePsQr(data);
    if (!qr) {
      if (Date.now() - lastBad.current > 3000) { lastBad.current = Date.now(); showToast(t('notNinjaQr'), 'error'); }
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setFound(qr);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={found ? undefined : onScan}
        />
      ) : null}
      <LinearGradient colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']} locations={[0, 0.25, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <Row between style={{ paddingTop: insets.top + 8, paddingHorizontal: 18 }}>
        <IconButton name="close" onPress={() => router.back()} />
        <Pill tone="blue" label={`PS5 · ${num(me?.wallets.ps ?? 0, lang)} ${t('tokens')}`} />
        <IconButton name="flash" onPress={() => setTorch((v) => !v)} />
      </Row>

      <View style={styles.finderWrap} pointerEvents="none">
        <View style={styles.finder}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <View style={styles.scanLine} />
        </View>
        <Txt v="h2" center style={{ marginTop: 28 }}>{t('scanTitle')}</Txt>
        <Txt v="small" center style={{ marginTop: 6, paddingHorizontal: 34 }}>{t('scanHint')}</Txt>
      </View>

      {!permission?.granted ? (
        <View style={[styles.permission, { bottom: insets.bottom + 30 }]}>
          <Txt v="small" center>{t('cameraNeeded')}</Txt>
          <Button kind="blue" icon="scan" title={t('allowCamera')} onPress={requestPermission} />
        </View>
      ) : null}

      <Sheet visible={!!found} onClose={() => setFound(null)}>
        {found ? <PsStartPanel stationId={found.s} code={found.c} /> : null}
      </Sheet>
    </View>
  );
}

const C = 46;
const styles = StyleSheet.create({
  finderWrap: { position: 'absolute', top: '20%', left: 0, right: 0, alignItems: 'center' },
  finder: { width: 240, height: 240 },
  corner: { position: 'absolute', width: C, height: C, borderColor: colors.em },
  tl: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 20 },
  tr: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 20 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 20 },
  br: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 20 },
  scanLine: { position: 'absolute', left: 16, right: 16, top: '50%', height: 2, backgroundColor: colors.em, shadowColor: colors.em, shadowOpacity: 1, shadowRadius: 10 },
  permission: { position: 'absolute', left: 24, right: 24, gap: 12 },
});

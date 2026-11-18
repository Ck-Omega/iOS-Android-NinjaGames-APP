import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../lib/session';
import { Backdrop, ToastHost } from '../ui/primitives';
import { colors, fontFiles } from '../ui/theme';
import { art } from '../ui/art';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontFiles);
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="light" />
        {fontsLoaded ? <Navigator /> : <Splash />}
        <ToastHost />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function Navigator() {
  const { status, isAdmin } = useSession();
  if (status === 'loading') return <Splash />;
  const signedIn = status === 'signedIn' && !isAdmin;
  const admin = status === 'signedIn' && isAdmin;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade_from_bottom' }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="events" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="chat/[uid]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="ps" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={admin}>
        <Stack.Screen name="admin" options={{ animation: 'fade' }} />
        <Stack.Screen name="ps-remote" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={status !== 'signedIn'}>
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="easycafe" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
    </Stack>
  );
}

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Backdrop />
      <Image source={art.logo} style={{ width: 110, height: 110 }} contentFit="contain" />
    </View>
  );
}

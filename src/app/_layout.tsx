import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';

import { MarkersProvider } from '../context/markers-context';

export default function RootLayout() {
  return (
    <MarkersProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#fff' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="marker/[id]" options={{ title: 'Маркер' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Страница не найдена' }} />
      </Stack>
    </MarkersProvider>
  );
}

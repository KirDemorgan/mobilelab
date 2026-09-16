import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Button, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DatabaseProvider, useDatabase } from '../context/database-context';
import { LocationProvider } from '../context/location-context';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <StatusBar style="dark" />
      <LocationProvider>
        <DatabaseNavigation />
      </LocationProvider>
    </DatabaseProvider>
  );
}

function DatabaseNavigation() {
  const { isReady, isLoading, error, retry } = useDatabase();

  if (!isReady) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
        {isLoading ? <ActivityIndicator accessibilityLabel="Загрузка базы данных" /> : (
          <>
            <Text>Не удалось открыть базу данных.</Text>
            <Text selectable>{error?.message}</Text>
            <Button title="Повторить" onPress={retry} />
          </>
        )}
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {error && (
        <SafeAreaView edges={['top']} style={{ padding: 12, gap: 8 }}>
          <Text selectable>Ошибка базы данных: {error.message}</Text>
          <Button title="Переподключиться" disabled={isLoading} onPress={retry} />
        </SafeAreaView>
      )}
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#fff' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="marker/[id]" options={{ title: 'Маркер' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Страница не найдена' }} />
      </Stack>
    </View>
  );
}

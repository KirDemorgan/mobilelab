import { router, type ErrorBoundaryProps } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useMarkers } from '../context/markers-context';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.message}>
      <Text>Не удалось открыть карту.</Text>
      <Button title="Повторить" onPress={retry} />
    </View>
  );
}

export default function MapScreen() {
  const { markers, addMarker } = useMarkers();
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (ready) return;
    const timeout = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(timeout);
  }, [ready, attempt]);

  function retryMap() {
    setReady(false);
    setTimedOut(false);
    setAttempt((current) => current + 1);
  }

  function openMarker(id: string) {
    try {
      router.push({ pathname: '/marker/[id]', params: { id } });
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть маркер. Попробуйте ещё раз.');
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        key={attempt}
        style={StyleSheet.absoluteFill}
        onLongPress={(event) => addMarker(event.nativeEvent.coordinate)}
        onMapReady={() => setReady(true)}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker}
            onPress={() => openMarker(marker.id)}
          />
        ))}
      </MapView>
      <View style={styles.message}>
        <Text>Удерживайте точку на карте, чтобы добавить маркер. Нажмите на маркер, чтобы открыть фотографии.</Text>
        {!ready && (timedOut ? (
          <>
            <Text>Карта долго загружается. Проверьте интернет и повторите попытку.</Text>
            <Button title="Повторить" onPress={retryMap} />
          </>
        ) : (
          <ActivityIndicator accessibilityLabel="Загрузка карты" />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  message: { padding: 12, gap: 8, backgroundColor: '#fff' },
});

import { router, type ErrorBoundaryProps } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useDatabase } from '../context/database-context';
import { useLocation } from '../context/location-context';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.message}>
      <Text>Не удалось открыть карту.</Text>
      <Button title="Повторить" onPress={retry} />
    </View>
  );
}

export default function MapScreen() {
  const { markers, addMarker, isLoading } = useDatabase();
  const { location, locationError, notificationError, retry } = useLocation();
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

  async function createMarker(coordinate: { latitude: number; longitude: number }) {
    if (isLoading) return;
    try {
      await addMarker(coordinate.latitude, coordinate.longitude);
    } catch {}
  }

  function openMarker(id: number) {
    try {
      router.push({ pathname: '/marker/[id]', params: { id: String(id) } });
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть маркер. Попробуйте ещё раз.');
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        key={attempt}
        style={StyleSheet.absoluteFill}
        onLongPress={(event) => void createMarker(event.nativeEvent.coordinate)}
        onMapReady={() => setReady(true)}
      >
        {location && (
          <Marker
            key="user-location"
            coordinate={location.coords}
            title="Вы здесь"
            pinColor="blue"
          />
        )}
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
        {locationError && <Text selectable>{locationError}</Text>}
        {notificationError && <Text selectable>{notificationError}</Text>}
        {(locationError || notificationError) && <Button title="Повторить GPS и уведомления" onPress={retry} />}
        {isLoading && <ActivityIndicator accessibilityLabel="Сохранение данных" />}
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

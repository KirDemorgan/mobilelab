import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImageItem } from '../../components/image-item';
import { useDatabase } from '../../context/database-context';
import type { MarkerRouteParams } from '../../types';

export default function MarkerScreen() {
  const { id } = useLocalSearchParams<MarkerRouteParams>();
  const { markers, addImage, deleteImage, deleteMarker, isLoading } = useDatabase();
  const [picking, setPicking] = useState(false);
  const insets = useSafeAreaInsets();
  const marker = markers.find((item) => String(item.id) === id);

  async function pickImage() {
    if (!marker || picking || isLoading) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
      if (!result.canceled) {
        await addImage(marker.id, result.assets[0].uri);
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось выбрать или сохранить изображение. Попробуйте ещё раз.');
    } finally {
      setPicking(false);
    }
  }

  async function removeImage(imageId: number) {
    try {
      await deleteImage(imageId);
    } catch {}
  }

  async function removeMarker() {
    if (!marker) return;
    try {
      await deleteMarker(marker.id);
      router.replace('/');
    } catch {}
  }

  if (!marker) {
    return (
      <View style={styles.content}>
        <Text>Маркер не найден.</Text>
        <Button title="На карту" onPress={() => router.replace('/')} />
      </View>
    );
  }

  return (
    <FlatList
      data={marker.images}
      keyExtractor={(image) => String(image.id)}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      ListHeaderComponent={
        <View style={styles.content}>
          <Text selectable>Широта: {marker.latitude.toFixed(6)}</Text>
          <Text selectable>Долгота: {marker.longitude.toFixed(6)}</Text>
          <Button
            title={picking ? 'Открытие галереи…' : 'Добавить изображение'}
            onPress={pickImage}
            disabled={picking || isLoading}
          />
          <Button
            title="Удалить маркер"
            color="#b00020"
            disabled={picking || isLoading}
            onPress={() => Alert.alert('Удалить маркер?', 'Его изображения также будут удалены из приложения.', [
              { text: 'Отмена', style: 'cancel' },
              { text: 'Удалить', style: 'destructive', onPress: () => void removeMarker() },
            ])}
          />
        </View>
      }
      ListEmptyComponent={<Text>Изображений пока нет.</Text>}
      renderItem={({ item }) => (
        <ImageItem image={item} disabled={isLoading || picking} onRemove={() => void removeImage(item.id)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
});

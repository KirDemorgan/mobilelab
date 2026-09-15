import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImageItem } from '../../components/image-item';
import { useMarkers } from '../../context/markers-context';
import type { MarkerRouteParams } from '../../types';

export default function MarkerScreen() {
  const { id } = useLocalSearchParams<MarkerRouteParams>();
  const { markers, addImage, removeImage } = useMarkers();
  const [picking, setPicking] = useState(false);
  const insets = useSafeAreaInsets();
  const marker = markers.find((item) => item.id === id);

  async function pickImage() {
    if (!marker || picking) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
      if (!result.canceled) {
        addImage(marker.id, result.assets[0].uri);
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось выбрать изображение. Попробуйте ещё раз.');
    } finally {
      setPicking(false);
    }
  }

  if (!marker) {
    return (
      <View style={styles.content}>
        <Text>Маркер не найден. Возможно, приложение было перезапущено.</Text>
        <Button title="На карту" onPress={() => router.replace('/')} />
      </View>
    );
  }

  return (
    <FlatList
      data={marker.images}
      keyExtractor={(image) => image.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      ListHeaderComponent={
        <View style={styles.content}>
          <Text selectable>Широта: {marker.latitude.toFixed(6)}</Text>
          <Text selectable>Долгота: {marker.longitude.toFixed(6)}</Text>
          <Button
            title={picking ? 'Открытие галереи…' : 'Добавить изображение'}
            onPress={pickImage}
            disabled={picking}
          />
        </View>
      }
      ListEmptyComponent={<Text>Изображений пока нет.</Text>}
      renderItem={({ item }) => (
        <ImageItem image={item} onRemove={() => removeImage(marker.id, item.id)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
});

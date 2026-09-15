import { useState } from 'react';
import { Button, Image, Text, View } from 'react-native';

import type { MarkerImage } from '../types';

interface ImageItemProps {
  image: MarkerImage;
  onRemove: () => void;
}

export function ImageItem({ image, onRemove }: ImageItemProps) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={{ gap: 8 }}>
      {failed ? <Text>Не удалось загрузить изображение.</Text> : (
        <Image
          source={{ uri: image.uri }}
          style={{ width: '100%', height: 220 }}
          resizeMode="contain"
          accessibilityLabel="Изображение маркера"
          onError={() => setFailed(true)}
        />
      )}
      <Button title="Удалить изображение" color="#b00020" onPress={onRemove} />
    </View>
  );
}

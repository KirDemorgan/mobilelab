import { useState } from 'react';
import { Button, Image, Text, View } from 'react-native';

import type { MarkerImage } from '../types';
import { imageFile } from '../database/image-files';

interface ImageItemProps {
  image: MarkerImage;
  onRemove: () => void;
  disabled?: boolean;
}

export function ImageItem({ image, onRemove, disabled }: ImageItemProps) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={{ gap: 8 }}>
      {failed ? <Text>Не удалось загрузить изображение.</Text> : (
        <Image
          source={{ uri: imageFile(image.uri).uri }}
          style={{ width: '100%', height: 220 }}
          resizeMode="contain"
          accessibilityLabel="Изображение маркера"
          onError={() => setFailed(true)}
        />
      )}
      <Button title="Удалить изображение" color="#b00020" disabled={disabled} onPress={onRemove} />
    </View>
  );
}

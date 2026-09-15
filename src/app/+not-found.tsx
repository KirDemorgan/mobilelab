import { router } from 'expo-router';
import { Button, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text>Такой страницы нет.</Text>
      <Button title="На карту" onPress={() => router.replace('/')} />
    </View>
  );
}

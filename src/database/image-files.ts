import { Directory, File, Paths } from 'expo-file-system';

export function imageFile(uri: string) {
  return new File(Paths.document, 'marker-images', uri);
}

export async function saveImageFile(uri: string) {
  const directory = new Directory(Paths.document, 'marker-images');
  directory.create({ idempotent: true, intermediates: true });
  const source = new File(uri);
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${source.extension}`;
  try {
    await source.copy(imageFile(name));
  } catch (error) {
    deleteImageFile(name);
    throw error;
  }
  return name;
}

export function deleteImageFile(uri: string) {
  try {
    const file = imageFile(uri);
    if (file.exists) file.delete();
  } catch (error) {
    if (__DEV__) console.warn('Не удалось удалить копию изображения', error);
  }
}

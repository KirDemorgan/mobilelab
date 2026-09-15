import type { SQLiteDatabase } from 'expo-sqlite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';

import { markers, markerImages } from './schema';
import type { MapMarker } from '../types';

export async function getMarkers(db: SQLiteDatabase): Promise<MapMarker[]> {
  const orm = drizzle(db);

  const rows = orm
    .select()
    .from(markers)
    .orderBy(markers.id)
    .all();

  const images = orm
    .select()
    .from(markerImages)
    .orderBy(markerImages.id)
    .all();

  return rows.map((marker) => ({
    ...marker,
    images: images.filter((image) => image.marker_id === marker.id),
  }));
}

export async function getMarkerImages(db: SQLiteDatabase, markerId: number) {
  return drizzle(db)
    .select()
    .from(markerImages)
    .where(eq(markerImages.marker_id, markerId))
    .orderBy(markerImages.id).all();
}

export async function addMarker(db: SQLiteDatabase, latitude: number, longitude: number) {
  const result = drizzle(db)
    .insert(markers)
    .values({ latitude, longitude })
    .run();
  return result.lastInsertRowId;
}

export async function deleteMarker(db: SQLiteDatabase, id: number) {
  drizzle(db)
    .delete(markers)
    .where(eq(markers.id, id))
    .run();
}

export async function addImage(db: SQLiteDatabase, markerId: number, uri: string) {
  drizzle(db)
    .insert(markerImages)
    .values({ marker_id: markerId, uri })
    .run();
}

export async function deleteImage(db: SQLiteDatabase, id: number) {
  drizzle(db)
    .delete(markerImages)
    .where(eq(markerImages.id, id))
    .run();
}

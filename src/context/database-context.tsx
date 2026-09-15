import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';

import * as operations from '../database/operations';
import { deleteImageFile, saveImageFile } from '../database/image-files';
import { initDatabase } from '../database/schema';
import type { MapMarker, MarkerImage } from '../types';

interface DatabaseContextValue {
  markers: MapMarker[];
  addMarker: (latitude: number, longitude: number) => Promise<number>;
  deleteMarker: (id: number) => Promise<void>;
  getMarkers: () => Promise<MapMarker[]>;
  addImage: (markerId: number, uri: string) => Promise<void>;
  deleteImage: (id: number) => Promise<void>;
  getMarkerImages: (markerId: number) => Promise<MarkerImage[]>;
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
  retry: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const database = useRef<SQLiteDatabase | null>(null);
  const pending = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    let active = true;
    let connection: SQLiteDatabase | null = null;
    setIsLoading(true);
    setIsReady(false);
    setError(null);

    const initialization = (async () => {
      try {
        connection = await openDatabaseAsync('markers.db', { useNewConnection: true });
        await initDatabase(connection);
        const savedMarkers = await operations.getMarkers(connection);
        if (active) {
          database.current = connection;
          setMarkers(savedMarkers);
          setIsReady(true);
          if (__DEV__) console.log('[SQLite] База открыта');
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause : new Error(String(cause)));
        if (__DEV__) console.error('[SQLite] Ошибка инициализации', cause);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      database.current = null;
      const operation = pending.current;
      void Promise.allSettled([initialization, operation]).then(async () => {
        await connection?.closeAsync();
      }).catch((cause) => {
        if (__DEV__) console.error('[SQLite] Ошибка закрытия', cause);
      });
    };
  }, [attempt]);

  async function run<T>(name: string, operation: (db: SQLiteDatabase) => Promise<T>, write = false): Promise<T> {
    const db = database.current;
    if (!db) throw new Error('База данных не подключена. Повторите подключение.');
    if (pending.current) throw new Error('Дождитесь завершения предыдущей операции.');
    setIsLoading(true);
    setError(null);

    const task = (async () => {
      if (!write) return operation(db);
      let result!: T;
      let updatedMarkers: MapMarker[] = [];
      
      await db.withTransactionAsync(async () => {
        result = await operation(db);
        updatedMarkers = await operations.getMarkers(db);
      });
      if (database.current === db) setMarkers(updatedMarkers);
      return result;
    })();
    pending.current = task;

    try {
      const result = await task;
      if (__DEV__) console.log(`[SQLite] ${name}`);
      return result;
    } catch (cause) {
      const failure = cause instanceof Error ? cause : new Error(String(cause));
      if (database.current === db) setError(failure);
      if (__DEV__) console.error(`[SQLite] ${name}`, failure);
      throw failure;
    } finally {
      pending.current = null;
      if (database.current === db) setIsLoading(false);
    }
  }

  async function addImage(markerId: number, uri: string) {
    let savedUri: string | undefined;
    try {
      await run('Добавление изображения', async (db) => {
        savedUri = await saveImageFile(uri);
        await operations.addImage(db, markerId, savedUri);
      }, true);
    } catch (cause) {
      if (savedUri) deleteImageFile(savedUri);
      throw cause;
    }
  }

  async function deleteMarker(id: number) {
    const images = markers.find((marker) => marker.id === id)?.images ?? [];
    await run('Удаление маркера', (db) => operations.deleteMarker(db, id), true);
    images.forEach((image) => deleteImageFile(image.uri));
  }

  async function deleteImage(id: number) {
    const image = markers.flatMap((marker) => marker.images).find((item) => item.id === id);
    await run('Удаление изображения', (db) => operations.deleteImage(db, id), true);
    if (image) deleteImageFile(image.uri);
  }

  return (
    <DatabaseContext value={{
      markers, isLoading, isReady, error,
      addMarker: (latitude, longitude) => run('Добавление маркера', (db) => operations.addMarker(db, latitude, longitude), true),
      deleteMarker,
      getMarkers: () => run('Чтение маркеров', operations.getMarkers),
      addImage,
      deleteImage,
      getMarkerImages: (id) => run('Чтение изображений', (db) => operations.getMarkerImages(db, id)),
      retry: () => { if (!isLoading && !pending.current) setAttempt((current) => current + 1); },
    }}>
      {children}
    </DatabaseContext>
  );
}

export function useDatabase() {
  const context = use(DatabaseContext);
  if (!context) throw new Error('useDatabase must be used within DatabaseProvider');
  return context;
}

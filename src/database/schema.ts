import type { SQLiteDatabase } from 'expo-sqlite';
import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const markers = sqliteTable('markers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const markerImages = sqliteTable('marker_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  marker_id: integer('marker_id').notNull().references(() => markers.id, { onDelete: 'cascade' }),
  uri: text('uri').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');

  if (version && version.user_version > 1) {
    throw new Error('Версия базы новее приложения. Обновите приложение.');
  }

  if (!version || version.user_version === 0) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE markers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE marker_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          marker_id INTEGER NOT NULL,
          uri TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (marker_id) REFERENCES markers (id) ON DELETE CASCADE
        );
        PRAGMA user_version = 1;
      `);
    });
  }
}

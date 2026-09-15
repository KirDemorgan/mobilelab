import type { markers, markerImages } from './database/schema';

export type MarkerImage = typeof markerImages.$inferSelect;
type MarkerRow = typeof markers.$inferSelect;

export interface MapMarker extends MarkerRow {
  images: MarkerImage[];
}

export interface MarkerRouteParams extends Record<string, string> {
  id: string;
}

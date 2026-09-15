import { createContext, use, useRef, useState, type ReactNode } from 'react';

import type { MapMarker } from '../types';

interface MarkersContextValue {
  markers: MapMarker[];
  addMarker: (coordinate: { latitude: number; longitude: number }) => void;
  addImage: (markerId: string, uri: string) => void;
  removeImage: (markerId: string, imageId: string) => void;
}

const MarkersContext = createContext<MarkersContextValue | null>(null);

export function MarkersProvider({ children }: { children: ReactNode }) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const nextId = useRef(1);

  function addMarker(coordinate: { latitude: number; longitude: number }) {
    const marker: MapMarker = {
      id: String(nextId.current++),
      ...coordinate,
      images: [],
    };
    setMarkers((current) => [...current, marker]);
  }

  function addImage(markerId: string, uri: string) {
    const image = { id: String(nextId.current++), uri };
    setMarkers((current) => current.map((marker) =>
      marker.id === markerId
        ? { ...marker, images: [...marker.images, image] }
        : marker,
    ));
  }

  function removeImage(markerId: string, imageId: string) {
    setMarkers((current) => current.map((marker) =>
      marker.id === markerId
        ? { ...marker, images: marker.images.filter((image) => image.id !== imageId) }
        : marker,
    ));
  }

  return (
    <MarkersContext value={{ markers, addMarker, addImage, removeImage }}>
      {children}
    </MarkersContext>
  );
}

export function useMarkers() {
  const context = use(MarkersContext);
  if (!context) {
    throw new Error('useMarkers must be used within MarkersProvider');
  }
  return context;
}

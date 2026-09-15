export interface MarkerImage {
  id: string;
  uri: string;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  images: MarkerImage[];
}

export interface MarkerRouteParams extends Record<string, string> {
  id: string;
}

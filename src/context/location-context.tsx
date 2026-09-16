import * as Location from 'expo-location';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from './database-context';
import { proximityMonitor, requestNotificationPermissions } from '../services/notifications';

interface LocationState {
  location: Location.LocationObject | null;
  locationError: string | null;
  notificationError: string | null;
  retry: () => void;
}

const LocationContext = createContext<LocationState | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { markers, isReady } = useDatabase();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [attempt, setAttempt] = useState(0);
  const active = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      active.current = false;
      setLocation(null);
      setAppState(state);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isReady || appState !== 'active') return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;
    active.current = true;
    setLocation(null);
    setNotificationsAllowed(false);
    setLocationError(null);
    setNotificationError(null);

    async function setup() {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted && permission.canAskAgain) {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (cancelled) return;
        if (!permission.granted) {
          throw new Error('Доступ к местоположению запрещён. Разрешите его в настройках устройства.');
        }
        if (!await Location.hasServicesEnabledAsync()) {
          throw new Error('Службы геолокации выключены. Включите их в настройках устройства.');
        }
        if (cancelled) return;
        subscription = await Location.watchPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 5,
        }, (position) => {
          if (cancelled || !active.current) return;
          setLocation(position);
          setLocationError(null);
        }, (message) => {
          if (cancelled) return;
          setLocation(null);
          setLocationError(`Ошибка геолокации: ${message}`);
        });
        if (cancelled) subscription.remove();
      } catch (error) {
        if (!cancelled) setLocationError(error instanceof Error ? error.message : 'Не удалось определить местоположение.');
      }
      if (cancelled) return;
      try {
        await requestNotificationPermissions();
        if (!cancelled) setNotificationsAllowed(true);
      } catch (error) {
        if (!cancelled) setNotificationError(error instanceof Error ? error.message : 'Не удалось настроить уведомления.');
      }
    }
    void setup();
    return () => {
      cancelled = true;
      active.current = false;
      subscription?.remove();
    };
  }, [appState, attempt, isReady]);

  useEffect(() => {
    if (!isReady) return;
    const current = ++generation.current;
    void proximityMonitor.update(location?.coords ?? null, markers,
      () => active.current && notificationsAllowed && current === generation.current,
    ).then(() => {
      if (current === generation.current && notificationsAllowed) setNotificationError(null);
    }).catch((error: Error) => {
      if (current === generation.current) setNotificationError(error.message);
    });
    return () => { generation.current++; };
  }, [location, markers, notificationsAllowed, isReady]);

  return (
    <LocationContext value={{ location, locationError, notificationError, retry: () => setAttempt((value) => value + 1) }}>
      {children}
    </LocationContext>
  );
}

export function useLocation() {
  const context = use(LocationContext);
  if (!context) throw new Error('LocationProvider отсутствует.');
  return context;
}

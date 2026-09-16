export const PROXIMITY_THRESHOLD = 100;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const radians = Math.PI / 180;
  const latitude = (to.latitude - from.latitude) * radians;
  const longitude = (to.longitude - from.longitude) * radians;
  const a = Math.sin(latitude / 2) ** 2
    + Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians)
    * Math.sin(longitude / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

interface NotificationAdapter {
  show(markerId: number): Promise<string>;
  remove(notificationId: string): Promise<void>;
}

export class ProximityMonitor {
  private activeNotifications = new Map<number, string>();
  private queue: Promise<void> = Promise.resolve();

  constructor(private notifications: NotificationAdapter) {}

  update(
    location: Coordinates | null,
    markers: (Coordinates & { id: number })[],
    canNotify: () => boolean,
  ): Promise<void> {
    const operation = this.queue.then(async () => {
      const nearby = new Set(markers.filter((marker) => location
        && calculateDistance(location, marker) <= PROXIMITY_THRESHOLD).map((marker) => marker.id));
      const existing = new Set(markers.map((marker) => marker.id));
      const errors: unknown[] = [];

      for (const [markerId, notificationId] of this.activeNotifications) {
        if (!existing.has(markerId) || (location && !nearby.has(markerId))) {
          try {
            await this.notifications.remove(notificationId);
            this.activeNotifications.delete(markerId);
          } catch (error) { errors.push(error); }
        }
      }

      for (const markerId of nearby) {
        if (!canNotify()) break;
        if (this.activeNotifications.has(markerId)) continue;
        try {
          const notificationId = await this.notifications.show(markerId);
          this.activeNotifications.set(markerId, notificationId);
        } catch (error) { errors.push(error); }
      }
      if (errors.length) throw new Error('Не удалось отправить или убрать уведомление. Повторите попытку.');
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}

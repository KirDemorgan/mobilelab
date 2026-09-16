import * as Notifications from 'expo-notifications';

import { ProximityMonitor } from './proximity';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let startupCleanup: Promise<void> | undefined;

function clearPreviousSessionNotifications() {
  startupCleanup ??= (async () => {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    for (const notification of notifications) {
      if (notification.request.identifier.startsWith('marker-proximity-')) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }
  })().catch((error) => {
    startupCleanup = undefined;
    throw error;
  });
  return startupCleanup;
}

export async function requestNotificationPermissions(): Promise<void> {
  await clearPreviousSessionNotifications();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
  }
  if (!permission.granted
    && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
    throw new Error('Уведомления запрещены. Разрешите их в настройках устройства.');
  }
}

export const proximityMonitor = new ProximityMonitor({
  show: (markerId) => Notifications.scheduleNotificationAsync({
    identifier: `marker-proximity-${markerId}`,
    content: {
      title: 'Вы рядом с меткой!',
      body: `Сохранённая метка №${markerId} находится в пределах 100 метров.`,
    },
    trigger: null,
  }),
  remove: async (notificationId) => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await Notifications.dismissNotificationAsync(notificationId);
  },
});

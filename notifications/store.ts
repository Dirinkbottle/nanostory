const seenNotificationIds = new Set<number>();

export function hasSeenNotification(id: number): boolean {
  return seenNotificationIds.has(id);
}

export function markNotificationSeen(id: number) {
  seenNotificationIds.add(id);
}

export function resetNotificationStore() {
  seenNotificationIds.clear();
}

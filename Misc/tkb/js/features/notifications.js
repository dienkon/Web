/**
 * Notifications & Reminders Feature
 */

export class NotificationsFeature {
  constructor(store) {
    this.store = store;
  }

  async requestPermission() {
    if (!("Notification" in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === "granted";
  }

  send(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "logo.png",
      });
    }
  }
}

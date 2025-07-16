import { auth } from '$lib/firebase/auth';
import {
  subscribeToNotifications,
  subscribeToUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotifications
} from '$lib/firebase/notifications';
import type { Notification } from '$lib/firebase/types';
import type { Unsubscribe } from 'firebase/firestore';
import { showNotificationToast } from '$lib/utils/notification-toast';

class NotificationsStore {
  notifications = $state<Notification[]>([]);
  unreadCount = $state<number>(0);
  loading = $state<boolean>(false);
  error = $state<string | null>(null);
  
  private unsubscribeNotifications?: Unsubscribe;
  private unsubscribeCount?: Unsubscribe;
  private currentUserId?: string;

  async initialize() {
    const user = auth.currentUser;
    if (!user) {
      this.cleanup();
      return;
    }

    if (this.currentUserId === user.uid) {
      return; // Already initialized for this user
    }

    this.currentUserId = user.uid;
    this.loading = true;
    this.error = null;

    try {
      // Load initial notifications
      const initialNotifications = await getNotifications(user.uid, 20);
      this.notifications = initialNotifications;

      // Subscribe to real-time updates
      this.unsubscribeNotifications = subscribeToNotifications(
        user.uid,
        (notifications) => {
          // Check for new notifications to show as toast
          const newNotifications = notifications.filter(n => 
            !n.read && 
            !this.notifications.find(existing => existing.id === n.id)
          );
          
          // Show toast for new notifications
          newNotifications.forEach(n => showNotificationToast(n));
          
          this.notifications = notifications;
        }
      );

      this.unsubscribeCount = subscribeToUnreadCount(
        user.uid,
        (count) => {
          this.unreadCount = count;
        }
      );
    } catch (error) {
      console.error('Error initializing notifications:', error);
      this.error = 'Failed to load notifications';
    } finally {
      this.loading = false;
    }
  }

  async markNotificationAsRead(notificationId: string) {
    try {
      await markAsRead(notificationId);
      // Update local state immediately for better UX
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      this.error = 'Failed to mark notification as read';
    }
  }

  async markAllNotificationsAsRead() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await markAllAsRead(user.uid);
      // Update local state immediately
      this.notifications = this.notifications.map(n => ({ ...n, read: true }));
      this.unreadCount = 0;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      this.error = 'Failed to mark all notifications as read';
    }
  }

  async loadMore() {
    if (this.loading || this.notifications.length === 0) return;
    
    const user = auth.currentUser;
    if (!user) return;

    this.loading = true;
    try {
      const lastNotification = this.notifications[this.notifications.length - 1];
      const moreNotifications = await getNotifications(user.uid, 20, lastNotification);
      
      if (moreNotifications.length > 0) {
        this.notifications = [...this.notifications, ...moreNotifications];
      }
    } catch (error) {
      console.error('Error loading more notifications:', error);
      this.error = 'Failed to load more notifications';
    } finally {
      this.loading = false;
    }
  }

  getNotificationsByType(type: Notification['type']) {
    return this.notifications.filter(n => n.type === type);
  }

  getUnreadNotifications() {
    return this.notifications.filter(n => !n.read);
  }

  cleanup() {
    this.unsubscribeNotifications?.();
    this.unsubscribeCount?.();
    this.notifications = [];
    this.unreadCount = 0;
    this.currentUserId = undefined;
    this.error = null;
  }
}

export const notificationsStore = new NotificationsStore();
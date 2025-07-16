import { auth } from '$lib/firebase/auth';
import {
  subscribeToNotifications,
  subscribeToUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotifications,
  getPreferences,
  archiveNotification,
  archiveNotifications,
  archiveAllRead
} from '$lib/firebase/notifications';
import type { Notification, NotificationPreferences } from '$lib/firebase/types';
import type { Unsubscribe } from 'firebase/firestore';
import { showNotificationToast } from '$lib/utils/notification-toast';

class NotificationsStore {
  notifications = $state<Notification[]>([]);
  unreadCount = $state<number>(0);
  loading = $state<boolean>(false);
  error = $state<string | null>(null);
  preferences = $state<NotificationPreferences | null>(null);
  
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
      // Load user preferences (don't fail if missing)
      try {
        this.preferences = await getPreferences(user.uid);
      } catch (error) {
        console.log('No notification preferences found for user, using defaults');
        this.preferences = null;
      }
      
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
          
          // Show toast for new notifications with preferences
          newNotifications.forEach(n => showNotificationToast(n, this.preferences || undefined));
          
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
      // Don't show error to user for permission issues - this is expected for new users
      this.error = null;
      this.notifications = [];
      this.unreadCount = 0;
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

  async archiveNotification(notificationId: string) {
    try {
      await archiveNotification(notificationId);
      // Remove from local state
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
      // Update unread count if needed
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
      this.error = 'Failed to archive notification';
    }
  }

  async archiveNotifications(notificationIds: string[]) {
    try {
      await archiveNotifications(notificationIds);
      // Remove from local state
      this.notifications = this.notifications.filter(n => !notificationIds.includes(n.id!));
      // Update unread count
      const unreadArchived = notificationIds.filter(id => {
        const notification = this.notifications.find(n => n.id === id);
        return notification && !notification.read;
      }).length;
      this.unreadCount = Math.max(0, this.unreadCount - unreadArchived);
    } catch (error) {
      console.error('Error archiving notifications:', error);
      this.error = 'Failed to archive notifications';
    }
  }

  async archiveAllRead() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await archiveAllRead(user.uid);
      // Remove all read notifications from local state
      this.notifications = this.notifications.filter(n => !n.read);
    } catch (error) {
      console.error('Error archiving all read notifications:', error);
      this.error = 'Failed to archive all read notifications';
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
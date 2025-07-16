import {
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  onSnapshot,
  writeBatch,
  Timestamp,
  type Unsubscribe,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from './config';
import type { Notification, NotificationPreferences } from './types';

const NOTIFICATIONS_COLLECTION = 'notifications';
const PREFERENCES_COLLECTION = 'notificationPreferences';

// Create a new notification
export async function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<string> {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const notification: Omit<Notification, 'id'> = {
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: Timestamp.now() as any
    };

    const docRef = await addDoc(notificationsRef, notification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Get notifications for a user with pagination
export async function getNotifications(
  userId: string,
  limitCount: number = 20,
  lastDoc?: any
): Promise<Notification[]> {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    let q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
}

// Mark a single notification as read
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Mark all notifications as read for a user
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// Get unread notification count
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
}

// Update user notification preferences
export async function updatePreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const preferencesRef = doc(db, PREFERENCES_COLLECTION, userId);
    await setDoc(preferencesRef, {
      ...preferences,
      userId
    }, { merge: true });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
}

// Get user notification preferences
export async function getPreferences(userId: string): Promise<NotificationPreferences | null> {
  try {
    const preferencesRef = doc(db, PREFERENCES_COLLECTION, userId);
    const snapshot = await getDoc(preferencesRef);
    
    if (snapshot.exists()) {
      return snapshot.data() as NotificationPreferences;
    }
    
    // Return default preferences if none exist
    return {
      userId,
      email: true,
      emailFrequency: 'immediate',
      topicAssigned: true,
      newFeedback: true,
      roundClosed: true,
      consensusReached: true
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    throw error;
  }
}

// Real-time listener for new notifications
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(q, snapshot => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
    callback(notifications);
  });
}

// Real-time listener for unread count
export function subscribeToUnreadCount(
  userId: string,
  callback: (count: number) => void
): Unsubscribe {
  const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('read', '==', false)
  );

  return onSnapshot(q, snapshot => {
    callback(snapshot.size);
  });
}

// Batch create notifications for multiple users
export async function createBatchNotifications(
  userIds: string[],
  type: Notification['type'],
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);

    userIds.forEach(userId => {
      const newDocRef = doc(notificationsRef);
      const notification: Omit<Notification, 'id'> = {
        userId,
        type,
        title,
        message,
        data,
        read: false,
        createdAt: Timestamp.now() as any
      };
      batch.set(newDocRef, notification);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error creating batch notifications:', error);
    throw error;
  }
}

// Delete old notifications (for cleanup)
export async function deleteOldNotifications(userId: string, daysOld: number = 30): Promise<void> {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('createdAt', '<', Timestamp.fromDate(cutoffDate))
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error deleting old notifications:', error);
    throw error;
  }
}
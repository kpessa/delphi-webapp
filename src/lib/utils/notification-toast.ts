import { toast } from 'svelte-sonner';
import type { Notification, NotificationPreferences } from '$lib/firebase/types';

// Notification sound (using Web Audio API for better control)
let audioContext: AudioContext | null = null;

function playNotificationSound(volume: number = 50) {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set volume (0-100 to 0-1)
    gainNode.gain.value = volume / 100 * 0.3; // Max 30% volume for notifications
    
    // Create a pleasant notification sound
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume / 100 * 0.3, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
    
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

export function showNotificationToast(
  notification: Notification, 
  preferences?: NotificationPreferences
) {
  const iconMap = {
    topic_assigned: '👤',
    new_feedback: '💬',
    round_closed: '🔒',
    consensus_reached: '✅',
    invitation: '📧'
  };

  const icon = iconMap[notification.type] || '🔔';

  // Play sound if enabled
  if (preferences?.soundEnabled) {
    playNotificationSound(preferences.soundVolume || 50);
  }
  
  // Show browser notification if enabled
  if (preferences?.browserNotifications && 
      typeof window !== 'undefined' && 
      'Notification' in window && 
      Notification.permission === 'granted') {
    try {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.png', // You may want to update this path
        tag: notification.id, // Prevent duplicate notifications
        requireInteraction: false
      });
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  // Show toast notification
  toast(notification.title, {
    description: notification.message,
    action: notification.data?.topicId || notification.data?.panelId ? {
      label: 'View',
      onClick: () => {
        if (notification.data?.topicId) {
          window.location.href = `/topics/${notification.data.topicId}`;
        } else if (notification.data?.panelId) {
          window.location.href = `/panels/${notification.data.panelId}`;
        }
      }
    } : undefined,
    duration: 5000
  });
}
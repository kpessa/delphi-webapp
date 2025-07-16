import { toast } from 'svelte-sonner';
import type { Notification } from '$lib/firebase/types';

export function showNotificationToast(notification: Notification) {
  const iconMap = {
    topic_assigned: '👤',
    new_feedback: '💬',
    round_closed: '🔒',
    consensus_reached: '✅',
    invitation: '📧'
  };

  const icon = iconMap[notification.type] || '🔔';

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
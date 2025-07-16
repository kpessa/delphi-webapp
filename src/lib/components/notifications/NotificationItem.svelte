<script lang="ts">
  import type { Notification } from '$lib/firebase/types';
  import { 
    MessageSquare, 
    UserPlus, 
    CheckCircle, 
    XCircle, 
    Bell,
    Clock
  } from 'lucide-svelte';
  import { formatDistanceToNow } from 'date-fns';
  
  interface Props {
    notification: Notification;
    onclick?: () => void;
  }
  
  let { notification, onclick }: Props = $props();
  
  const iconMap = {
    topic_assigned: UserPlus,
    new_feedback: MessageSquare,
    round_closed: XCircle,
    consensus_reached: CheckCircle,
    invitation: Bell
  };
  
  const colorMap = {
    topic_assigned: 'text-blue-600 dark:text-blue-400',
    new_feedback: 'text-green-600 dark:text-green-400',
    round_closed: 'text-orange-600 dark:text-orange-400',
    consensus_reached: 'text-purple-600 dark:text-purple-400',
    invitation: 'text-indigo-600 dark:text-indigo-400'
  };
  
  const Icon = iconMap[notification.type] || Bell;
  const iconColor = colorMap[notification.type] || 'text-gray-600 dark:text-gray-400';
  
  function getRelativeTime() {
    try {
      const date = notification.createdAt instanceof Date 
        ? notification.createdAt 
        : (notification.createdAt as any).toDate();
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'recently';
    }
  }
  
  function handleClick() {
    if (onclick) {
      onclick();
    }
    
    // Navigate based on notification type and data
    if (notification.data) {
      if (notification.data.topicId) {
        window.location.href = `/topics/${notification.data.topicId}`;
      } else if (notification.data.panelId) {
        window.location.href = `/panels/${notification.data.panelId}`;
      }
    }
  }
</script>

<button
  onclick={handleClick}
  class="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left flex gap-3 {notification.read ? 'opacity-75' : ''}"
>
  <div class="flex-shrink-0 mt-1">
    <div class="{iconColor} {!notification.read ? 'relative' : ''}">
      <Icon class="h-5 w-5" />
      {#if !notification.read}
        <span class="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full"></span>
      {/if}
    </div>
  </div>
  
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 {!notification.read ? 'font-semibold' : ''}">
      {notification.title}
    </p>
    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
      {notification.message}
    </p>
    <p class="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
      <Clock class="h-3 w-3" />
      {getRelativeTime()}
    </p>
  </div>
</button>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
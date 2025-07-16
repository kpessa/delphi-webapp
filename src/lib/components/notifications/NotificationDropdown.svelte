<script lang="ts">
  import { notificationsStore } from '$lib/stores/notifications.svelte';
  import NotificationItem from './NotificationItem.svelte';
  import { Check, Bell } from 'lucide-svelte';
  import { fly } from 'svelte/transition';
  
  interface Props {
    onclose: () => void;
  }
  
  let { onclose }: Props = $props();
  
  const unreadNotifications = $derived(notificationsStore.getUnreadNotifications());
  const recentNotifications = $derived(notificationsStore.notifications.slice(0, 5));
  
  async function handleMarkAllAsRead() {
    await notificationsStore.markAllNotificationsAsRead();
  }
</script>

<div
  transition:fly={{ y: -10, duration: 200 }}
  class="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
>
  <div class="p-4 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Notifications
      </h3>
      {#if unreadNotifications.length > 0}
        <button
          onclick={handleMarkAllAsRead}
          class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
        >
          <Check class="h-4 w-4" />
          Mark all as read
        </button>
      {/if}
    </div>
  </div>
  
  <div class="max-h-96 overflow-y-auto">
    {#if notificationsStore.loading}
      <div class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
      </div>
    {:else if recentNotifications.length === 0}
      <div class="p-8 text-center">
        <Bell class="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p class="text-gray-500 dark:text-gray-400">No notifications yet</p>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">
          We'll notify you when something important happens
        </p>
      </div>
    {:else}
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        {#each recentNotifications as notification (notification.id)}
          <NotificationItem 
            {notification} 
            onclick={() => {
              notificationsStore.markNotificationAsRead(notification.id!);
              onclose();
            }}
          />
        {/each}
      </div>
    {/if}
  </div>
  
  {#if recentNotifications.length > 0}
    <div class="p-3 border-t border-gray-200 dark:border-gray-700">
      <a
        href="/notifications"
        onclick={onclose}
        class="block text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
      >
        View all notifications
      </a>
    </div>
  {/if}
</div>
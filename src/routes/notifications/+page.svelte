<script lang="ts">
  import { notificationsStore } from '$lib/stores/notifications.svelte';
  import NotificationItem from '$lib/components/notifications/NotificationItem.svelte';
  import { onMount } from 'svelte';
  import { Bell, Filter, Search, Check, Trash2 } from 'lucide-svelte';
  import type { NotificationType } from '$lib/firebase/types';

  let searchQuery = $state('');
  let selectedType = $state<NotificationType | 'all'>('all');
  let selectedNotifications = $state<Set<string>>(new Set());
  
  const notificationTypes: { value: NotificationType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'topic_assigned', label: 'Topic Assigned' },
    { value: 'new_feedback', label: 'New Feedback' },
    { value: 'round_closed', label: 'Round Closed' },
    { value: 'consensus_reached', label: 'Consensus Reached' },
    { value: 'invitation', label: 'Invitations' }
  ];
  
  const filteredNotifications = $derived(() => {
    let notifications = notificationsStore.notifications;
    
    // Filter by type
    if (selectedType !== 'all') {
      notifications = notifications.filter(n => n.type === selectedType);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      notifications = notifications.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }
    
    return notifications;
  });
  
  onMount(() => {
    notificationsStore.initialize();
    
    return () => {
      notificationsStore.cleanup();
    };
  });
  
  function toggleSelection(notificationId: string) {
    const newSelection = new Set(selectedNotifications);
    if (newSelection.has(notificationId)) {
      newSelection.delete(notificationId);
    } else {
      newSelection.add(notificationId);
    }
    selectedNotifications = newSelection;
  }
  
  function selectAll() {
    if (selectedNotifications.size === filteredNotifications().length) {
      selectedNotifications = new Set();
    } else {
      selectedNotifications = new Set(filteredNotifications().map(n => n.id!));
    }
  }
  
  async function markSelectedAsRead() {
    for (const id of selectedNotifications) {
      await notificationsStore.markNotificationAsRead(id);
    }
    selectedNotifications = new Set();
  }
  
  async function loadMore() {
    await notificationsStore.loadMore();
  }
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
      Notifications
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      Stay updated with all your important activities
    </p>
  </div>
  
  <!-- Filters and Search -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            bind:value={searchQuery}
            type="text"
            placeholder="Search notifications..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <Filter class="h-5 w-5 text-gray-400" />
        <select
          bind:value={selectedType}
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
        >
          {#each notificationTypes as type}
            <option value={type.value}>{type.label}</option>
          {/each}
        </select>
      </div>
    </div>
    
    {#if selectedNotifications.size > 0}
      <div class="mt-4 flex items-center gap-4">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {selectedNotifications.size} selected
        </span>
        <button
          onclick={markSelectedAsRead}
          class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
        >
          <Check class="h-4 w-4" />
          Mark as read
        </button>
      </div>
    {/if}
  </div>
  
  <!-- Notifications List -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    {#if notificationsStore.loading && notificationsStore.notifications.length === 0}
      <div class="p-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
        <p class="mt-4 text-gray-500 dark:text-gray-400">Loading notifications...</p>
      </div>
    {:else if filteredNotifications().length === 0}
      <div class="p-12 text-center">
        <Bell class="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No notifications found
        </h3>
        <p class="text-gray-500 dark:text-gray-400">
          {searchQuery || selectedType !== 'all' 
            ? 'Try adjusting your filters' 
            : "You're all caught up!"}
        </p>
      </div>
    {:else}
      <!-- Select All -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedNotifications.size === filteredNotifications().length}
            onchange={selectAll}
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-600 dark:text-gray-400">Select all</span>
        </label>
      </div>
      
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        {#each filteredNotifications() as notification (notification.id)}
          <div class="flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div class="pl-4">
              <input
                type="checkbox"
                checked={selectedNotifications.has(notification.id!)}
                onchange={() => toggleSelection(notification.id!)}
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div class="flex-1">
              <NotificationItem 
                {notification}
                onclick={() => notificationsStore.markNotificationAsRead(notification.id!)}
              />
            </div>
          </div>
        {/each}
      </div>
      
      {#if notificationsStore.notifications.length >= 20}
        <div class="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onclick={loadMore}
            disabled={notificationsStore.loading}
            class="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors disabled:opacity-50"
          >
            {notificationsStore.loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>
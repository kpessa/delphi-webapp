<script lang="ts">
  import { notificationsStore } from '$lib/stores/notifications.svelte';
  import NotificationItem from '$lib/components/notifications/NotificationItem.svelte';
  import { onMount } from 'svelte';
  import { Bell, Filter, Search, Check, Archive, ArchiveX } from 'lucide-svelte';
  import type { NotificationType } from '$lib/firebase/types';
  import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  // Initialize from URL params
  const initialParams = new URLSearchParams($page.url.searchParams);
  let searchQuery = $state(initialParams.get('search') || '');
  let selectedType = $state<NotificationType | 'all'>(
    (initialParams.get('type') as NotificationType | 'all') || 'all'
  );
  let showUnreadOnly = $state(initialParams.get('unread') === 'true');
  let selectedNotifications = $state<Set<string>>(new Set());
  
  const notificationTypes: { value: NotificationType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'topic_assigned', label: 'Topic Assigned' },
    { value: 'new_feedback', label: 'New Feedback' },
    { value: 'round_closed', label: 'Round Closed' },
    { value: 'consensus_reached', label: 'Consensus Reached' },
    { value: 'invitation', label: 'Invitations' }
  ];
  
  // Update URL params when filters change
  function updateUrlParams() {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedType !== 'all') params.set('type', selectedType);
    if (showUnreadOnly) params.set('unread', 'true');
    
    const queryString = params.toString();
    goto(`/notifications${queryString ? `?${queryString}` : ''}`, { 
      replaceState: true,
      keepFocus: true,
      noScroll: true 
    });
  }
  
  // Watch for filter changes
  $effect(() => {
    searchQuery;
    selectedType;
    showUnreadOnly;
    updateUrlParams();
  });

  const filteredNotifications = $derived(() => {
    let notifications = notificationsStore.notifications;
    
    // Filter by read status
    if (showUnreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
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
  
  // Group notifications by date
  const groupedNotifications = $derived(() => {
    const groups: { label: string; notifications: typeof filteredNotifications }[] = [];
    const filtered = filteredNotifications();
    
    const today: typeof filtered = [];
    const yesterday: typeof filtered = [];
    const thisWeek: typeof filtered = [];
    const older: typeof filtered = [];
    
    filtered.forEach(notification => {
      const date = notification.createdAt instanceof Date 
        ? notification.createdAt 
        : (notification.createdAt as any).toDate();
        
      if (isToday(date)) {
        today.push(notification);
      } else if (isYesterday(date)) {
        yesterday.push(notification);
      } else if (isThisWeek(date, { weekStartsOn: 1 })) {
        thisWeek.push(notification);
      } else {
        older.push(notification);
      }
    });
    
    if (today.length > 0) groups.push({ label: 'Today', notifications: today });
    if (yesterday.length > 0) groups.push({ label: 'Yesterday', notifications: yesterday });
    if (thisWeek.length > 0) groups.push({ label: 'This Week', notifications: thisWeek });
    if (older.length > 0) groups.push({ label: 'Older', notifications: older });
    
    return groups;
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
  
  async function archiveSelected() {
    await notificationsStore.archiveNotifications(Array.from(selectedNotifications));
    selectedNotifications = new Set();
  }
  
  async function archiveAllRead() {
    await notificationsStore.archiveAllRead();
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
      
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={showUnreadOnly}
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-600 dark:text-gray-400">Unread only</span>
        </label>
        
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
        <button
          onclick={archiveSelected}
          class="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1"
        >
          <Archive class="h-4 w-4" />
          Archive
        </button>
      </div>
    {:else}
      <div class="mt-4 flex justify-end">
        <button
          onclick={archiveAllRead}
          class="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1"
        >
          <ArchiveX class="h-4 w-4" />
          Archive all read
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
      
      <div class="max-h-[600px] overflow-auto">
        {#each groupedNotifications() as group}
          <div class="border-b border-gray-200 dark:border-gray-700">
            <div class="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {group.label}
              </h3>
            </div>
            <div class="divide-y divide-gray-200 dark:divide-gray-700">
              {#each group.notifications as notification (notification.id)}
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
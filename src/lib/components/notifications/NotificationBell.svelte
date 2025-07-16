<script lang="ts">
  import { Bell } from 'lucide-svelte';
  import { notificationsStore } from '$lib/stores/notifications.svelte';
  import { onMount } from 'svelte';
  import NotificationDropdown from './NotificationDropdown.svelte';
  import { fade } from 'svelte/transition';

  let showDropdown = $state(false);
  let bellRef: HTMLButtonElement;
  
  onMount(() => {
    // Initialize notifications store when component mounts
    notificationsStore.initialize();
    
    // Cleanup on unmount
    return () => {
      notificationsStore.cleanup();
    };
  });

  function toggleDropdown() {
    showDropdown = !showDropdown;
  }

  function handleClickOutside(event: MouseEvent) {
    if (bellRef && !bellRef.contains(event.target as Node)) {
      showDropdown = false;
    }
  }

  $effect(() => {
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  });
</script>

<div class="relative">
  <button
    bind:this={bellRef}
    onclick={toggleDropdown}
    class="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
    aria-label="Notifications"
  >
    <Bell class="h-5 w-5" />
    {#if notificationsStore.unreadCount > 0}
      <span
        transition:fade={{ duration: 200 }}
        class="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium animate-pulse"
      >
        {notificationsStore.unreadCount > 99 ? '99+' : notificationsStore.unreadCount}
      </span>
    {/if}
  </button>

  {#if showDropdown}
    <NotificationDropdown onclose={() => showDropdown = false} />
  {/if}
</div>

<style>
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    70% {
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>
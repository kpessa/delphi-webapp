<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Bell, 
    Mail, 
    MessageSquare, 
    UserPlus, 
    CheckCircle, 
    XCircle,
    Save,
    TestTube,
    Volume2,
    Monitor
  } from 'lucide-svelte';
  import { getPreferences, updatePreferences, createNotification } from '$lib/firebase/notifications';
  import { auth } from '$lib/firebase/auth';
  import type { NotificationPreferences } from '$lib/firebase/types';
  import { toast } from 'svelte-sonner';

  let preferences = $state<NotificationPreferences | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  
  onMount(async () => {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    
    try {
      preferences = await getPreferences(user.uid);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      loading = false;
    }
  });
  
  async function savePreferences() {
    if (!preferences || !auth.currentUser) return;
    
    saving = true;
    try {
      await updatePreferences(auth.currentUser.uid, preferences);
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      saving = false;
    }
  }
  
  async function sendTestNotification() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      await createNotification(
        user.uid,
        'invitation',
        'Test Notification',
        'This is a test notification to verify your settings are working correctly.',
        { test: true }
      );
      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  }
</script>

<div class="container mx-auto px-4 py-8 max-w-3xl">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
      Notification Preferences
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      Manage how and when you receive notifications
    </p>
  </div>
  
  {#if loading}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
      <p class="mt-4 text-center text-gray-500 dark:text-gray-400">Loading preferences...</p>
    </div>
  {:else if preferences}
    <div class="space-y-6">
      <!-- Email Notifications -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-6">
          <Mail class="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Email Notifications
          </h2>
        </div>
        
        <div class="space-y-4">
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-gray-700 dark:text-gray-300">
              Enable email notifications
            </span>
            <input
              type="checkbox"
              bind:checked={preferences.email}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          
          {#if preferences.email}
            <div class="ml-0 mt-4 space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email frequency
              </label>
              <select
                bind:value={preferences.emailFrequency}
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="immediate">Immediate</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {#if preferences.emailFrequency === 'immediate'}
                  You'll receive emails as soon as events occur
                {:else if preferences.emailFrequency === 'daily'}
                  You'll receive a summary email once per day
                {:else}
                  You'll receive a summary email once per week
                {/if}
              </p>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Sound Notifications -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-6">
          <Volume2 class="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Sound Notifications
          </h2>
        </div>
        
        <div class="space-y-4">
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-gray-700 dark:text-gray-300">
              Enable notification sounds
            </span>
            <input
              type="checkbox"
              bind:checked={preferences.soundEnabled}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          
          {#if preferences.soundEnabled}
            <div class="ml-0 mt-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Volume ({preferences.soundVolume || 50}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                bind:value={preferences.soundVolume}
                class="w-full"
              />
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Browser Notifications -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-6">
          <Monitor class="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Browser Notifications
          </h2>
        </div>
        
        <div class="space-y-4">
          <label class="flex items-center justify-between cursor-pointer">
            <div>
              <p class="text-gray-700 dark:text-gray-300">
                Enable browser notifications
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Show desktop notifications when new events occur
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={preferences.browserNotifications}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          
          {#if preferences.browserNotifications && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default'}
            <button
              onclick={async () => {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                  toast.success('Browser notifications enabled');
                } else {
                  toast.error('Browser notifications were denied');
                  preferences.browserNotifications = false;
                }
              }}
              class="w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-md transition-colors"
            >
              Request browser permission
            </button>
          {/if}
        </div>
      </div>
      
      <!-- Notification Types -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-6">
          <Bell class="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Notification Types
          </h2>
        </div>
        
        <div class="space-y-4">
          <label class="flex items-center justify-between cursor-pointer">
            <div class="flex items-center gap-3">
              <UserPlus class="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p class="text-gray-700 dark:text-gray-300">Topic assigned</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  When you're assigned to a new topic
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              bind:checked={preferences.topicAssigned}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          
          <label class="flex items-center justify-between cursor-pointer">
            <div class="flex items-center gap-3">
              <MessageSquare class="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p class="text-gray-700 dark:text-gray-300">New feedback</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  When someone provides feedback on your topics
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              bind:checked={preferences.newFeedback}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          
          <label class="flex items-center justify-between cursor-pointer">
            <div class="flex items-center gap-3">
              <XCircle class="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <div>
                <p class="text-gray-700 dark:text-gray-300">Round closed</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  When a voting round is completed
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              bind:checked={preferences.roundClosed}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          
          <label class="flex items-center justify-between cursor-pointer">
            <div class="flex items-center gap-3">
              <CheckCircle class="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p class="text-gray-700 dark:text-gray-300">Consensus reached</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  When consensus is achieved on a topic
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              bind:checked={preferences.consensusReached}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>
      
      <!-- Test Notification -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-4">
          <TestTube class="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Test Notifications
          </h2>
        </div>
        
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Send yourself a test notification to verify your settings are working correctly.
        </p>
        
        <button
          onclick={sendTestNotification}
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
        >
          Send test notification
        </button>
      </div>
      
      <!-- Save Button -->
      <div class="flex justify-end">
        <button
          onclick={savePreferences}
          disabled={saving}
          class="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
        >
          <Save class="h-5 w-5" />
          {saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>
    </div>
  {/if}
</div>
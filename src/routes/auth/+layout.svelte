<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { subscribeToAuthState } from '$lib/firebase/auth';
	
	// Redirect authenticated users away from auth pages
	onMount(() => {
		if (browser) {
			const unsubscribe = subscribeToAuthState((user) => {
				if (user) {
					goto('/dashboard');
				}
			});
			
			return unsubscribe;
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<slot />
</div>
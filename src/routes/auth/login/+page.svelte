<script lang="ts">
	import Login from '$lib/components/auth/login.svelte';
	import { onMount } from 'svelte';
	import { handleRedirectResult } from '$lib/firebase/auth';
	import { goto } from '$app/navigation';
	
	// Handle redirect result from Microsoft/Google sign-in
	onMount(async () => {
		try {
			const result = await handleRedirectResult();
			if (result?.user) {
				// Successful redirect sign-in
				goto('/dashboard');
			}
		} catch (error) {
			console.error('Error handling redirect:', error);
		}
	});
</script>

<svelte:head>
	<title>Sign In - Delphi Healthcare Platform</title>
</svelte:head>

<Login />
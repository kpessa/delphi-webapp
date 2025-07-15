<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { checkIfSignInWithLink, completeMagicLinkSignIn, getStoredEmail, type AuthError } from '$lib/firebase/auth';
	import { Button } from '$lib/components/ui/button';
	
	let email = '';
	let storedEmail = '';
	let error = '';
	let loading = true;
	let needsEmail = false;
	let isValidLink = false;
	
	onMount(async () => {
		// Check if this is a valid sign-in link
		isValidLink = checkIfSignInWithLink();
		
		if (!isValidLink) {
			error = 'Invalid sign-in link. Please request a new one.';
			loading = false;
			return;
		}
		
		// Try to get email from localStorage
		storedEmail = getStoredEmail() || '';
		
		if (storedEmail) {
			// Auto-complete sign in with stored email
			await completeSignIn(storedEmail);
		} else {
			// Need user to provide email
			needsEmail = true;
			loading = false;
		}
	});
	
	async function completeSignIn(emailToUse: string) {
		loading = true;
		error = '';
		
		try {
			const result = await completeMagicLinkSignIn(emailToUse);
			if (result && result.user) {
				// Successful sign in - redirect to dashboard
				await goto('/dashboard');
			}
		} catch (err: any) {
			const authError = err as AuthError;
			error = authError.userFriendlyMessage || err.message || 'Failed to complete sign in';
			console.error('Complete sign in error:', authError);
			loading = false;
			
			// If error is about invalid link, allow requesting new one
			if (authError.code === 'auth/invalid-action-code' || 
			    authError.code === 'auth/expired-action-code') {
				isValidLink = false;
			}
		}
	}
	
	async function handleSubmit() {
		if (email) {
			await completeSignIn(email);
		}
	}
</script>

<div class="mx-auto max-w-sm space-y-6 p-4">
	<div class="space-y-2 text-center">
		<h1 class="text-3xl font-bold">Complete Sign In</h1>
		{#if loading && !needsEmail}
			<p class="text-gray-500">Signing you in...</p>
		{/if}
	</div>
	
	{#if error}
		<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">
			<p class="font-semibold mb-1">Error</p>
			<p>{error}</p>
		</div>
	{/if}
	
	{#if loading && !needsEmail}
		<div class="flex justify-center">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
		</div>
	{/if}
	
	{#if needsEmail && isValidLink}
		<div class="space-y-4">
			<div class="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
				<p>Please confirm your email address to complete sign in.</p>
				{#if storedEmail}
					<p class="mt-1">Not <strong>{storedEmail}</strong>? Enter your email below.</p>
				{/if}
			</div>
			
			<form on:submit|preventDefault={handleSubmit} class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium mb-1">Email address</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						disabled={loading}
						class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-gray-100"
						placeholder={storedEmail || "your.email@uhsinc.com"}
					/>
				</div>
				
				<Button 
					type="submit" 
					disabled={loading || !email} 
					class="w-full"
				>
					{loading ? 'Signing in...' : 'Complete sign in'}
				</Button>
			</form>
		</div>
	{/if}
	
	{#if !isValidLink}
		<div class="space-y-4">
			<div class="text-center">
				<p class="text-gray-600 mb-4">This sign-in link is invalid or has expired.</p>
				<a href="/auth/signin-link" class="block">
					<Button 
						variant="default"
						class="w-full"
					>
						Request new sign-in link
					</Button>
				</a>
			</div>
		</div>
	{/if}
</div>
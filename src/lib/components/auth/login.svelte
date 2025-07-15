<script lang="ts">
	import { signInWithMicrosoft, signIn, type AuthUser, type AuthError } from '$lib/firebase/auth';
	import { Button } from '$lib/components/ui/button';
	import GoogleSignInButton from './google-signin-button.svelte';
	import { goto } from '$app/navigation';
	
	let email = '';
	let password = '';
	let error = '';
	let loading = false;
	
	async function handleMicrosoftSignIn() {
		error = '';
		loading = true;
		
		try {
			await signInWithMicrosoft();
			// Redirect to dashboard after successful login
			goto('/dashboard');
		} catch (err: any) {
			// Handle redirect case
			if (err.message === 'Redirecting to Microsoft sign-in...') {
				// This is expected, page will redirect
				return;
			}
			const authError = err as AuthError;
			error = authError.userFriendlyMessage || err.message || 'Failed to sign in with Microsoft';
		} finally {
			loading = false;
		}
	}
	
	async function handleEmailSignIn() {
		error = '';
		loading = true;
		
		try {
			await signIn(email, password);
			goto('/dashboard');
		} catch (err: any) {
			const authError = err as AuthError;
			error = authError.userFriendlyMessage || err.message || 'Failed to sign in';
			console.error('Sign in error:', authError.code || 'unknown', authError.message || err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto max-w-sm space-y-6">
	<div class="space-y-2 text-center">
		<h1 class="text-3xl font-bold">Sign In</h1>
		<p class="text-gray-500">Welcome to Delphi Healthcare Decision Platform</p>
	</div>
	
	{#if error}
		<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">
			{error}
		</div>
	{/if}
	
	<div class="space-y-4">
		<GoogleSignInButton />
		
		<Button 
			on:click={handleMicrosoftSignIn} 
			disabled={loading}
			class="w-full"
			variant="outline"
		>
			<svg class="mr-2 h-4 w-4" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect x="0.5" y="0.5" width="9" height="9" fill="#F25022"/>
				<rect x="11.5" y="0.5" width="9" height="9" fill="#00A4EF"/>
				<rect x="0.5" y="11.5" width="9" height="9" fill="#7FBA00"/>
				<rect x="11.5" y="11.5" width="9" height="9" fill="#FFB900"/>
			</svg>
			Sign in with Microsoft
		</Button>
		
		<div class="relative">
			<div class="absolute inset-0 flex items-center">
				<span class="w-full border-t" />
			</div>
			<div class="relative flex justify-center text-xs uppercase">
				<span class="bg-white px-2 text-gray-500">Or</span>
			</div>
		</div>
		
		<a href="/auth/signin-link" class="block">
			<Button 
				variant="outline"
				class="w-full"
			>
				Sign in with email link (no password)
			</Button>
		</a>
		
		<div class="relative">
			<div class="absolute inset-0 flex items-center">
				<span class="w-full border-t" />
			</div>
			<div class="relative flex justify-center text-xs uppercase">
				<span class="bg-white px-2 text-gray-500">Or sign in with password</span>
			</div>
		</div>
		
		<form on:submit|preventDefault={handleEmailSignIn} class="space-y-4">
			<div>
				<label for="email" class="block text-sm font-medium">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
					placeholder="your.email@uhsinc.com"
				/>
			</div>
			
			<div>
				<label for="password" class="block text-sm font-medium">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
				/>
			</div>
			
			<Button type="submit" disabled={loading} class="w-full">
				Sign in with Email
			</Button>
		</form>
	</div>
	
	<p class="text-center text-sm text-gray-600">
		Don't have an account? 
		<a href="/auth/signup" class="font-medium text-indigo-600 hover:text-indigo-500">
			Sign up
		</a>
	</p>
</div>
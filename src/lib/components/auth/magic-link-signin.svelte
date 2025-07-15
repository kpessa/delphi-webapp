<script lang="ts">
	import { sendMagicLink, type AuthError } from '$lib/firebase/auth';
	import { Button } from '$lib/components/ui/button';
	
	let email = '';
	let error = '';
	let loading = false;
	let emailSent = false;
	
	async function handleSubmit() {
		error = '';
		loading = true;
		emailSent = false;
		
		try {
			await sendMagicLink(email);
			emailSent = true;
		} catch (err: any) {
			const authError = err as AuthError;
			error = authError.userFriendlyMessage || err.message || 'Failed to send sign-in link';
			console.error('Magic link error:', authError);
		} finally {
			loading = false;
		}
	}
	
	function handleResend() {
		emailSent = false;
		error = '';
	}
</script>

<div class="mx-auto max-w-sm space-y-6">
	<div class="space-y-2 text-center">
		<h1 class="text-3xl font-bold">Sign In with Email Link</h1>
		<p class="text-gray-500">No password needed - we'll email you a secure sign-in link</p>
	</div>
	
	{#if error}
		<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">
			{error}
		</div>
	{/if}
	
	{#if emailSent}
		<div class="space-y-4">
			<div class="rounded-md bg-green-50 p-4 text-green-800">
				<h3 class="font-semibold mb-2">Check your email!</h3>
				<p class="text-sm mb-3">We've sent a sign-in link to <strong>{email}</strong></p>
				<p class="text-sm">Click the link in the email to sign in. The link will expire in 1 hour.</p>
			</div>
			
			<div class="space-y-3">
				<p class="text-sm text-gray-600 text-center">Didn't receive the email?</p>
				<Button 
					on:click={handleResend}
					variant="outline"
					class="w-full"
				>
					Send another link
				</Button>
			</div>
			
			<div class="text-sm text-gray-500 space-y-1">
				<p class="font-semibold">Tips:</p>
				<ul class="list-disc list-inside space-y-1">
					<li>Check your spam folder</li>
					<li>Make sure you entered the correct email</li>
					<li>The link can only be used once</li>
				</ul>
			</div>
		</div>
	{:else}
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
					placeholder="your.name@uhsinc.com"
				/>
				<p class="mt-1 text-xs text-gray-500">Enter your UHS email address</p>
			</div>
			
			<Button 
				type="submit" 
				disabled={loading || !email} 
				class="w-full"
			>
				{loading ? 'Sending...' : 'Send sign-in link'}
			</Button>
		</form>
		
		<div class="relative">
			<div class="absolute inset-0 flex items-center">
				<span class="w-full border-t" />
			</div>
			<div class="relative flex justify-center text-xs uppercase">
				<span class="bg-white px-2 text-gray-500">Or</span>
			</div>
		</div>
		
		<div class="text-center">
			<a href="/auth/login" class="text-sm text-indigo-600 hover:text-indigo-500">
				Sign in with password instead
			</a>
		</div>
	{/if}
</div>
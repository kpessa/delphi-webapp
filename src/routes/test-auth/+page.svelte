<script lang="ts">
	import { onMount } from 'svelte';
	import { signIn, signInWithMicrosoft, sendMagicLink, type AuthError } from '$lib/firebase/auth';
	import { Button } from '$lib/components/ui/button';
	
	let testEmail = 'Kurt.Pessa@uhsinc.com';
	let testPassword = 'Ketodiet7&';
	let status = '';
	let error = '';
	let loading = false;
	let success = false;
	let currentUser: any = null;
	
	async function testEmailPasswordLogin() {
		status = 'Starting email/password authentication test...';
		error = '';
		loading = true;
		success = false;
		
		try {
			status = 'Attempting to sign in with email/password...';
			const result = await signIn(testEmail, testPassword);
			
			if (result && result.user) {
				success = true;
				currentUser = result.user;
				status = `✅ Authentication successful! User ID: ${result.user.uid}`;
				console.log('Authentication successful:', result);
			} else {
				throw new Error('No user returned from sign in');
			}
		} catch (err: any) {
			const authError = err as AuthError;
			error = authError.userFriendlyMessage || err.message || 'Unknown error occurred';
			status = '❌ Email/Password authentication failed';
			console.error('Full error details:', {
				code: authError.code || 'unknown',
				message: authError.message || err.toString(),
				userFriendlyMessage: authError.userFriendlyMessage,
				rawError: err
			});
		} finally {
			loading = false;
		}
	}
	
	async function testMicrosoftLogin() {
		status = 'Starting Microsoft authentication test...';
		error = '';
		loading = true;
		success = false;
		
		try {
			status = 'Opening Microsoft sign-in...';
			const result = await signInWithMicrosoft();
			
			if (result && result.user) {
				success = true;
				currentUser = result.user;
				status = `✅ Microsoft authentication successful!`;
				console.log('Microsoft auth successful:', {
					uid: result.user.uid,
					email: result.user.email,
					displayName: result.user.displayName,
					providerId: result.providerId,
					additionalUserInfo: result.additionalUserInfo
				});
			} else {
				throw new Error('No user returned from Microsoft sign in');
			}
		} catch (err: any) {
			// Handle redirect case
			if (err.message === 'Redirecting to Microsoft sign-in...') {
				status = 'Redirecting to Microsoft sign-in...';
				return;
			}
			
			const authError = err as AuthError;
			error = authError.userFriendlyMessage || err.message || 'Unknown error occurred';
			status = '❌ Microsoft authentication failed';
			console.error('Microsoft auth error:', {
				code: authError.code || err.code || 'unknown',
				message: authError.message || err.message || err.toString(),
				userFriendlyMessage: authError.userFriendlyMessage,
				rawError: err
			});
		} finally {
			loading = false;
		}
	}
	
	async function testMagicLink() {
		status = 'Sending magic link...';
		error = '';
		loading = true;
		success = false;
		
		try {
			await sendMagicLink(testEmail);
			status = '✅ Magic link sent successfully!';
			success = true;
			console.log('Magic link sent to:', testEmail);
		} catch (err: any) {
			const authError = err as AuthError;
			error = authError.userFriendlyMessage || err.message || 'Failed to send magic link';
			status = '❌ Failed to send magic link';
			console.error('Magic link error:', {
				code: authError.code || 'unknown',
				message: authError.message || err.toString(),
				userFriendlyMessage: authError.userFriendlyMessage,
				rawError: err
			});
		} finally {
			loading = false;
		}
	}
	
	onMount(async () => {
		// Check if Firebase is properly initialized
		try {
			const { auth } = await import('$lib/firebase/config');
			if (auth) {
				status = 'Firebase Auth is initialized and ready';
			} else {
				error = 'Firebase Auth is not properly initialized';
			}
		} catch (err) {
			error = 'Failed to load Firebase configuration';
			console.error('Firebase config error:', err);
		}
	});
</script>

<div class="container mx-auto max-w-2xl p-8">
	<h1 class="text-2xl font-bold mb-6">Authentication Test Page</h1>
	
	<div class="space-y-4">
		<div class="p-4 bg-gray-100 rounded">
			<h2 class="font-semibold mb-2">Available Authentication Methods:</h2>
			<p class="mb-2"><strong>Magic Link (Recommended):</strong> Send a secure sign-in link to your UHS email</p>
			<p class="mb-2"><strong>Microsoft OAuth:</strong> Use your UHS corporate account (may be blocked by IT)</p>
			<p><strong>Email/Password:</strong> For testing only - requires account to be created in Firebase first</p>
		</div>
		
		{#if status}
			<div class="p-4 bg-blue-50 text-blue-800 rounded">
				<p class="font-semibold">Status:</p>
				<p>{status}</p>
			</div>
		{/if}
		
		{#if error}
			<div class="p-4 bg-red-50 text-red-800 rounded">
				<p class="font-semibold">Error:</p>
				<p>{error}</p>
				<p class="text-sm mt-2">Check the browser console for detailed error information.</p>
			</div>
		{/if}
		
		{#if success && currentUser}
			<div class="p-4 bg-green-50 text-green-800 rounded">
				<p class="font-semibold mb-2">✅ Authentication successful!</p>
				<p>User ID: {currentUser.uid}</p>
				<p>Email: {currentUser.email}</p>
				{#if currentUser.displayName}
					<p>Display Name: {currentUser.displayName}</p>
				{/if}
				<a href="/dashboard" class="text-green-600 underline mt-2 inline-block">Go to Dashboard</a>
			</div>
		{/if}
		
		<div class="space-y-2">
			<Button 
				on:click={testMagicLink} 
				disabled={loading}
				class="w-full"
				variant="default"
			>
				✉️ {loading ? 'Sending...' : 'Test Magic Link Authentication'}
			</Button>
			
			<Button 
				on:click={testMicrosoftLogin} 
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
				{loading ? 'Testing...' : 'Test Microsoft Authentication'}
			</Button>
			
			<details class="mt-4">
				<summary class="cursor-pointer text-sm text-gray-600">Test Email/Password Authentication</summary>
				<div class="mt-2 space-y-2">
					<div class="p-2 bg-gray-50 rounded text-sm">
						<p>Email: {testEmail}</p>
						<p>Password: {testPassword.replace(/./g, '*')}</p>
					</div>
					<Button 
						on:click={testEmailPasswordLogin} 
						disabled={loading}
						class="w-full"
						variant="outline"
					>
						{loading ? 'Testing...' : 'Test Email/Password Authentication'}
					</Button>
				</div>
			</details>
		</div>
		
		<div class="mt-8 p-4 bg-yellow-50 text-yellow-800 rounded">
			<p class="font-semibold mb-2">⚠️ Important Notes:</p>
			<ul class="list-disc list-inside text-sm space-y-1">
				<li>Microsoft authentication requires proper OAuth setup in Firebase Console</li>
				<li>Your Azure AD app (created with kpessa@gmail.com) must be configured in Firebase</li>
				<li>Email/Password auth only works if the user exists in Firebase Auth</li>
			</ul>
		</div>
		
		<div class="mt-4 p-4 bg-gray-50 rounded">
			<p class="font-semibold mb-2">🔍 Debugging Checklist:</p>
			<ul class="list-disc list-inside text-sm space-y-1">
				<li>Is Microsoft provider enabled in Firebase Console?</li>
				<li>Are OAuth redirect URIs configured correctly?</li>
				<li>Is your Azure AD app registered with correct permissions?</li>
				<li>Check browser console for detailed error messages</li>
			</ul>
		</div>
	</div>
</div>
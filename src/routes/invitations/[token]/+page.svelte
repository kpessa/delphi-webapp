<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { authStore } from '$lib/stores/auth.svelte';
	import { getInvitationByToken, acceptInvitation, declineInvitation } from '$lib/firebase/invitations';
	import { createExpert } from '$lib/firebase/experts';
	import { addExpertToPanel } from '$lib/firebase/panels';
	import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
	import { auth } from '$lib/firebase/app';
	import { toast } from 'svelte-sonner';
	import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-svelte';
	import type { PanelInvitation } from '$lib/firebase/types';

	let invitation: PanelInvitation | null = null;
	let loading = true;
	let processing = false;
	let error = '';
	
	// Form fields for new users
	let name = '';
	let password = '';
	let confirmPassword = '';
	
	$: token = $page.params.token;
	$: isAuthenticated = authStore.isAuthenticated;
	$: userEmail = authStore.user?.email;
	$: needsAccount = invitation && !isAuthenticated;
	$: emailMismatch = isAuthenticated && userEmail && invitation && 
		userEmail.toLowerCase() !== invitation.email.toLowerCase();
	$: emailMatches = isAuthenticated && userEmail && invitation && 
		userEmail.toLowerCase() === invitation.email.toLowerCase();

	onMount(async () => {
		await loadInvitation();
	});

	async function loadInvitation() {
		try {
			loading = true;
			error = '';
			
			invitation = await getInvitationByToken(token);
			
			if (!invitation) {
				error = 'Invalid or expired invitation link.';
				return;
			}
			
			// Check if invitation has expired
			if (new Date() > new Date(invitation.expiresAt)) {
				invitation.status = 'expired';
			}
			
		} catch (err) {
			console.error('Error loading invitation:', err);
			error = 'Failed to load invitation. Please try again.';
		} finally {
			loading = false;
		}
	}

	async function handleAcceptInvitation() {
		if (!invitation || !invitation.id) return;
		
		try {
			processing = true;
			error = '';
			
			// If user needs to create account
			if (needsAccount) {
				if (!name || !password || !confirmPassword) {
					error = 'Please fill in all fields';
					return;
				}
				
				if (password !== confirmPassword) {
					error = 'Passwords do not match';
					return;
				}
				
				if (password.length < 8) {
					error = 'Password must be at least 8 characters';
					return;
				}
				
				// Check password complexity
				const hasUpperCase = /[A-Z]/.test(password);
				const hasLowerCase = /[a-z]/.test(password);
				const hasNumbers = /\d/.test(password);
				const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
				
				if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
					error = 'Password must contain uppercase, lowercase, numbers, and special characters';
					return;
				}
				
				// Create new account
				try {
					const userCredential = await createUserWithEmailAndPassword(
						auth,
						invitation.email,
						password
					);
					
					// Wait for auth state to update
					await new Promise(resolve => setTimeout(resolve, 1000));
					
				} catch (err: any) {
					if (err.code === 'auth/email-already-in-use') {
						// Try to sign in instead
						try {
							await signInWithEmailAndPassword(auth, invitation.email, password);
						} catch (signInErr: any) {
							error = 'Email already in use. Please sign in with your existing password.';
							return;
						}
					} else {
						error = err.message || 'Failed to create account';
						return;
					}
				}
			}
			
			// Check email match if authenticated
			if (isAuthenticated && emailMismatch) {
				error = 'This invitation is for a different email address. Please sign out and try again.';
				return;
			}
			
			// Create expert record
			const expertId = await createExpert({
				panelId: invitation.panelId,
				email: invitation.email,
				name: name || authStore.user?.displayName || authStore.user?.email || invitation.email,
				status: 'accepted',
				invitedBy: invitation.invitedBy,
				userId: authStore.user?.uid
			});
			
			// Add to panel's expertIds
			await addExpertToPanel(invitation.panelId, authStore.user!.uid);
			
			// Accept the invitation
			await acceptInvitation(invitation.id, expertId);
			
			toast.success('Successfully joined the panel!');
			
			// Redirect to panel page
			goto(`/panels/${invitation.panelId}`);
			
		} catch (err: any) {
			console.error('Error accepting invitation:', err);
			error = err.message || 'Failed to accept invitation. Please try again.';
		} finally {
			processing = false;
		}
	}

	async function handleDeclineInvitation() {
		if (!invitation || !invitation.id || !confirm('Are you sure you want to decline this invitation?')) {
			return;
		}
		
		try {
			processing = true;
			await declineInvitation(invitation.id);
			toast.info('Invitation declined');
			goto('/');
		} catch (err) {
			console.error('Error declining invitation:', err);
			toast.error('Failed to decline invitation');
		} finally {
			processing = false;
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'accepted':
				return CheckCircle;
			case 'declined':
				return XCircle;
			case 'expired':
				return AlertCircle;
			default:
				return Clock;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'accepted':
				return 'text-green-600';
			case 'declined':
			case 'expired':
				return 'text-red-600';
			default:
				return 'text-blue-600';
		}
	}
</script>

<svelte:head>
	<title>Panel Invitation - Delphi Healthcare Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
	<div class="max-w-md w-full">
		{#if loading}
			<Card>
				<CardContent class="pt-6">
					<p class="text-center text-gray-500">Loading invitation...</p>
				</CardContent>
			</Card>
		{:else if error && !invitation}
			<Card>
				<CardContent class="pt-6">
					<div class="text-center">
						<XCircle class="mx-auto h-12 w-12 text-red-500 mb-4" />
						<p class="text-red-600">{error}</p>
						<Button href="/" variant="outline" class="mt-4">
							Go to Home
						</Button>
					</div>
				</CardContent>
			</Card>
		{:else if invitation}
			<Card>
				<CardHeader>
					<div class="flex items-center justify-between">
						<CardTitle>Panel Invitation</CardTitle>
						{#if invitation.status !== 'pending'}
							{@const Icon = getStatusIcon(invitation.status)}
							<Icon class="h-6 w-6 {getStatusColor(invitation.status)}" />
						{/if}
					</div>
					<CardDescription>
						{#if invitation.status === 'pending'}
							You've been invited to join as an expert
						{:else if invitation.status === 'accepted'}
							This invitation has already been accepted
						{:else if invitation.status === 'declined'}
							This invitation has been declined
						{:else if invitation.status === 'expired'}
							This invitation has expired
						{/if}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{#if invitation.status === 'pending'}
						<div class="space-y-4">
							<div>
								<p class="text-sm text-gray-600">Panel</p>
								<p class="font-semibold">{invitation.panelName}</p>
							</div>
							
							<div>
								<p class="text-sm text-gray-600">Invited by</p>
								<p class="font-semibold">{invitation.invitedByName || 'Panel Administrator'}</p>
							</div>
							
							<div>
								<p class="text-sm text-gray-600">Your email</p>
								<p class="font-semibold">{invitation.email}</p>
							</div>
							
							{#if invitation.message}
								<div>
									<p class="text-sm text-gray-600 mb-1">Message</p>
									<p class="bg-gray-100 p-3 rounded-md text-sm">{invitation.message}</p>
								</div>
							{/if}
							
							{#if emailMismatch}
								<div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
									<p class="text-sm text-yellow-800">
										<AlertCircle class="inline h-4 w-4 mr-1" />
										You're signed in as {userEmail}. This invitation is for {invitation.email}.
										Please sign out and try again.
									</p>
								</div>
							{:else if emailMatches}
								<div class="bg-green-50 border border-green-200 rounded-md p-3">
									<p class="text-sm text-green-800">
										<CheckCircle class="inline h-4 w-4 mr-1" />
										You're signed in as {userEmail}. Click "Accept Invitation" to join this panel.
									</p>
								</div>
							{/if}
							
							{#if needsAccount}
								<div class="border-t pt-4">
									<h3 class="font-semibold mb-3">Create Your Account</h3>
									<div class="space-y-3">
										<div>
											<Label for="name">Full Name</Label>
											<Input
												id="name"
												type="text"
												bind:value={name}
												placeholder="Enter your full name"
												disabled={processing}
											/>
										</div>
										
										<div>
											<Label for="password">Password</Label>
											<Input
												id="password"
												type="password"
												bind:value={password}
												placeholder="Create a password"
												disabled={processing}
											/>
											<p class="text-xs text-gray-500 mt-1">
												Minimum 8 characters with uppercase, lowercase, numbers, and special characters
											</p>
										</div>
										
										<div>
											<Label for="confirmPassword">Confirm Password</Label>
											<Input
												id="confirmPassword"
												type="password"
												bind:value={confirmPassword}
												placeholder="Confirm your password"
												disabled={processing}
											/>
										</div>
									</div>
								</div>
							{/if}
							
							{#if error}
								<div class="bg-red-50 border border-red-200 rounded-md p-3">
									<p class="text-sm text-red-800">{error}</p>
								</div>
							{/if}
							
							<div class="flex gap-3 pt-2">
								<Button
									onclick={handleAcceptInvitation}
									disabled={processing || emailMismatch}
									class="flex-1"
								>
									{processing ? 'Processing...' : 'Accept Invitation'}
								</Button>
								<Button
									variant="outline"
									onclick={handleDeclineInvitation}
									disabled={processing}
								>
									Decline
								</Button>
							</div>
							
							{#if !isAuthenticated && !needsAccount}
								<div class="text-center text-sm text-gray-600">
									Already have an account?
									<Button href="/auth/login" variant="link" class="px-1">
										Sign in
									</Button>
								</div>
							{/if}
						</div>
					{:else}
						<div class="text-center py-4">
							<p class="text-gray-600 mb-4">
								{#if invitation.status === 'accepted'}
									You have already accepted this invitation.
								{:else if invitation.status === 'declined'}
									You have declined this invitation.
								{:else if invitation.status === 'expired'}
									This invitation link has expired. Please contact the panel administrator for a new invitation.
								{/if}
							</p>
							<Button href="/panels" variant="outline">
								Go to Panels
							</Button>
						</div>
					{/if}
				</CardContent>
			</Card>
		{/if}
	</div>
</div>
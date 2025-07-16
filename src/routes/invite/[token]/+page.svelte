<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { authStore } from '$lib/stores/auth.svelte';
	import { getInvitationByToken, acceptInvitation, getPanel, addExpertToPanel, type PanelInvitation, type Panel } from '$lib/firebase/panels';
	import { createOrUpdateExpertFromAuth, addPanelToExpert } from '$lib/firebase/experts';
	import { CheckCircle, XCircle, Loader2 } from 'lucide-svelte';

	let invitation: PanelInvitation | null = null;
	let panel: Panel | null = null;
	let loading = true;
	let accepting = false;
	let error = '';
	let success = false;

	$: token = $page.params.token;

	onMount(() => {
		loadInvitation();
	});

	async function loadInvitation() {
		try {
			loading = true;
			invitation = await getInvitationByToken(token);
			
			if (!invitation) {
				error = 'Invalid or expired invitation link.';
				return;
			}

			if (invitation.status === 'accepted') {
				error = 'This invitation has already been accepted.';
				return;
			}

			if (invitation.status === 'declined') {
				error = 'This invitation has been declined.';
				return;
			}

			panel = await getPanel(invitation.panelId);
			if (!panel) {
				error = 'The panel associated with this invitation no longer exists.';
				return;
			}
		} catch (err) {
			console.error('Error loading invitation:', err);
			error = 'Failed to load invitation. Please try again.';
		} finally {
			loading = false;
		}
	}

	async function handleAccept() {
		if (!invitation || !panel || !authStore.user) {
			error = 'You must be logged in to accept this invitation.';
			return;
		}

		try {
			accepting = true;
			error = '';

			const expert = await createOrUpdateExpertFromAuth({
				uid: authStore.user.uid,
				email: authStore.user.email || invitation.email,
				displayName: authStore.user.displayName
			});

			await Promise.all([
				acceptInvitation(invitation.id!),
				addExpertToPanel(panel.id!, expert.id!),
				addPanelToExpert(expert.id!, panel.id!)
			]);

			success = true;
			setTimeout(() => {
				goto(`/panels/${panel!.id}`);
			}, 2000);
		} catch (err) {
			console.error('Error accepting invitation:', err);
			error = 'Failed to accept invitation. Please try again.';
		} finally {
			accepting = false;
		}
	}
</script>

<svelte:head>
	<title>Panel Invitation - Delphi Healthcare Platform</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<h2 class="text-3xl font-bold text-gray-900">Panel Invitation</h2>
			<p class="mt-2 text-sm text-gray-600">
				You've been invited to join a Delphi expert panel
			</p>
		</div>

		<div class="rounded-lg bg-white p-8 shadow">
			{#if loading}
				<div class="flex flex-col items-center justify-center space-y-4">
					<Loader2 class="h-8 w-8 animate-spin text-gray-400" />
					<p class="text-sm text-gray-500">Loading invitation...</p>
				</div>
			{:else if error}
				<div class="space-y-4 text-center">
					<XCircle class="mx-auto h-12 w-12 text-red-500" />
					<h3 class="text-lg font-medium text-gray-900">Invalid Invitation</h3>
					<p class="text-sm text-gray-600">{error}</p>
					<Button href="/auth/login" variant="outline" class="w-full">
						Go to Login
					</Button>
				</div>
			{:else if success}
				<div class="space-y-4 text-center">
					<CheckCircle class="mx-auto h-12 w-12 text-green-500" />
					<h3 class="text-lg font-medium text-gray-900">Invitation Accepted!</h3>
					<p class="text-sm text-gray-600">
						You've successfully joined the panel. Redirecting...
					</p>
				</div>
			{:else if invitation && panel}
				<div class="space-y-6">
					<div>
						<h3 class="text-lg font-medium text-gray-900">
							Join "{panel.name}"
						</h3>
						<p class="mt-2 text-sm text-gray-600">
							{panel.description}
						</p>
					</div>

					<div class="rounded-lg bg-gray-50 p-4">
						<p class="text-sm text-gray-700">
							<strong>Invited to:</strong> {invitation.email}
						</p>
						<p class="mt-1 text-sm text-gray-700">
							<strong>Sent on:</strong> {new Date(invitation.createdAt).toLocaleDateString()}
						</p>
					</div>

					{#if !authStore.isAuthenticated}
						<div class="rounded-lg bg-blue-50 p-4">
							<p class="text-sm text-blue-800">
								Please log in or create an account to accept this invitation.
							</p>
						</div>
						<Button href="/auth/login" class="w-full">
							Log In to Accept
						</Button>
					{:else}
						<div class="space-y-3">
							<p class="text-sm text-gray-600">
								Logged in as: <strong>{authStore.user?.email}</strong>
							</p>
							<Button
								on:click={handleAccept}
								disabled={accepting}
								class="w-full"
							>
								{accepting ? 'Accepting...' : 'Accept Invitation'}
							</Button>
							<Button
								href="/panels"
								variant="outline"
								class="w-full"
								disabled={accepting}
							>
								Cancel
							</Button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
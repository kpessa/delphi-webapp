<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Table,
		TableBody,
		TableCaption,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { authStore } from '$lib/stores/auth.svelte';
	import { getPanel, addExpertToPanel, removeExpertFromPanel, type Panel } from '$lib/firebase/panels';
	import { getExpertsByPanel, createExpert, deleteExpert, type Expert } from '$lib/firebase/experts';
	import { sendBulkInvitations, getInvitationsByPanel, resendInvitation, cancelInvitation, type PanelInvitation } from '$lib/firebase/invitations';
	import { toast } from 'svelte-sonner';
	import { ArrowLeft, Edit, UserPlus, UserCheck, UserX, Mail, CheckCircle, Clock, XCircle } from 'lucide-svelte';
	
	let panel: Panel | null = null;
	let experts: Expert[] = [];
	let invitations: PanelInvitation[] = [];
	let loading = true;
	let showInviteDialog = false;
	let inviteEmails = '';
	let inviteMessage = '';
	let inviting = false;

	$: panelId = $page.params.id;
	$: isAdmin = panel && authStore.user ? 
		(panel.adminIds?.includes(authStore.user.uid) || panel.creatorId === authStore.user.uid) : 
		false;
	$: isExpert = panel && authStore.user ? panel.expertIds?.includes(authStore.user.uid) || false : false;
	$: canJoinAsExpert = isAdmin && !isExpert;

	onMount(() => {
		if (!authStore.isAuthenticated) {
			goto('/auth/login');
		} else {
			loadPanelData();
		}
	});

	async function loadPanelData() {
		try {
			loading = true;
			
			panel = await getPanel(panelId);
			if (!panel) {
				goto('/panels');
				return;
			}

			// Load experts for this panel
			experts = await getExpertsByPanel(panelId);
			// Load invitations
			invitations = await getInvitationsByPanel(panelId);
		} catch (error) {
			console.error('Error loading panel data:', error);
			goto('/panels');
		} finally {
			loading = false;
		}
	}

	async function handleInviteExperts() {
		if (!panel || !authStore.user || !inviteEmails.trim()) return;

		try {
			inviting = true;
			const emails = inviteEmails
				.split(/[,\n]/)
				.map(e => e.trim())
				.filter(e => e && e.includes('@'));

			if (emails.length === 0) {
				toast.error('Please enter valid email addresses');
				return;
			}

			const result = await sendBulkInvitations(
				emails,
				panelId,
				panel.name,
				authStore.user.uid,
				authStore.user.displayName || authStore.user.email || 'Panel Administrator',
				inviteMessage || undefined
			);

			if (result.sent > 0) {
				toast.success(`Sent ${result.sent} invitation(s) successfully`);
			}
			
			if (result.failed.length > 0) {
				toast.error(`Failed to send to: ${result.failed.join(', ')}`);
			}
			
			inviteEmails = '';
			inviteMessage = '';
			showInviteDialog = false;
			await loadPanelData();
		} catch (error) {
			console.error('Error sending invitations:', error);
			toast.error('Failed to send invitations. Please try again.');
		} finally {
			inviting = false;
		}
	}

	async function joinAsExpert() {
		if (!panel || !authStore.user) return;
		
		try {
			// Create expert record
			const expertId = await createExpert({
				panelId: panelId,
				email: authStore.user.email || '',
				name: authStore.user.displayName || authStore.user.email || 'Admin',
				status: 'accepted',
				invitedBy: authStore.user.uid,
				userId: authStore.user.uid
			});
			
			// Add to panel's expertIds
			await addExpertToPanel(panelId, authStore.user.uid);
			
			toast.success('Successfully joined as expert');
			await loadPanelData();
		} catch (error) {
			console.error('Error joining as expert:', error);
			toast.error('Failed to join as expert');
		}
	}

	async function leaveAsExpert() {
		if (!panel || !authStore.user || !confirm('Are you sure you want to leave as an expert? You will remain an admin.')) return;
		
		try {
			// Remove from panel's expertIds
			await removeExpertFromPanel(panelId, authStore.user.uid);
			
			// Find and delete the expert record
			const userExpert = experts.find(e => e.userId === authStore.user?.uid);
			if (userExpert && userExpert.id) {
				await deleteExpert(userExpert.id);
			}
			
			toast.success('Successfully left expert role');
			await loadPanelData();
		} catch (error) {
			console.error('Error leaving expert role:', error);
			toast.error('Failed to leave expert role');
		}
	}

	function getInvitationStatusIcon(status: string) {
		switch (status) {
			case 'accepted':
				return CheckCircle;
			case 'declined':
				return XCircle;
			default:
				return Clock;
		}
	}

	function getInvitationStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'accepted':
				return 'default';
			case 'declined':
			case 'expired':
				return 'destructive';
			default:
				return 'secondary';
		}
	}

	async function handleResendInvitation(invitationId: string) {
		try {
			await resendInvitation(invitationId);
			toast.success('Invitation resent successfully');
			await loadPanelData();
		} catch (error) {
			console.error('Error resending invitation:', error);
			toast.error('Failed to resend invitation');
		}
	}

	async function handleCancelInvitation(invitationId: string) {
		if (!confirm('Are you sure you want to cancel this invitation?')) return;
		
		try {
			await cancelInvitation(invitationId);
			toast.success('Invitation cancelled');
			await loadPanelData();
		} catch (error) {
			console.error('Error cancelling invitation:', error);
			toast.error('Failed to cancel invitation');
		}
	}
</script>

<svelte:head>
	<title>{panel?.name || 'Panel'} - Delphi Healthcare Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button href="/panels" variant="ghost" size="sm">
						<ArrowLeft class="h-4 w-4" />
					</Button>
					<div>
						<div class="flex items-center gap-2">
							<h1 class="text-3xl font-bold text-gray-900">
								{panel?.name || 'Loading...'}
							</h1>
							{#if panel && authStore.user}
								{#if isAdmin}
									<Badge variant="default">Admin</Badge>
								{/if}
								{#if isExpert}
									<Badge variant="secondary">Expert</Badge>
								{/if}
							{/if}
						</div>
						{#if panel}
							<p class="mt-1 text-sm text-gray-600">{panel.description}</p>
						{/if}
					</div>
				</div>
				{#if isAdmin}
					<div class="flex items-center gap-2">
						{#if canJoinAsExpert}
							<Button
								variant="secondary"
								onclick={joinAsExpert}
								class="flex items-center gap-2"
							>
								<UserCheck class="h-4 w-4" />
								Join as Expert
							</Button>
						{:else if isExpert}
							<Button
								variant="outline"
								onclick={leaveAsExpert}
								class="flex items-center gap-2"
							>
								<UserX class="h-4 w-4" />
								Leave Expert Role
							</Button>
						{/if}
						<Button
							variant="outline"
							onclick={() => showInviteDialog = true}
							class="flex items-center gap-2"
						>
							<UserPlus class="h-4 w-4" />
							Invite Experts
						</Button>
						<Button href="/panels/{panelId}/edit" class="flex items-center gap-2">
							<Edit class="h-4 w-4" />
							Edit Panel
						</Button>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<p class="text-gray-500">Loading panel details...</p>
			</div>
		{:else if panel}
			<div class="grid gap-6 lg:grid-cols-2">
				<div class="rounded-lg bg-white p-6 shadow">
					<h2 class="mb-4 text-lg font-semibold text-gray-900">Current Experts ({experts.length})</h2>
					{#if experts.length === 0}
						<p class="text-sm text-gray-500">No experts have joined this panel yet.</p>
					{:else}
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Joined</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each experts as expert}
									<TableRow>
										<TableCell class="font-medium">{expert.name}</TableCell>
										<TableCell>{expert.email}</TableCell>
										<TableCell>
											{new Date(expert.createdAt).toLocaleDateString()}
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					{/if}
				</div>

				<div class="rounded-lg bg-white p-6 shadow">
					<h2 class="mb-4 text-lg font-semibold text-gray-900">Invitations ({invitations.length})</h2>
					{#if invitations.length === 0}
						<p class="text-sm text-gray-500">No invitations sent yet.</p>
					{:else}
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Email</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Sent</TableHead>
									{#if isAdmin}
										<TableHead>Actions</TableHead>
									{/if}
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each invitations as invitation}
									<TableRow>
										<TableCell>{invitation.email}</TableCell>
										<TableCell>
											<Badge variant={getInvitationStatusVariant(invitation.status)}>
												{invitation.status}
											</Badge>
										</TableCell>
										<TableCell>
											{new Date(invitation.createdAt).toLocaleDateString()}
										</TableCell>
										{#if isAdmin}
											<TableCell>
												{#if invitation.status === 'pending'}
													<div class="flex gap-2">
														<Button
															size="sm"
															variant="outline"
															onclick={() => invitation.id && handleResendInvitation(invitation.id)}
														>
															Resend
														</Button>
														<Button
															size="sm"
															variant="destructive"
															onclick={() => invitation.id && handleCancelInvitation(invitation.id)}
														>
															Cancel
														</Button>
													</div>
												{/if}
											</TableCell>
										{/if}
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					{/if}
				</div>
			</div>

			<div class="mt-6 rounded-lg bg-white p-6 shadow">
				<h2 class="mb-4 text-lg font-semibold text-gray-900">Panel Information</h2>
				<dl class="grid gap-4 sm:grid-cols-2">
					<div>
						<dt class="text-sm font-medium text-gray-500">Created</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{new Date(panel.createdAt).toLocaleDateString()}
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Last Updated</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{new Date(panel.updatedAt).toLocaleDateString()}
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Total Members</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{panel.expertIds.length} expert{panel.expertIds.length !== 1 ? 's' : ''}
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Administrators</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{panel.adminIds.length} admin{panel.adminIds.length !== 1 ? 's' : ''}
						</dd>
					</div>
				</dl>
			</div>
		{/if}
	</main>
</div>

{#if showInviteDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
			<h3 class="mb-4 text-lg font-semibold">Invite Experts</h3>
			<p class="mb-4 text-sm text-gray-600">
				Enter email addresses separated by commas or new lines.
			</p>
			<Textarea
				bind:value={inviteEmails}
				placeholder="expert1@hospital.com, expert2@hospital.com&#10;expert3@hospital.com"
				rows={4}
				disabled={inviting}
			/>
			<p class="mt-2 mb-3 text-sm text-gray-600">
				Personal Message (Optional)
			</p>
			<Textarea
				bind:value={inviteMessage}
				placeholder="Add a personal message to include in the invitation email..."
				rows={3}
				disabled={inviting}
			/>
			<div class="mt-4 flex justify-end gap-2">
				<Button
					variant="outline"
					on:click={() => showInviteDialog = false}
					disabled={inviting}
				>
					Cancel
				</Button>
				<Button
					on:click={handleInviteExperts}
					disabled={inviting || !inviteEmails.trim()}
				>
					{inviting ? 'Sending...' : 'Send Invitations'}
				</Button>
			</div>
		</div>
	</div>
{/if}
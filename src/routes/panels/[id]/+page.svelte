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
	import { getPanel, getInvitationsByPanel, type Panel, type PanelInvitation } from '$lib/firebase/panels';
	import { getExpertsByPanel, sendBulkInvitations, type Expert } from '$lib/firebase/experts';
	import { ArrowLeft, Edit, UserPlus, Mail, CheckCircle, Clock, XCircle } from 'lucide-svelte';
	
	let panel: Panel | null = null;
	let experts: Expert[] = [];
	let invitations: PanelInvitation[] = [];
	let loading = true;
	let showInviteDialog = false;
	let inviteEmails = '';
	let inviting = false;

	$: panelId = $page.params.id;
	$: isAdmin = panel && authStore.user ? panel.adminIds.includes(authStore.user.uid) : false;

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

			[experts, invitations] = await Promise.all([
				getExpertsByPanel(panelId),
				getInvitationsByPanel(panelId)
			]);
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
				alert('Please enter valid email addresses');
				return;
			}

			const result = await sendBulkInvitations(
				emails,
				panelId,
				panel.name,
				authStore.user.uid
			);

			alert(`Sent ${result.sent} invitation(s). ${result.failed.length > 0 ? `Failed: ${result.failed.join(', ')}` : ''}`);
			
			inviteEmails = '';
			showInviteDialog = false;
			await loadPanelData();
		} catch (error) {
			console.error('Error sending invitations:', error);
			alert('Failed to send invitations. Please try again.');
		} finally {
			inviting = false;
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
				return 'destructive';
			default:
				return 'secondary';
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
						<h1 class="text-3xl font-bold text-gray-900">
							{panel?.name || 'Loading...'}
						</h1>
						{#if panel}
							<p class="mt-1 text-sm text-gray-600">{panel.description}</p>
						{/if}
					</div>
				</div>
				{#if isAdmin}
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							on:click={() => showInviteDialog = true}
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
										<TableCell class="font-medium">{expert.displayName}</TableCell>
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
				rows={5}
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
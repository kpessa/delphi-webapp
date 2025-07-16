<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { authStore } from '$lib/stores/auth.svelte';
	import { getPanel, updatePanel, removeExpertFromPanel, type Panel } from '$lib/firebase/panels';
	import { getExpertsByPanel, deleteExpert, type Expert } from '$lib/firebase/experts';
	import { ArrowLeft, Save, Trash2 } from 'lucide-svelte';

	let panel: Panel | null = null;
	let experts: Expert[] = [];
	let name = '';
	let description = '';
	let saving = false;
	let loading = true;
	let error = '';

	$: panelId = $page.params.id;
	$: isAdmin = panel && authStore.user ? 
		(panel.adminIds?.includes(authStore.user.uid) || panel.creatorId === authStore.user.uid) : 
		false;

	onMount(() => {
		if (!authStore.isAuthenticated) {
			goto('/auth/login');
		} else {
			loadPanel();
		}
	});

	async function loadPanel() {
		try {
			loading = true;
			panel = await getPanel(panelId);
			
			if (!panel) {
				goto('/panels');
				return;
			}

			if (!isAdmin && authStore.user && !panel.adminIds.includes(authStore.user.uid)) {
				goto(`/panels/${panelId}`);
				return;
			}

			name = panel.name;
			description = panel.description;
			experts = await getExpertsByPanel(panelId);
		} catch (error) {
			console.error('Error loading panel:', error);
			goto('/panels');
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!panel || !name.trim()) {
			error = 'Panel name is required';
			return;
		}

		try {
			saving = true;
			error = '';

			await updatePanel(panelId, {
				name: name.trim(),
				description: description.trim()
			});

			goto(`/panels/${panelId}`);
		} catch (err) {
			console.error('Error updating panel:', err);
			error = 'Failed to update panel. Please try again.';
		} finally {
			saving = false;
		}
	}

	async function removeExpert(expertId: string) {
		if (!panel || !confirm('Are you sure you want to remove this expert from the panel?')) {
			return;
		}

		try {
			// Remove expert from panel's expertIds array
			await removeExpertFromPanel(panelId, expertId);
			// Delete the expert record (since experts are panel-specific)
			await deleteExpert(expertId);
			
			panel.expertIds = panel.expertIds.filter(id => id !== expertId);
			experts = experts.filter(e => e.id !== expertId);
		} catch (error) {
			console.error('Error removing expert:', error);
			alert('Failed to remove expert. Please try again.');
		}
	}
</script>

<svelte:head>
	<title>Edit {panel?.name || 'Panel'} - Delphi Healthcare Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center gap-4">
				<Button href="/panels/{panelId}" variant="ghost" size="sm">
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Edit Panel</h1>
					<p class="mt-1 text-sm text-gray-600">
						Update panel information and manage members
					</p>
				</div>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<p class="text-gray-500">Loading panel...</p>
			</div>
		{:else if panel && isAdmin}
			<form on:submit={handleSubmit} class="space-y-6 rounded-lg bg-white p-6 shadow">
				{#if error}
					<div class="rounded-md bg-red-50 p-4">
						<p class="text-sm text-red-800">{error}</p>
					</div>
				{/if}

				<div class="space-y-2">
					<Label for="name">Panel Name*</Label>
					<Input
						id="name"
						type="text"
						bind:value={name}
						required
						disabled={saving}
					/>
				</div>

				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						bind:value={description}
						rows={4}
						disabled={saving}
					/>
				</div>

				<div class="flex items-center justify-between border-t pt-4">
					<Button href="/panels/{panelId}" variant="outline" disabled={saving}>
						Cancel
					</Button>
					<Button type="submit" disabled={saving} class="flex items-center gap-2">
						<Save class="h-4 w-4" />
						{saving ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</form>

			<div class="mt-6 rounded-lg bg-white p-6 shadow">
				<h2 class="mb-4 text-lg font-semibold text-gray-900">
					Panel Members ({experts.length})
				</h2>
				{#if experts.length === 0}
					<p class="text-sm text-gray-500">No experts in this panel yet.</p>
				{:else}
					<div class="space-y-2">
						{#each experts as expert}
							<div class="flex items-center justify-between rounded-lg border p-3">
								<div>
									<p class="font-medium">{expert.displayName}</p>
									<p class="text-sm text-gray-500">{expert.email}</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									on:click={() => removeExpert(expert.id!)}
									class="text-destructive"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>
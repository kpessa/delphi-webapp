<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { authStore } from '$lib/stores/auth.svelte';
	import { createPanel } from '$lib/firebase/panels';
	import { ArrowLeft } from 'lucide-svelte';

	let name = '';
	let description = '';
	let creating = false;
	let error = '';

	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		if (!authStore.user) {
			error = 'You must be logged in to create a panel';
			return;
		}

		if (!name.trim()) {
			error = 'Panel name is required';
			return;
		}

		try {
			creating = true;
			error = '';
			
			const panelId = await createPanel({
				name: name.trim(),
				description: description.trim(),
				adminIds: [authStore.user.uid],
				expertIds: []
			});

			goto(`/panels/${panelId}`);
		} catch (err) {
			console.error('Error creating panel:', err);
			error = 'Failed to create panel. Please try again.';
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
	<title>Create Panel - Delphi Healthcare Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center gap-4">
				<Button href="/panels" variant="ghost" size="sm">
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Create Expert Panel</h1>
					<p class="mt-1 text-sm text-gray-600">
						Set up a new panel to gather expert feedback
					</p>
				</div>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
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
					placeholder="e.g., Clinical Excellence Committee"
					required
					disabled={creating}
				/>
				<p class="text-sm text-gray-500">
					Choose a clear, descriptive name for your expert panel
				</p>
			</div>

			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={description}
					placeholder="Describe the purpose and scope of this expert panel..."
					rows={4}
					disabled={creating}
				/>
				<p class="text-sm text-gray-500">
					Help experts understand the panel's focus and objectives
				</p>
			</div>

			<div class="flex items-center justify-between pt-4">
				<Button href="/panels" variant="outline" disabled={creating}>
					Cancel
				</Button>
				<Button type="submit" disabled={creating}>
					{creating ? 'Creating...' : 'Create Panel'}
				</Button>
			</div>
		</form>

		<div class="mt-6 rounded-lg bg-blue-50 p-6">
			<h3 class="text-sm font-medium text-blue-800">Next Steps</h3>
			<ul class="mt-2 space-y-1 text-sm text-blue-700">
				<li>• After creating the panel, you'll be able to invite experts</li>
				<li>• Experts will receive email invitations to join</li>
				<li>• You can assign topics to the panel for feedback</li>
				<li>• Panel members provide anonymous responses</li>
			</ul>
		</div>
	</main>
</div>
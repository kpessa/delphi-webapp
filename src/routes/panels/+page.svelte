<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
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
	import { getPanels, type Panel } from '$lib/firebase/panels';
	import { Plus, Edit, Users, Eye } from 'lucide-svelte';

	let panels: Panel[] = [];
	let loading = true;

	onMount(() => {
		if (!authStore.isAuthenticated) {
			goto('/auth/login');
		} else {
			loadPanels();
		}
	});

	async function loadPanels() {
		try {
			loading = true;
			panels = await getPanels();
		} catch (error) {
			console.error('Error loading panels:', error);
		} finally {
			loading = false;
		}
	}

	function isAdmin(panel: Panel): boolean {
		// Check both adminIds and creatorId for backward compatibility
		return authStore.user ? 
			(panel.adminIds?.includes(authStore.user.uid) || panel.creatorId === authStore.user.uid) : 
			false;
	}
</script>

<svelte:head>
	<title>Panels - Delphi Healthcare Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Expert Panels</h1>
					<p class="mt-1 text-sm text-gray-600">
						Manage groups of experts for anonymous feedback collection
					</p>
				</div>
				<Button href="/panels/create" class="flex items-center gap-2">
					<Plus class="h-4 w-4" />
					Create Panel
				</Button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<p class="text-gray-500">Loading panels...</p>
			</div>
		{:else if panels.length === 0}
			<div class="rounded-lg bg-white p-8 text-center shadow">
				<h3 class="text-lg font-medium text-gray-900">No panels yet</h3>
				<p class="mt-2 text-sm text-gray-500">
					Get started by creating your first expert panel.
				</p>
				<Button href="/panels/create" class="mt-4">
					Create Your First Panel
				</Button>
			</div>
		{:else}
			<div class="rounded-lg bg-white shadow">
				<Table>
					<TableCaption>Expert panels for Delphi technique feedback</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Description</TableHead>
							<TableHead>Experts</TableHead>
							<TableHead>Your Role</TableHead>
							<TableHead>Created</TableHead>
							<TableHead class="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each panels as panel}
							<TableRow>
								<TableCell class="font-medium">{panel.name}</TableCell>
								<TableCell class="max-w-xs truncate">{panel.description}</TableCell>
								<TableCell>
									<div class="flex items-center gap-1">
										<Users class="h-4 w-4 text-gray-500" />
										<span>{panel.expertIds.length}</span>
									</div>
								</TableCell>
								<TableCell>
									<div class="flex items-center gap-1">
										{#if isAdmin(panel)}
											<Badge variant="default">Admin</Badge>
										{/if}
										{#if authStore.user && panel.expertIds.includes(authStore.user.uid)}
											<Badge variant="secondary">Expert</Badge>
										{/if}
										{#if !isAdmin(panel) && (!authStore.user || !panel.expertIds.includes(authStore.user.uid))}
											<Badge variant="outline">None</Badge>
										{/if}
									</div>
								</TableCell>
								<TableCell>
									{new Date(panel.createdAt).toLocaleDateString()}
								</TableCell>
								<TableCell class="text-right">
									<div class="flex items-center justify-end gap-2">
										<Button
											href="/panels/{panel.id}"
											variant="ghost"
											size="sm"
											title="View panel"
										>
											<Eye class="h-4 w-4" />
										</Button>
										{#if isAdmin(panel)}
											<Button
												href="/panels/{panel.id}/edit"
												variant="ghost"
												size="sm"
												title="Edit panel"
											>
												<Edit class="h-4 w-4" />
											</Button>
										{/if}
									</div>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</div>
		{/if}
	</main>
</div>
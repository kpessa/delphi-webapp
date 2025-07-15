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
	import { subscribeToAuthState, type AuthUser } from '$lib/firebase/auth';
	import { getItemsByAdmin, type Item } from '$lib/firebase/items';
	import { Plus, Edit, Trash2 } from 'lucide-svelte';

	let user: AuthUser | null = null;
	let items: Item[] = [];
	let loading = true;

	onMount(() => {
		const unsubscribe = subscribeToAuthState(async (authUser) => {
			if (!authUser) {
				goto('/auth/login');
			} else {
				user = authUser;
				await loadItems();
			}
		});

		return unsubscribe;
	});

	async function loadItems() {
		if (!user) return;
		
		try {
			loading = true;
			items = await getItemsByAdmin(user.uid);
		} catch (error) {
			console.error('Error loading items:', error);
		} finally {
			loading = false;
		}
	}

	function getTypeBadgeVariant(type: string) {
		const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
			initiative: 'default',
			assessment: 'secondary',
			consultation: 'outline',
			evaluation: 'destructive',
			survey: 'secondary',
			custom: 'outline'
		};
		return variants[type] || 'default';
	}

	function getStatusBadgeVariant(status: string) {
		const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
			draft: 'secondary',
			active: 'default',
			completed: 'outline'
		};
		return variants[status] || 'secondary';
	}
</script>

<svelte:head>
	<title>Items - Delphi Healthcare Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Items</h1>
					<p class="mt-1 text-sm text-gray-600">
						Manage your Delphi technique items across your healthcare system
					</p>
				</div>
				<Button href="/items/new" class="flex items-center gap-2">
					<Plus class="h-4 w-4" />
					Create Item
				</Button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<p class="text-gray-500">Loading items...</p>
			</div>
		{:else if items.length === 0}
			<div class="rounded-lg bg-white p-8 text-center shadow">
				<h3 class="text-lg font-medium text-gray-900">No items yet</h3>
				<p class="mt-2 text-sm text-gray-500">
					Get started by creating your first Delphi technique item.
				</p>
				<Button href="/items/new" class="mt-4">
					Create Your First Item
				</Button>
			</div>
		{:else}
			<div class="rounded-lg bg-white shadow">
				<Table>
					<TableCaption>A list of your Delphi technique items</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Category</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Round</TableHead>
							<TableHead>Experts</TableHead>
							<TableHead class="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each items as item}
							<TableRow>
								<TableCell class="font-medium">{item.title}</TableCell>
								<TableCell>
									<Badge variant={getTypeBadgeVariant(item.type)}>
										{item.type}
									</Badge>
								</TableCell>
								<TableCell>{item.category || 'N/A'}</TableCell>
								<TableCell>
									<Badge variant={getStatusBadgeVariant(item.status)}>
										{item.status}
									</Badge>
								</TableCell>
								<TableCell>{item.currentRound}/{item.maxRounds}</TableCell>
								<TableCell>{item.expertIds.length}</TableCell>
								<TableCell class="text-right">
									<div class="flex items-center justify-end gap-2">
										<Button
											href="/items/{item.id}/edit"
											variant="ghost"
											size="sm"
										>
											<Edit class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											class="text-destructive"
										>
											<Trash2 class="h-4 w-4" />
										</Button>
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